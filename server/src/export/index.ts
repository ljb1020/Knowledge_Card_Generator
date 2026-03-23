import fs from 'fs';
import path from 'path';
import { chromium, type Page } from 'playwright';
import { resolveProjectPath } from '../utils/loadEnv.js';

type ExportPageGlobal = {
  __EXPORT_READY__?: boolean;
  __EXPORT_LAYOUT_OK__?: boolean;
  __EXPORT_CARD_COUNT__?: number;
  document?: {
    querySelectorAll(selector: string): { length: number };
  };
};

const WEB_PORT = parseInt(process.env.WEB_PORT ?? '5173', 10);
const WEB_HOST = process.env.WEB_HOST ?? 'localhost';
const STORAGE_DIR = resolveProjectPath(process.env.APP_STORAGE_DIR ?? './storage');

export interface ExportResult {
  success: boolean;
  imagePaths: string[];
  errorMessage?: string;
}

function formatExportTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}_${month}_${day}_${hours}_${minutes}_${seconds}`;
}

async function waitForExportReady(page: Page, timeout = 15000): Promise<number> {
  await page.waitForFunction(
    () => {
      const exportWindow = globalThis as unknown as ExportPageGlobal;
      const ready = exportWindow.__EXPORT_READY__ === true;
      const layoutOk = exportWindow.__EXPORT_LAYOUT_OK__ === true;
      const renderedCardCount = Number(exportWindow.__EXPORT_CARD_COUNT__ ?? 0);
      const domCardCount = exportWindow.document?.querySelectorAll('.export-card').length ?? 0;

      return ready && layoutOk && renderedCardCount > 0 && renderedCardCount === domCardCount;
    },
    undefined,
    { timeout }
  );

  const cardCount = await page.locator('.export-card').count();
  if (cardCount === 0) {
    throw new Error('Export page reported ready but no .export-card elements were rendered');
  }

  return cardCount;
}

async function checkLayoutOk(page: Page): Promise<boolean> {
  return page.evaluate(() => (globalThis as unknown as ExportPageGlobal).__EXPORT_LAYOUT_OK__ === true);
}

export async function exportJob(jobId: string): Promise<ExportResult> {
  const jobImagesDir = path.join(STORAGE_DIR, 'jobs', jobId, 'images');
  fs.rmSync(jobImagesDir, { recursive: true, force: true });
  fs.mkdirSync(jobImagesDir, { recursive: true });
  const exportTimestamp = formatExportTimestamp(new Date());

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 1280, height: 1600 },
      deviceScaleFactor: 1,
    });

    const exportUrl = `http://${WEB_HOST}:${WEB_PORT}/#/export/${jobId}`;
    await page.goto(exportUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const cardCount = await waitForExportReady(page);
    const layoutOk = await checkLayoutOk(page);
    if (!layoutOk) {
      return {
        success: false,
        imagePaths: [],
        errorMessage: 'Card layout validation failed before export',
      };
    }

    await page.waitForTimeout(500);

    const imagePaths: string[] = [];
    const cards = page.locator('.export-card');

    console.info(`[export] ${jobId} rendering ${cardCount} cards`);

    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i);
      const pageNum = i + 1;
      const typeStr = (await card.getAttribute('data-type')) ?? 'card';
      const filename = `${exportTimestamp}_${String(pageNum).padStart(2, '0')}-${typeStr}.png`;
      const filePath = path.join(jobImagesDir, filename);

      await card.screenshot({ path: filePath, type: 'png' });

      const fileStat = fs.statSync(filePath);
      if (!fileStat.isFile() || fileStat.size === 0) {
        throw new Error(`Screenshot file was not written correctly: ${filePath}`);
      }

      imagePaths.push(`storage/jobs/${jobId}/images/${filename}`);
    }

    if (imagePaths.length !== cardCount) {
      return {
        success: false,
        imagePaths: [],
        errorMessage: `Screenshot count mismatch: expected ${cardCount}, got ${imagePaths.length}`,
      };
    }

    return { success: true, imagePaths };
  } catch (err) {
    return {
      success: false,
      imagePaths: [],
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await browser?.close();
  }
}
