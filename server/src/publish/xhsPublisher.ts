import fs from 'fs';
import path from 'path';
import { chromium, type Page } from 'playwright';
import { getAuthFilePath, DEBUG_DIR } from './xhsAuth.js';

// 直接带参数打开图文上传 tab
const XHS_PUBLISH_URL = 'https://creator.xiaohongshu.com/publish/publish?from=tab_switch&target=image';
const LOGIN_TIMEOUT = parseInt(process.env.XHS_LOGIN_TIMEOUT ?? '120000', 10);

export interface PublishResult {
  success: boolean;
  message: string;
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function saveDebugScreenshot(page: Page, name: string) {
  try {
    ensureDir(DEBUG_DIR);
    await page.screenshot({ path: path.join(DEBUG_DIR, `${name}.png`) });
  } catch {
    // debug screenshot 失败不影响主流程
  }
}

/**
 * 将图片上传到小红书创作者平台并直接发布。
 * 登录和发布在同一个浏览器会话中完成，避免多次开关浏览器导致 session 失效。
 */
export async function publishDraft(
  localImagePaths: string[],
  title: string,
  content: string
): Promise<PublishResult> {
  // 校验图片文件是否存在
  for (const imgPath of localImagePaths) {
    if (!fs.existsSync(imgPath)) {
      return { success: false, message: `图片文件不存在: ${imgPath}` };
    }
  }

  const authFile = getAuthFilePath();
  const hasAuth = fs.existsSync(authFile);

  let browser;
  try {
    browser = await chromium.launch({
      headless: false,
      args: ['--start-maximized'],
    });

    // 如果有已保存的 cookie 就加载，没有就空白启动
    const contextOptions: { storageState?: string; viewport: { width: number; height: number } } = {
      viewport: { width: 1280, height: 900 },
    };
    if (hasAuth) {
      contextOptions.storageState = authFile;
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    // 1. 打开图文上传页
    console.info('[xhs-publish] 正在打开图文上传页...');
    await page.goto(XHS_PUBLISH_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);

    // 2. 检查是否需要登录（被重定向到登录页）
    if (page.url().includes('/login')) {
      console.info('[xhs-publish] 需要登录，请在弹出的浏览器窗口中扫码...');

      // 在同一个浏览器里等用户扫码登录
      try {
        await page.waitForURL(
          (url) => !url.toString().includes('/login'),
          { timeout: LOGIN_TIMEOUT }
        );
      } catch {
        await saveDebugScreenshot(page, 'login-timeout');
        await context.close();
        return { success: false, message: `登录超时（${LOGIN_TIMEOUT / 1000}s），请重试` };
      }

      await page.waitForTimeout(2000);

      // 保存 cookie 供下次使用
      ensureDir(path.dirname(authFile));
      await context.storageState({ path: authFile });
      console.info('[xhs-publish] 登录成功，cookie 已保存');

      // 登录成功后重新导航到图文上传页
      await page.goto(XHS_PUBLISH_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(3000);
    }

    await saveDebugScreenshot(page, 'after-page-load');

    // 3. 上传图片（通过 fileChooser 事件）
    console.info(`[xhs-publish] 正在上传 ${localImagePaths.length} 张图片...`);

    const uploadBtnSelector = '.upload-button, button:has-text("上传图片")';
    try {
      const uploadBtn = page.locator(uploadBtnSelector).first();
      await uploadBtn.waitFor({ state: 'visible', timeout: 8000 });

      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 10000 }),
        uploadBtn.click(),
      ]);

      await fileChooser.setFiles(localImagePaths);
      console.info('[xhs-publish] 图片已通过 fileChooser 提交');
    } catch (err) {
      await saveDebugScreenshot(page, 'upload-failed');
      console.error('[xhs-publish] 上传失败:', err instanceof Error ? err.message : err);

      // 备选：直接找 file input
      const fileInputs = page.locator('input[type="file"]');
      const count = await fileInputs.count();
      let uploaded = false;
      for (let i = 0; i < count; i++) {
        const accept = await fileInputs.nth(i).getAttribute('accept') ?? '';
        if (!accept.includes('.mp4') && !accept.includes('.mov')) {
          await fileInputs.nth(i).setInputFiles(localImagePaths);
          uploaded = true;
          break;
        }
      }
      if (!uploaded) {
        await context.close();
        return { success: false, message: '无法上传图片' };
      }
    }

    // 等待图片上传完成
    await page.waitForTimeout(5000);
    await saveDebugScreenshot(page, 'after-upload');
    console.info('[xhs-publish] 图片上传完成');

    // 4. 填写标题
    console.info('[xhs-publish] 正在填写标题...');
    try {
      const titleInput = page.locator('[placeholder*="标题"], [placeholder*="填写标题"]').first();
      await titleInput.waitFor({ state: 'visible', timeout: 5000 });
      await titleInput.click();
      await page.waitForTimeout(300);
      await titleInput.fill(title);
    } catch {
      const titleEditable = page.locator('[contenteditable="true"]').first();
      await titleEditable.click();
      await titleEditable.fill(title);
    }
    await page.waitForTimeout(500);

    // 5. 填写正文（contenteditable 富文本，用 keyboard.type）
    console.info('[xhs-publish] 正在填写正文...');
    try {
      const contentArea = page.locator(
        '[placeholder*="正文"], [placeholder*="描述"], [placeholder*="分享"]'
      ).first();
      await contentArea.waitFor({ state: 'visible', timeout: 5000 });
      await contentArea.click();
      await page.waitForTimeout(500);
      await page.keyboard.type(content, { delay: 10 });
    } catch {
      try {
        const editables = page.locator('[contenteditable="true"]');
        const count = await editables.count();
        const targetIndex = count >= 2 ? 1 : 0;
        await editables.nth(targetIndex).click();
        await page.waitForTimeout(500);
        await page.keyboard.type(content, { delay: 10 });
      } catch {
        console.warn('[xhs-publish] 正文填写失败，跳过');
      }
    }
    await page.waitForTimeout(1000);

    // 6. 点击"发布"
    console.info('[xhs-publish] 正在发布...');
    try {
      const publishBtn = page.getByText('发布', { exact: true }).first();
      await publishBtn.waitFor({ state: 'visible', timeout: 5000 });
      await publishBtn.click();
    } catch {
      const altBtn = page.locator('button:has-text("发布"), [class*="publish"]').last();
      await altBtn.click();
    }

    // 7. 等待发布完成
    await page.waitForTimeout(5000);
    await saveDebugScreenshot(page, 'after-publish');

    // 发布成功后再次保存最新 cookie
    ensureDir(path.dirname(authFile));
    await context.storageState({ path: authFile });

    console.info('[xhs-publish] 发布完成');
    await context.close();

    return { success: true, message: '已发布到小红书' };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[xhs-publish] 发布失败:', errMsg);
    return { success: false, message: `发布失败: ${errMsg}` };
  } finally {
    await browser?.close();
  }
}
