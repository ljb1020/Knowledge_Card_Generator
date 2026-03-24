import fs from 'fs';
import path from 'path';
import { chromium, type Page } from 'playwright';
import { getJobArtifactsDir, getPublicImagePath } from '../utils/jobArtifacts.js';

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

export interface ExportResult {
  success: boolean;
  imagePaths: string[];
  errorMessage?: string;
}

function getExportFilename(cardIndex: number, typeStr: string): string {
  if (cardIndex === 0 || typeStr === 'cover') {
    return 'Acover.png';
  }

  return `bullet${cardIndex}.png`;
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

export async function exportJob(jobId: string, createdAt: string, topic: string): Promise<ExportResult> {
  const jobArtifactsDir = getJobArtifactsDir(createdAt, topic);
  fs.rmSync(jobArtifactsDir, { recursive: true, force: true });
  fs.mkdirSync(jobArtifactsDir, { recursive: true });

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
      const typeStr = (await card.getAttribute('data-type')) ?? 'card';
      const filename = getExportFilename(i, typeStr);
      const filePath = path.join(jobArtifactsDir, filename);

      await card.screenshot({ path: filePath, type: 'png' });

      const fileStat = fs.statSync(filePath);
      if (!fileStat.isFile() || fileStat.size === 0) {
        throw new Error(`Screenshot file was not written correctly: ${filePath}`);
      }

      imagePaths.push(getPublicImagePath(createdAt, topic, filename));
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
