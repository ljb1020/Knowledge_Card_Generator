import type Database from 'better-sqlite3';
import type { CardDocument, Job } from 'shared';

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBulletList(value: unknown, fallback: string, max: number): string[] {
  const bullets = Array.isArray(value) ? value.map(normalizeText).filter(Boolean).slice(0, max) : [];
  while (bullets.length < 3) {
    bullets.push(fallback);
  }
  return bullets;
}

function normalizeBulletTitleByIndex(index: number): string {
  if (index === 0) return '完整面试回答';
  if (index === 1) return '高频追问';
  if (index === 2) return '易错点';
  return '卡片';
}

function normalizeLegacyDocument(topic: string, rawValue: unknown): CardDocument | null {
  if (!rawValue || typeof rawValue !== 'object') {
    return null;
  }

  const source = rawValue as { cards?: unknown[] };
  const rawCards = Array.isArray(source.cards) ? source.cards : [];
  if (rawCards.length === 0) {
    return null;
  }

  const hasLegacySummary = rawCards.some(
    (card) => card && typeof card === 'object' && (card as { type?: unknown }).type === 'summary'
  );
  const isAlreadyNewShape =
    rawCards.length === 4 &&
    rawCards[0] &&
    typeof rawCards[0] === 'object' &&
    (rawCards[0] as { type?: unknown }).type === 'cover' &&
    rawCards.slice(1).every(
      (card) => card && typeof card === 'object' && (card as { type?: unknown }).type === 'bullet'
    );

  if (isAlreadyNewShape && !hasLegacySummary) {
    return {
      topic,
      styleVersion: 'frontend-card-v1',
      cards: rawCards.map((card, index) => {
        if (!card || typeof card !== 'object') {
          return card;
        }

        const normalized = card as Record<string, unknown>;
        if (normalized.type !== 'bullet') {
          return normalized;
        }

        return {
          ...normalized,
          title: normalizeBulletTitleByIndex(index - 1),
        };
      }) as CardDocument['cards'],
    };
  }

  const cover = rawCards.find(
    (card) => card && typeof card === 'object' && (card as { type?: unknown }).type === 'cover'
  ) as
    | {
        id?: unknown;
        title?: unknown;
        subtitle?: unknown;
      }
    | undefined;

  const bulletCards = rawCards.filter(
    (card) => card && typeof card === 'object' && (card as { type?: unknown }).type === 'bullet'
  ) as Array<{ id?: unknown; title?: unknown; bullets?: unknown }>;

  const findBullet = (patterns: RegExp[], fallbackIndex: number) =>
    bulletCards.find((card) => patterns.some((pattern) => pattern.test(normalizeText(card.title)))) ??
    bulletCards[fallbackIndex];

  const answerCard = findBullet([/回答|答题|高分/], Math.max(bulletCards.length - 1, 0));
  const followUpCard = findBullet([/追问|考点|面试/], Math.min(1, bulletCards.length - 1));
  const pitfallCard = findBullet([/误区|易混|坑/], Math.min(2, bulletCards.length - 1));

  return {
    topic,
    styleVersion: 'frontend-card-v1',
    cards: [
      {
        id: normalizeText(cover?.id) || 'cover-1',
        type: 'cover',
        title: normalizeText(cover?.title) || topic,
        subtitle: normalizeText(cover?.subtitle) || `${topic} 的定义、价值和常见面试问法概览`,
        tag: '前端面试卡',
      },
      {
        id: normalizeText(answerCard?.id) || 'bullet-1',
        type: 'bullet',
        title: '完整面试回答',
        bullets: normalizeBulletList(answerCard?.bullets, '请重新生成当前知识点，以得到新的完整面试回答。', 6),
      },
      {
        id: normalizeText(followUpCard?.id) || 'bullet-2',
        type: 'bullet',
        title: '高频追问',
        bullets: normalizeBulletList(followUpCard?.bullets, '请重新生成当前知识点，以得到新的高频追问。', 5),
      },
      {
        id: normalizeText(pitfallCard?.id) || 'bullet-3',
        type: 'bullet',
        title: '易错点',
        bullets: normalizeBulletList(pitfallCard?.bullets, '请重新生成当前知识点，以得到新的易错点。', 5),
      },
    ],
  };
}

