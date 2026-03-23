export type CardType = 'cover' | 'bullet' | 'summary';

export interface CoverCard {
  id: string;
  type: 'cover';
  title: string;
  subtitle: string;
  tag: string;
}

export interface BulletCard {
  id: string;
  type: 'bullet';
  title: string;
  bullets: string[];
}

export interface SummaryCard {
  id: string;
  type: 'summary';
  title: string;
  summary: string;
  cta: string;
}

export type Card = CoverCard | BulletCard | SummaryCard;

export interface CardDocument {
  topic: string;
  styleVersion: 'frontend-card-v1';
  cards: Card[];
}

export type JobStatus =
  | 'generating'
  | 'validating'
  | 'ready'
  | 'exporting'
  | 'done'
  | 'failed';

export interface Job {
  id: string;
  topic: string;
  status: JobStatus;
  stage1Draft: string | null;
  stage2Raw: string | null;
  documentJson: CardDocument | null;
  imagePaths: string[];
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateRequest {
  topic: string;
}

export interface GenerateResponse {
  job: Job;
}

export interface UpdateDocumentRequest {
  document: CardDocument;
}

export interface ExportResponse {
  jobId: string;
  status: 'exporting';
}
