import fs from 'fs';
import path from 'path';
import type Database from 'better-sqlite3';
import { Router } from 'express';
import { z } from 'zod';
import { CardDocumentSchema, GenerateRequestSchema, generateJobId, type Job, type JobStatus } from 'shared';
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
import { generateDocumentForTopicWithOptions } from '../services/generateDocument.js';
import { ensureXhsAuth } from '../publish/xhsAuth.js';
import { publishDraft } from '../publish/xhsPublisher.js';
import { formatXhsTitle, formatXhsContent } from '../publish/contentFormatter.js';
import { resolveProjectPath } from '../utils/loadEnv.js';
import {
  extractArtifactsDirFromImagePath,
  getJobArtifactsDir,
  getLegacyJobArtifactsDir,
  getLegacyTimestampImagesDir,
  getLegacyTimestampJobArtifactsDir,
} from '../utils/jobArtifacts.js';

const router = Router();

async function runGenerationJob(db: Database.Database, jobId: string, topic: string): Promise<void> {
  try {
    const generationResult = await generateDocumentForTopicWithOptions(topic, {
      onProgress: async ({ status, message }) => {
        updateJobGeneration(db, jobId, {
          status,
          progressMessage: message,
          errorMessage: null,
        });
      },
    });

    if (!generationResult.success) {
      updateJobGeneration(db, jobId, {
        status: 'failed',
        progressMessage: null,
        stage1Draft: generationResult.stage1Draft,
        stage2Raw: generationResult.stage2Raw,
        documentJson: null,
        errorMessage: generationResult.errorMessage,
      });
      return;
    }

    const finalStatus = generationResult.finalStatus as JobStatus;
    updateJobGeneration(db, jobId, {
      status: finalStatus,
      progressMessage: null,
      stage1Draft: generationResult.stage1Draft,
      stage2Raw: generationResult.stage2Raw,
      documentJson: generationResult.documentJson,
      errorMessage: generationResult.warningMessage,
    });
  } catch (err) {
    updateJobGeneration(db, jobId, {
      status: 'failed',
      progressMessage: null,
      errorMessage: err instanceof Error ? err.message : 'Failed to generate job',
    });
  }
}

function deleteJobArtifacts(job: Pick<Job, 'id' | 'topic' | 'createdAt' | 'imagePaths'>): void {
  const artifactDirs = new Set<string>([
    getLegacyJobArtifactsDir(job.id),
    getJobArtifactsDir(job.createdAt, job.topic),
    getLegacyTimestampJobArtifactsDir(job.createdAt),
    getLegacyTimestampImagesDir(job.createdAt),
  ]);

  for (const imagePath of job.imagePaths) {
    const imageDir = extractArtifactsDirFromImagePath(imagePath);
    if (imageDir) {
      artifactDirs.add(imageDir);
    }
  }

  for (const artifactDir of artifactDirs) {
    fs.rmSync(artifactDir, { recursive: true, force: true });
  }
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

    deleteJobArtifacts(existing);

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

    const job = createJob(res.locals.db, {
      id: jobId,
      topic,
      status: 'generating',
      progressMessage: '任务已创建，等待进入 Stage 1',
      imagePaths: [],
    });

    setTimeout(() => {
      runGenerationJob(res.locals.db, jobId, topic).catch((err) => {
        console.error(`Background generation failed for ${jobId}:`, err);
      });
    }, 0);

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

    const exportableStatuses = new Set<JobStatus>(['ready', 'ready_with_warnings', 'done']);
    if (!exportableStatuses.has(job.status as JobStatus)) {
      res.status(400).json({ error: 'Job is not in a exportable state' });
      return;
    }

    const updated = updateJobStatus(res.locals.db, id, 'exporting', undefined, null, '导出阶段 / 正在生成 PNG 图片');
    if (!updated) {
      res.status(500).json({ error: 'Failed to start export' });
      return;
    }

    const jobId = id;
    setTimeout(async () => {
      const result = await exportJob(jobId, job.createdAt, job.topic);
      if (result.success && result.imagePaths.length > 0) {
        updateJobStatus(res.locals.db, jobId, 'done', result.imagePaths, null, null);
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

router.post('/:id/publish-draft', async (req, res) => {
  try {
    const { id } = req.params;
    const job = getJobById(res.locals.db, id);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    if (job.status !== 'done') {
      res.status(400).json({ error: '请先导出 PNG 后再发布到小红书' });
      return;
    }

    if (!job.imagePaths || job.imagePaths.length === 0) {
      res.status(400).json({ error: '没有可用的导出图片' });
      return;
    }

    if (!job.documentJson) {
      res.status(400).json({ error: '没有可用的文档数据' });
      return;
    }

    // 解析 imagePaths 为本地绝对路径
    const storageDir = resolveProjectPath(process.env.APP_STORAGE_DIR ?? './storage');
    const localPaths = job.imagePaths.map((p) => {
      // imagePaths 格式: "storage/jobs/<folder>/<file>.png"
      const relative = p.replace(/^storage\//, '');
      return path.join(storageDir, relative);
    });

    // 格式化标题和正文
    const title = formatXhsTitle(job.topic);
    const content = formatXhsContent(job.documentJson);

    // 执行发布（登录检查也在 publishDraft 内部处理）
    const result = await publishDraft(localPaths, title, content);

    if (result.success) {
      updateJobStatus(res.locals.db, id, 'published');
      res.json({ success: true, message: result.message });
    } else {
      res.status(500).json({ error: result.message });
    }
  } catch (err) {
    console.error('POST /api/jobs/:id/publish-draft error:', err);
    res.status(500).json({ error: '发布到小红书失败' });
  }
});

export default router;
