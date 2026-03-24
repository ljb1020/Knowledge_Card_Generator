export type CardType = 'cover' | 'bullet';

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

export type Card = CoverCard | BulletCard;

export interface CardDocument {
  topic: string;
  styleVersion: 'frontend-card-v1';
  cards: Card[];
}

export type JobStatus =
  | 'generating'
  | 'validating'
  | 'ready'
  | 'ready_with_warnings'
  | 'exporting'
  | 'done'
  | 'failed';

export interface Job {
  id: string;
  topic: string;
  status: JobStatus;
  progressMessage: string | null;
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
