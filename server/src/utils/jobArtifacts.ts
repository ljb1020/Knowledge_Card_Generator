import path from 'path';
import { resolveProjectPath } from './loadEnv.js';

const STORAGE_DIR = resolveProjectPath(process.env.APP_STORAGE_DIR ?? './storage');
const MAX_TOPIC_SEGMENT_LENGTH = 40;

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

function truncateCodePoints(value: string, maxLength: number): string {
  return Array.from(value).slice(0, maxLength).join('');
}

export function sanitizeTopicSegment(topic: string): string {
  const normalized = topic
    .trim()
    .replace(/[^\p{Script=Han}A-Za-z0-9]+/gu, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return truncateCodePoints(normalized || 'untitled', MAX_TOPIC_SEGMENT_LENGTH);
}

export function formatTimestampPrefix(createdAt: string): string {
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

export function formatJobFolderName(createdAt: string, topic: string): string {
  return `${formatTimestampPrefix(createdAt)}_${sanitizeTopicSegment(topic)}`;
}

export function getJobArtifactsDir(createdAt: string, topic: string): string {
  return path.join(STORAGE_DIR, 'jobs', formatJobFolderName(createdAt, topic));
}

export function getPublicImagePath(createdAt: string, topic: string, filename: string): string {
  return `storage/jobs/${formatJobFolderName(createdAt, topic)}/${filename}`;
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
