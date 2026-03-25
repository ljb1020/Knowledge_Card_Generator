import { chromium } from 'playwright';
import { getAuthFilePath } from './src/publish/xhsAuth.js';

const url = 'https://creator.xiaohongshu.com/publish/publish?from=tab_switch&target=image';
const authFile = getAuthFilePath();

async function test() {
  try {
    console.log("启动浏览器...");
    const browser = await chromium.launch({ 
      headless: false, 
      proxy: { server: 'per-context' },
      args: ['--start-maximized', '--proxy-server=direct://', '--no-proxy-server'] 
    });
    const context = await browser.newContext({ storageState: authFile, viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    
    await page.goto(url);
    await page.waitForTimeout(5000);
    
    // 1. 上传图片
    console.log("1. 上传图片...");
    const dummyImage = 'd:\\LJB\\dev\\ClaudeCode\\Knowledge_Card_Generator\\storage\\jobs\\2026_03_24_22_16_36_791_JS数据类型\\Acover.png';
    const uploadBtn = page.locator('.upload-button, button:has-text("上传图片")').first();
    await uploadBtn.waitFor({ state: 'visible', timeout: 8000 });
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 10000 }),
      uploadBtn.click(),
    ]);
    await fileChooser.setFiles([dummyImage]);
    await page.waitForTimeout(5000);
    
    const title = "【自动化测试】前端面试卡题解";
    const content = "这里是系统追加的正文测试内容。";

    // 2. 填写标题 — 精确定位 input.d-text
    console.log("2. 填写标题...");
    try {
      const titleInput = page.locator('div.c-input_inner input.d-text, input[placeholder*="标题"]').first();
      await titleInput.waitFor({ state: 'visible', timeout: 5000 });
      await titleInput.click();
      await page.waitForTimeout(300);
      await titleInput.fill(title);
      console.log("   >>> 标题填写成功");
    } catch {
      const titleInput = page.locator('input[placeholder*="填写标题"]').first();
      await titleInput.click();
      await titleInput.fill(title);
      console.log("   >>> 标题填写成功 (fallback)");
    }
    await page.waitForTimeout(500);

    // 3. 点击话题模板箭头
    console.log("3. 点击 button.topicTemplate...");
    const arrowBtn = page.locator('button.topicTemplate').first();
    await arrowBtn.waitFor({ state: 'visible', timeout: 3000 });
    await arrowBtn.click();
    console.log("   >>> 箭头已点击");
    await page.waitForTimeout(1500);

    // 4. 点击"使用/管理话题模版"
    console.log("4. 点击 使用/管理话题模版...");
    const manageBtn = page.locator('div.topicTemplatePopover').filter({ hasText: '使用/管理话题模版' }).first();
    await manageBtn.waitFor({ state: 'visible', timeout: 3000 });
    await manageBtn.click();
    console.log("   >>> 已进入模版管理弹窗");
    await page.waitForTimeout(2000);

    // 5. 在模版弹窗中点击"前端"的"应用"
    console.log("5. 点击 '前端' 的 '应用'...");
    const card = page.locator('div.card').filter({ hasText: '前端' }).first();
    const applyBtn = card.getByRole('button', { name: '应用' }).first();
    await applyBtn.waitFor({ state: 'visible', timeout: 5000 });
    await applyBtn.click();
    console.log("   >>> 前端模版应用成功！");
    await page.waitForTimeout(1000);

    // 6. 填写正文
    console.log("6. 追加填写正文...");
    try {
      const editables = page.locator('[contenteditable="true"]');
      const count = await editables.count();
      const targetIndex = count >= 2 ? 1 : 0;
      await editables.nth(targetIndex).click();
      await page.waitForTimeout(500);
      await page.keyboard.type(content, { delay: 10 });
      console.log("   >>> 正文填写成功");
    } catch (err) {
      console.log('>>> 正文填写失败', err);
    }

    console.log("=========================================");
    console.log("全流程测试完毕！浏览器保持 20 秒供检查，不会发帖！");
    console.log("=========================================");
    
    await page.waitForTimeout(20000);
    await browser.close();
  } catch (e) {
    console.error(e);
  }
}
test();
