import fs from 'fs';
import path from 'path';
import { chromium, type BrowserContext } from 'playwright';
import { resolveProjectPath } from '../utils/loadEnv.js';
import { ensureDir } from '../utils/fs.js';

const STORAGE_DIR = resolveProjectPath(process.env.APP_STORAGE_DIR ?? './storage');
const AUTH_FILE = resolveProjectPath(process.env.XHS_AUTH_FILE ?? './storage/xhs-auth.json');
const LOGIN_TIMEOUT = parseInt(process.env.XHS_LOGIN_TIMEOUT ?? '120000', 10);
const DEBUG_DIR = path.join(STORAGE_DIR, 'xhs-debug');

const XHS_CREATOR_HOME = 'https://creator.xiaohongshu.com';
const XHS_LOGIN_URL = 'https://creator.xiaohongshu.com/login';

export interface AuthResult {
  success: boolean;
  message: string;
}



/**
 * 检查已保存的登录态是否仍然有效。
 * 方法：加载 storageState，访问创作者首页，看是否被重定向到登录页。
 */
async function validateAuth(): Promise<boolean> {
  if (!fs.existsSync(AUTH_FILE)) {
    return false;
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();

    await page.goto(XHS_CREATOR_HOME, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    const isLoggedIn = !currentUrl.includes('/login');

    await context.close();
    return isLoggedIn;
  } catch {
    return false;
  } finally {
    await browser?.close();
  }
}

/**
 * 弹出浏览器窗口让用户手动扫码登录小红书。
 * 登录成功后保存 storageState 到 AUTH_FILE。
 */
async function interactiveLogin(): Promise<AuthResult> {
  let browser;
  try {
    browser = await chromium.launch({
      headless: false,
      args: ['--start-maximized'],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();

    console.info('[xhs-auth] 正在打开小红书登录页，请在浏览器中扫码登录...');
    await page.goto(XHS_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // 等待用户扫码登录成功（URL 不再包含 /login）
    try {
      await page.waitForURL(
        (url) => !url.toString().includes('/login'),
        { timeout: LOGIN_TIMEOUT }
      );
    } catch {
      ensureDir(DEBUG_DIR);
      await page.screenshot({ path: path.join(DEBUG_DIR, 'login-timeout.png') });
      await context.close();
      return {
        success: false,
        message: `登录超时（${LOGIN_TIMEOUT / 1000}s），请重试`,
      };
    }

    // 等一下让 cookie 稳定
    await page.waitForTimeout(2000);

    ensureDir(path.dirname(AUTH_FILE));
    await context.storageState({ path: AUTH_FILE });

    console.info('[xhs-auth] 登录成功，cookie 已保存到', AUTH_FILE);
    await context.close();

    return { success: true, message: '登录成功' };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : '登录过程出错',
    };
  } finally {
    await browser?.close();
  }
}

/**
 * 确保小红书登录态可用。
 * 如果已有有效 cookie 则直接返回；否则弹出浏览器让用户扫码。
 */
export async function ensureXhsAuth(): Promise<AuthResult> {
  const isValid = await validateAuth();
  if (isValid) {
    return { success: true, message: '已有有效登录态' };
  }

  console.info('[xhs-auth] 登录态无效或不存在，需要重新登录');
  return interactiveLogin();
}

/**
 * 在已有 page 上等待用户登录完成（适用于 publisher 在同一会话中处理登录）。
 * 登录成功后自动保存 cookie。
 */
export async function waitForLoginOnPage(page: import('playwright').Page, context: BrowserContext): Promise<AuthResult> {
  console.info('[xhs-auth] 需要登录，请在弹出的浏览器窗口中扫码...');
  try {
    await page.waitForURL(
      (url) => !url.toString().includes('/login'),
      { timeout: LOGIN_TIMEOUT }
    );
  } catch {
    return { success: false, message: `登录超时（${LOGIN_TIMEOUT / 1000}s），请重试` };
  }

  await page.waitForTimeout(2000);
  ensureDir(path.dirname(AUTH_FILE));
  await context.storageState({ path: AUTH_FILE });
  console.info('[xhs-auth] 登录成功，cookie 已保存');
  return { success: true, message: '登录成功' };
}

/**
 * 保存最新的 storageState（供发布成功后刷新 cookie）。
 */
export async function saveAuth(context: BrowserContext): Promise<void> {
  ensureDir(path.dirname(AUTH_FILE));
  await context.storageState({ path: AUTH_FILE });
}

/**
 * 获取 storageState 文件路径（供 publisher 使用）。
 */
export function getAuthFilePath(): string {
  return AUTH_FILE;
}

export { DEBUG_DIR, LOGIN_TIMEOUT };
