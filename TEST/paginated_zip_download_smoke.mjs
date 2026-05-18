import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const playwrightEntry = path.join(repoRoot, 'perler-beads', 'node_modules', 'playwright-core', 'index.js');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.join(repoRoot, 'TEMP', 'paginated-zip-download-smoke');
const baseUrl = process.env.MAKING_SMOKE_BASE_URL || 'http://127.0.0.1:3005';

const readUint16 = (view, offset) => view.getUint16(offset, true);
const readUint32 = (view, offset) => view.getUint32(offset, true);

function todayTag() {
  const d = new Date();
  const pad = (n) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function extractZipEntryNames(bytes) {
  const names = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  let offset = 0;
  while (offset + 46 <= bytes.length) {
    if (readUint32(view, offset) !== 0x02014b50) {
      offset += 1;
      continue;
    }
    const nameLength = readUint16(view, offset + 28);
    const extraLength = readUint16(view, offset + 30);
    const commentLength = readUint16(view, offset + 32);
    const nameStart = offset + 46;
    names.push(decoder.decode(bytes.slice(nameStart, nameStart + nameLength)));
    offset = nameStart + nameLength + extraLength + commentLength;
  }
  return names;
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const playwrightMod = await import(pathToFileURL(playwrightEntry).href);
  const chromium = playwrightMod.chromium || playwrightMod.default?.chromium;
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: chromePath,
      args: ['--disable-dev-shm-usage'],
    });
    const context = await browser.newContext({
      acceptDownloads: true,
      viewport: { width: 1365, height: 900 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    await page.addInitScript((dateTag) => {
      window.__E2E_BYPASS_LOGIN__ = true;
      localStorage.setItem('perler_beads_token', 'test-token');
      localStorage.setItem(
        'perler_beads_user_info',
        JSON.stringify({
          id: 1,
          email: 'test@example.com',
          username: 'test',
          nickname: 'test',
          avatar: '',
          email_verified: true,
          member_level: 1,
          member_expire: '2099-12-31',
        }),
      );
      const colors = [
        { id: '80-19001', name: 'White', hex: '#eaefee', rgb: [234, 239, 238], brand: 'perler' },
        { id: '80-19005', name: 'Red', hex: '#b0353c', rgb: [176, 53, 60], brand: 'perler' },
        { id: '80-19008', name: 'Dark Blue', hex: '#0e5092', rgb: [14, 80, 146], brand: 'perler' },
        { id: '80-19010', name: 'Dark Green', hex: '#007b4e', rgb: [0, 123, 78], brand: 'perler' },
      ];
      localStorage.setItem(
        'community_making_bead_data',
        JSON.stringify({
          width: 60,
          height: 30,
          beads: Array.from({ length: 60 * 30 }, (_, index) => colors[index % colors.length]),
        }),
      );
      localStorage.setItem(
        'ad_monetization_state_v1',
        JSON.stringify({
          premiumExportDate: dateTag,
          premiumExportRewardCredits: 5,
          aiCutoutRewardCredits: 0,
        }),
      );
    }, todayTag());

    await page.goto(`${baseUrl}/mobile/making?test=1`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(2500);
    await page.screenshot({
      path: path.join(outputDir, 'before_export_button_lookup.png'),
      fullPage: true,
    });
    const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
    console.log(JSON.stringify({ url: page.url(), bodyText: bodyText.slice(0, 500) }, null, 2));
    const exportButton = page.locator('button[title="下载图纸"]').last();
    await exportButton.waitFor({ state: 'visible' });
    await exportButton.click({ force: true });
    await page.getByText('导出图纸').waitFor();
    await page.locator('input[type="checkbox"]').last().evaluate((el) => el.click());
    await page.getByText('将下载 1 个 ZIP 压缩包').waitFor();
    await page.locator('select').selectOption('54');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /导出打印版图纸/ }).click(),
    ]);
    const suggested = download.suggestedFilename();
    assert.match(suggested, /^perler-\d+x\d+-boards-\d{8}\.zip$/);

    const savedPath = path.join(outputDir, suggested);
    await download.saveAs(savedPath);
    const bytes = fs.readFileSync(savedPath);
    const entryNames = extractZipEntryNames(bytes);

    assert.ok(entryNames.some((name) => /board1-p1of2-\d{8}\.png$/.test(name)));
    assert.ok(entryNames.some((name) => /board2-p2of2-\d{8}\.png$/.test(name)));
    assert.equal(entryNames.length, 2);

    await page.screenshot({
      path: path.join(outputDir, 'paginated_zip_export_modal_after_download.png'),
      fullPage: true,
    });

    console.log(
      JSON.stringify(
        {
          downloaded: savedPath,
          suggested,
          entryCount: entryNames.length,
          entries: entryNames,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser?.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
