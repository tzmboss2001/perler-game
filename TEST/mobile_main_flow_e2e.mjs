import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function parseArgs(argv) {
  const result = {
    baseUrl: 'http://127.0.0.1:3005',
    chromePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    timeoutMs: 45000,
    screenshotDir: path.resolve('TEMP', 'Pictures'),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base-url' && argv[i + 1]) result.baseUrl = argv[++i];
    else if (a === '--chrome-path' && argv[i + 1]) result.chromePath = argv[++i];
    else if (a === '--headless') result.headless = true;
    else if (a === '--timeout-ms' && argv[i + 1]) result.timeoutMs = Number(argv[++i]) || result.timeoutMs;
    else if (a === '--screenshot-dir' && argv[i + 1]) result.screenshotDir = path.resolve(argv[++i]);
  }
  return result;
}

function nowTag() {
  const d = new Date();
  const pad = (n) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function resilientClick(locator) {
  try {
    await locator.click();
    return;
  } catch (_) {
    // Some modal overlays intercept pointer events in headless mode.
  }
  try {
    await locator.click({ force: true });
    return;
  } catch (_) {
    // Final fallback for stubborn overlay stacks.
  }
  await locator.evaluate((el) => el.click());
}

async function clickAny(page, candidates, stageName, screenshotDir, tag, trace) {
  for (const locator of candidates) {
    if ((await locator.count()) > 0) {
      const target = locator.first();
      await target.waitFor({ state: 'visible' });
      await resilientClick(target);
      trace.push(`click: ${stageName}`);
      return;
    }
  }
  const texts = (await page.locator('button').allTextContents()).map((t) => t.trim()).filter(Boolean);
  const debugShot = path.join(screenshotDir, `main_flow_${tag}_${stageName}_missing_target.png`);
  await page.screenshot({ path: debugShot, fullPage: true });
  trace.push(`debug_buttons(${stageName}): ${texts.join(' | ')}`);
  trace.push(`screenshot: ${debugShot}`);
  throw new Error(`no clickable candidate matched at stage: ${stageName}; visibleButtons=${texts.join('|')}`);
}

async function clickAnyWithShift(page, candidates, stageName, screenshotDir, tag, trace) {
  for (const locator of candidates) {
    if ((await locator.count()) > 0) {
      const target = locator.first();
      await target.waitFor({ state: 'visible' });
      try {
        await page.keyboard.down('Shift');
        await target.click();
        await page.keyboard.up('Shift');
      } catch (_) {
        try {
          await target.click({ modifiers: ['Shift'] });
          trace.push(`click: ${stageName} (with shift modifier)`);
          return;
        } catch (__){/* noop */}
        await target.evaluate((el) => {
          const evt = new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true });
          el.dispatchEvent(evt);
        });
      }
      trace.push(`click: ${stageName} (with shift)`);
      return;
    }
  }
  const texts = (await page.locator('button').allTextContents()).map((t) => t.trim()).filter(Boolean);
  const debugShot = path.join(screenshotDir, `main_flow_${tag}_${stageName}_missing_target.png`);
  await page.screenshot({ path: debugShot, fullPage: true });
  trace.push(`debug_buttons(${stageName}): ${texts.join(' | ')}`);
  trace.push(`screenshot: ${debugShot}`);
  throw new Error(`no clickable candidate matched at stage: ${stageName}; visibleButtons=${texts.join('|')}`);
}

async function dismissGuideIfPresent(page, trace) {
  const skipBtn = page.getByRole('button', { name: /跳过|Skip/i }).first();
  if ((await skipBtn.count()) > 0) {
    try {
      await skipBtn.waitFor({ state: 'visible', timeout: 1500 });
      await resilientClick(skipBtn);
      trace.push('guide: skipped');
      await page.waitForTimeout(250);
    } catch (_) {
      // Ignore: guide may already be gone.
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.screenshotDir, { recursive: true });

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(scriptDir, '..');

  const playwrightEntry = path.join(repoRoot, 'perler-beads', 'node_modules', 'playwright-core', 'index.js');
  if (!fs.existsSync(playwrightEntry)) {
    throw new Error(`playwright-core not found: ${playwrightEntry}`);
  }
  const playwrightMod = await import(pathToFileURL(playwrightEntry).href);
  const chromium = playwrightMod.chromium || playwrightMod.default?.chromium;
  if (!chromium) {
    throw new Error('playwright-core chromium launcher not found');
  }

  const uploadImage = path.join(repoRoot, 'perler-beads', 'public', 'thumbnails', 'post_10.png');
  if (!fs.existsSync(uploadImage)) {
    throw new Error(`upload image not found: ${uploadImage}`);
  }

  const tag = nowTag();
  const trace = [];
  let browser;
  try {
    browser = await chromium.launch({
      headless: args.headless,
      executablePath: args.chromePath,
      args: ['--disable-dev-shm-usage'],
    });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript(() => {
      window.__E2E_BYPASS_LOGIN__ = true;
    });
    page.setDefaultTimeout(args.timeoutMs);

    const snap = async (name) => {
      const p = path.join(args.screenshotDir, `main_flow_${tag}_${name}.png`);
      await page.screenshot({ path: p, fullPage: true });
      trace.push(`screenshot: ${p}`);
    };

    trace.push(`open: ${args.baseUrl}/mobile/create`);
    await page.goto(`${args.baseUrl}/mobile/create`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    await snap('create');

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(uploadImage);
    trace.push(`upload: ${uploadImage}`);

    await clickAny(page, [
      page.getByRole('button', { name: /确认|Confirm/i }),
      page.locator('button:has-text("确认")'),
    ], 'crop_confirm', args.screenshotDir, tag, trace);
    await page.waitForTimeout(1200);
    await dismissGuideIfPresent(page, trace);
    await snap('after_crop');

    await clickAny(page, [
      page.getByRole('button', { name: /快速开始|Quick/i }),
      page.locator('button:has-text("快速开始")'),
    ], 'quick_start', args.screenshotDir, tag, trace);

    await page.waitForURL(/\/mobile\/editor/, { timeout: args.timeoutMs });
    await page.waitForTimeout(800);
    await dismissGuideIfPresent(page, trace);
    await page.locator('text=正在生成图案').first().waitFor({ state: 'hidden', timeout: args.timeoutMs }).catch(() => {});
    await snap('editor');

    await clickAnyWithShift(page, [
      page.locator('button:not([disabled]):has-text("保存并开始制作")'),
      page.locator('button:not([disabled]):has-text("开始制作")'),
      page.getByRole('button', { name: /保存并开始制作|开始制作|Save/i }),
    ], 'start_making', args.screenshotDir, tag, trace);

    trace.push('save_modal: bypass_by_shift_click');

    await page.waitForURL(/\/mobile\/making/, { timeout: args.timeoutMs });
    await page.waitForTimeout(1000);
    await snap('making');
    trace.push('result: PASS');

    const reportPath = path.join(repoRoot, 'TEMP', `main_flow_e2e_report_${tag}.md`);
    const lines = [
      '# Main Flow E2E Report',
      '',
      `- Time: ${new Date().toISOString()}`,
      `- BaseUrl: ${args.baseUrl}`,
      `- Headless: ${args.headless}`,
      `- Chrome: ${args.chromePath}`,
      '',
      '## Trace',
      ...trace.map((t) => `- ${t}`),
    ];
    fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
    console.log(reportPath);
  } finally {
    if (browser) await browser.close();
  }
}

main().catch((err) => {
  console.error('[main-flow-e2e] failed:', err?.stack || err?.message || err);
  process.exit(1);
});