function rowToJob(row: Record<string, unknown>): Job {
  const parsedDocument = row.document_json
    ? normalizeLegacyDocument(row.topic as string, JSON.parse(row.document_json as string))
    : null;

  return {
    id: row.id as string,
    topic: row.topic as string,
    status: row.status as Job['status'],
    progressMessage: row.progress_message as string | null,
    stage1Draft: row.stage1_draft as string | null,
    stage2Raw: row.stage2_raw as string | null,
    documentJson: parsedDocument,
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
  progressMessage?: string | null;
  stage1Draft?: string | null;
  stage2Raw?: string | null;
  documentJson?: CardDocument | null;
  imagePaths?: string[];
  errorMessage?: string | null;
}

export function createJob(db: Database.Database, params: CreateJobParams): Job {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO jobs (
      id,
      topic,
      status,
      progress_message,
      stage1_draft,
      stage2_raw,
      document_json,
      image_paths_json,
      error_message,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    params.id,
    params.topic,
    params.status,
    params.progressMessage ?? null,
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

export function updateJobDocument(db: Database.Database, id: string, document: CardDocument): Job | null {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE jobs
    SET document_json = ?, status = 'ready', progress_message = NULL, error_message = NULL, updated_at = ?
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
  errorMessage?: string | null,
  progressMessage?: string | null
): Job | null {
  const now = new Date().toISOString();
  const pathsJson = imagePaths !== undefined ? JSON.stringify(imagePaths) : undefined;
  const stmt = db.prepare(`
    UPDATE jobs
    SET
      status = ?,
      image_paths_json = COALESCE(?, image_paths_json),
      error_message = ?,
      progress_message = ?,
      updated_at = ?
    WHERE id = ?
  `);
  const result = stmt.run(status, pathsJson ?? null, errorMessage ?? null, progressMessage ?? null, now, id);
  if (result.changes === 0) return null;
  return getJobById(db, id);
}

export interface UpdateJobGenerationParams {
  status: Job['status'];
  progressMessage?: string | null;
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
      progress_message = ?,
      stage1_draft = COALESCE(?, stage1_draft),
      stage2_raw = COALESCE(?, stage2_raw),
      document_json = COALESCE(?, document_json),
      error_message = ?,
      updated_at = ?
    WHERE id = ?
  `);

  const result = stmt.run(
    params.status,
    params.progressMessage ?? null,
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
  if (existing.length > 0) return;

  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO jobs (
      id,
      topic,
      status,
      progress_message,
      stage1_draft,
      stage2_raw,
      document_json,
      image_paths_json,
      error_message,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedDocument: CardDocument = {
    topic: '闭包',
    styleVersion: 'frontend-card-v1',
    cards: [
      {
        id: 'card-1',
        type: 'cover',
        title: '闭包',
        subtitle: '函数能在外层执行结束后继续访问其词法作用域中的变量，解决状态保留和延迟访问问题。',
        tag: '前端面试卡',
      },
      {
        id: 'card-2',
        type: 'bullet',
        title: '完整面试回答',
        bullets: [
          '闭包本质上是函数和它创建时所在词法作用域的组合，不是某个单独的语法糖。',
          '它的价值在于让函数执行结束后，内部逻辑还能继续访问之前定义的外部变量。',
          '前端里常见在事件回调、函数工厂、缓存封装和 React Hooks 等场景，用来保存状态或隔离数据。',
          '面试时最好再补一句边界：闭包不是坏事，但不必要的长生命周期引用会带来额外内存成本。',
        ],
      },
      {
        id: 'card-3',
        type: 'bullet',
        title: '高频追问',
        bullets: [
          '为什么外层函数执行结束后变量还不会消失？答题方向：说明词法环境仍然被内部函数引用。',
          '闭包和作用域链是什么关系？答题方向：闭包依赖词法作用域，但不等于作用域链本身。',
          'React 里哪些问题和闭包有关？答题方向：从事件回调、useEffect 和旧状态捕获切入。',
        ],
      },
      {
        id: 'card-4',
        type: 'bullet',
        title: '易错点',
        bullets: [
          '误区一：只要有内层函数就等于闭包，关键要看它是否真的引用并保留了外层变量。',
          '误区二：闭包一定导致内存泄漏，真实问题是无用引用没有及时释放。',
          '误区三：把闭包和 this 绑定混为一谈，它们解决的问题完全不同。',
        ],
      },
    ],
  };

  stmt.run('job_mock_001', '闭包', 'ready', null, null, null, JSON.stringify(seedDocument), '[]', null, now, now);
}
