import fs from 'fs';

/**
 * 确保目录存在，不存在则递归创建。
 */
export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
