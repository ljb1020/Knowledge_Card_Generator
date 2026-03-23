import type { Job, CardDocument } from 'shared';
import type Database from 'better-sqlite3';

function rowToJob(row: Record<string, unknown>): Job {
  return {
    id: row.id as string,
    topic: row.topic as string,
    status: row.status as Job['status'],
    stage1Draft: row.stage1_draft as string | null,
    stage2Raw: row.stage2_raw as string | null,
    documentJson: row.document_json ? (JSON.parse(row.document_json as string) as CardDocument) : null,
    imagePaths: JSON.parse(row.image_paths_json as string) as string[],
    errorMessage: row.error_message as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function getJobs(db: Database.Database, limit = 20): Job[] {
  const stmt = db.prepare('SELECT * FROM jobs ORDER BY updated_at DESC LIMIT ?');
  const rows = stmt.all(limit) as Record<string, unknown>[];
  return rows.map(rowToJob);
}

export function getJobById(db: Database.Database, id: string): Job | null {
  const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToJob(row);
}

export function deleteJob(db: Database.Database, id: string): boolean {
  const stmt = db.prepare('DELETE FROM jobs WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export interface CreateJobParams {
  id: string;
  topic: string;
  status: Job['status'];
  stage1Draft?: string | null;
  stage2Raw?: string | null;
  documentJson?: CardDocument | null;
  imagePaths?: string[];
  errorMessage?: string | null;
}

export function createJob(db: Database.Database, params: CreateJobParams): Job {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO jobs (id, topic, status, stage1_draft, stage2_raw, document_json, image_paths_json, error_message, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    params.id,
    params.topic,
    params.status,
    params.stage1Draft ?? null,
    params.stage2Raw ?? null,
    params.documentJson ? JSON.stringify(params.documentJson) : null,
    JSON.stringify(params.imagePaths ?? []),
    params.errorMessage ?? null,
    now,
    now
  );
  return getJobById(db, params.id)!;
}

export function updateJobDocument(
  db: Database.Database,
  id: string,
  document: CardDocument
): Job | null {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE jobs SET document_json = ?, status = 'ready', error_message = NULL, updated_at = ?
    WHERE id = ?
  `);
  const result = stmt.run(JSON.stringify(document), now, id);
  if (result.changes === 0) return null;
  return getJobById(db, id);
}

export function updateJobStatus(
  db: Database.Database,
  id: string,
  status: Job['status'],
  imagePaths?: string[],
  errorMessage?: string | null
): Job | null {
  const now = new Date().toISOString();
  const pathsJson = imagePaths !== undefined ? JSON.stringify(imagePaths) : undefined;
  const stmt = db.prepare(`
    UPDATE jobs
    SET status = ?, image_paths_json = COALESCE(?, image_paths_json), error_message = ?, updated_at = ?
    WHERE id = ?
  `);
  const result = stmt.run(status, pathsJson ?? null, errorMessage ?? null, now, id);
  if (result.changes === 0) return null;
  return getJobById(db, id);
}

export interface UpdateJobGenerationParams {
  status: Job['status'];
  stage1Draft?: string | null;
  stage2Raw?: string | null;
  documentJson?: CardDocument | null;
  errorMessage?: string | null;
}

export function updateJobGeneration(
  db: Database.Database,
  id: string,
  params: UpdateJobGenerationParams
): Job | null {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE jobs
    SET
      status = ?,
      stage1_draft = COALESCE(?, stage1_draft),
      stage2_raw = COALESCE(?, stage2_raw),
      document_json = COALESCE(?, document_json),
      error_message = ?,
      updated_at = ?
    WHERE id = ?
  `);
  const result = stmt.run(
    params.status,
    params.stage1Draft ?? null,
    params.stage2Raw ?? null,
    params.documentJson ? JSON.stringify(params.documentJson) : null,
    params.errorMessage ?? null,
    now,
    id
  );
  if (result.changes === 0) return null;
  return getJobById(db, id);
}

export function initSeedData(db: Database.Database): void {
  const existing = getJobs(db, 1);
  if (existing.length > 0) return; // Already has data

  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO jobs (id, topic, status, stage1_draft, stage2_raw, document_json, image_paths_json, error_message, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Seed demo job (job_mock_001)
  const seedDocument: CardDocument = {
    topic: '闭包',
    styleVersion: 'frontend-card-v1',
    cards: [
      {
        id: 'card-1',
        type: 'cover',
        title: '深入理解闭包',
        subtitle: 'JavaScript 中最强大又最容易被误解的概念',
        tag: '前端知识点',
      },
      {
        id: 'card-2',
        type: 'bullet',
        title: '什么是闭包',
        bullets: [
          '闭包是指函数能够访问其词法作用域外部的变量',
          '当内部函数引用了外部函数的变量，就形成了闭包',
          '即使外部函数已经执行完毕，这些变量依然被保留',
        ],
      },
      {
        id: 'card-3',
        type: 'bullet',
        title: '闭包的典型应用',
        bullets: [
          '数据私有化：利用闭包创建私有变量',
          '函数工厂：返回携带不同参数的函数',
          '事件处理：在循环中正确绑定索引值',
        ],
      },
      {
        id: 'card-4',
        type: 'bullet',
        title: '常见误区',
        bullets: [
          '在循环中创建闭包导致变量共享问题',
          '过度使用闭包造成内存泄漏',
          '混淆作用域链与闭包的概念',
        ],
      },
      {
        id: 'card-5',
        type: 'summary',
        title: '总结',
        summary: '闭包是 JavaScript 的核心概念，理解它的工作原理对于编写高质量代码至关重要。掌握闭包，让你的代码更加优雅和强大。',
        cta: '持续学习，共同进步',
      },
    ],
  };

  stmt.run(
    'job_mock_001',
    '闭包',
    'ready',
    null,
    null,
    JSON.stringify(seedDocument),
    '[]',
    null,
    now,
    now
  );
}
