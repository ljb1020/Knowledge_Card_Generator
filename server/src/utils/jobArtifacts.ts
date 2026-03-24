import path from 'path';
import { resolveProjectPath } from './loadEnv.js';

const STORAGE_DIR = resolveProjectPath(process.env.APP_STORAGE_DIR ?? './storage');

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

export function formatJobFolderName(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid job createdAt timestamp: ${createdAt}`);
  }

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const milliseconds = pad(date.getMilliseconds(), 3);

  return `${year}_${month}_${day}_${hours}_${minutes}_${seconds}_${milliseconds}`;
}

export function getJobArtifactsDir(createdAt: string): string {
  return path.join(STORAGE_DIR, 'jobs', formatJobFolderName(createdAt));
}

export function getJobImagesDir(createdAt: string): string {
  return path.join(getJobArtifactsDir(createdAt), 'images');
}

export function getPublicImagePath(createdAt: string, filename: string): string {
  return `storage/jobs/${formatJobFolderName(createdAt)}/images/${filename}`;
}

export function getLegacyJobArtifactsDir(jobId: string): string {
  return path.join(STORAGE_DIR, 'jobs', jobId);
}

export function extractArtifactsDirFromImagePath(imagePath: string): string | null {
  const normalized = imagePath.replace(/\\/g, '/');
  const marker = 'storage/jobs/';
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  const rest = normalized.slice(markerIndex + marker.length);
  const [folderName] = rest.split('/');
  if (!folderName) {
    return null;
  }

  return path.join(STORAGE_DIR, 'jobs', folderName);
}
