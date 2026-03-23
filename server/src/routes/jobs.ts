import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import { z } from 'zod';
import { CardDocumentSchema, GenerateRequestSchema, generateJobId } from 'shared';
import {
  createJob,
  deleteJob,
  getJobById,
  getJobs,
  updateJobDocument,
  updateJobGeneration,
  updateJobStatus,
} from '../db/jobs.js';
import { exportJob } from '../export/index.js';
import { generateDocumentForTopic } from '../services/generateDocument.js';
import { resolveProjectPath } from '../utils/loadEnv.js';

const router = Router();
const STORAGE_DIR = resolveProjectPath(process.env.APP_STORAGE_DIR ?? './storage');

function deleteJobArtifacts(jobId: string): void {
  const jobDir = path.join(STORAGE_DIR, 'jobs', jobId);
  fs.rmSync(jobDir, { recursive: true, force: true });
}

router.get('/', (_req, res) => {
  try {
    const jobs = getJobs(res.locals.db);
    res.json({ jobs });
  } catch (err) {
    console.error('GET /api/jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const job = getJobById(res.locals.db, id);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.json({ job });
  } catch (err) {
    console.error('GET /api/jobs/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = getJobById(res.locals.db, id);
    if (!existing) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    deleteJobArtifacts(id);

    const deleted = deleteJob(res.locals.db, id);
    if (!deleted) {
      res.status(500).json({ error: 'Failed to delete job' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/jobs/:id error:', err);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

const UpdateDocumentSchema = z.object({
  document: CardDocumentSchema,
});

router.put('/:id/document', (req, res) => {
  try {
    const { id } = req.params;
    const existing = getJobById(res.locals.db, id);
    if (!existing) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const parsed = UpdateDocumentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid document', details: parsed.error.errors });
      return;
    }

    const updated = updateJobDocument(res.locals.db, id, parsed.data.document);
    if (!updated) {
      res.status(500).json({ error: 'Failed to update document' });
      return;
    }

    res.json({ job: updated });
  } catch (err) {
    console.error('PUT /api/jobs/:id/document error:', err);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const parsed = GenerateRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
      return;
    }

    const topic = parsed.data.topic.trim();
    const jobId = generateJobId();

    createJob(res.locals.db, {
      id: jobId,
      topic,
      status: 'generating',
      imagePaths: [],
    });

    const generationResult = await generateDocumentForTopic(topic);

    updateJobGeneration(res.locals.db, jobId, {
      status: generationResult.success ? 'validating' : 'failed',
      stage1Draft: generationResult.stage1Draft,
      stage2Raw: generationResult.stage2Raw,
      documentJson: null,
      errorMessage: generationResult.success ? null : generationResult.errorMessage,
    });

    if (!generationResult.success) {
      res.status(500).json({ error: generationResult.errorMessage });
      return;
    }

    const job = updateJobGeneration(res.locals.db, jobId, {
      status: 'ready',
      stage1Draft: generationResult.stage1Draft,
      stage2Raw: generationResult.stage2Raw,
      documentJson: generationResult.documentJson,
      errorMessage: null,
    });

    if (!job) {
      res.status(500).json({ error: 'Failed to persist generated job' });
      return;
    }

    res.json({ job });
  } catch (err) {
    console.error('POST /api/jobs/generate error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to generate job' });
  }
});

router.post('/:id/export', (req, res) => {
  try {
    const { id } = req.params;
    const job = getJobById(res.locals.db, id);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    if (job.status !== 'ready' && job.status !== 'done') {
      res.status(400).json({ error: 'Job is not in a exportable state' });
      return;
    }

    const updated = updateJobStatus(res.locals.db, id, 'exporting');
    if (!updated) {
      res.status(500).json({ error: 'Failed to start export' });
      return;
    }

    const jobId = id;
    setTimeout(async () => {
      const result = await exportJob(jobId);
      if (result.success && result.imagePaths.length > 0) {
        updateJobStatus(res.locals.db, jobId, 'done', result.imagePaths);
        return;
      }

      updateJobStatus(
        res.locals.db,
        jobId,
        'failed',
        undefined,
        result.errorMessage ?? 'Export completed without writing any images'
      );
    }, 100);

    res.json({ jobId: id, status: 'exporting' });
  } catch (err) {
    console.error('POST /api/jobs/:id/export error:', err);
    res.status(500).json({ error: 'Failed to start export' });
  }
});

export default router;
