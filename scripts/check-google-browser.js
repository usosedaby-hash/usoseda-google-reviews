import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import puppeteer from 'puppeteer';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const DEBUG_DIR = path.join(ROOT, 'debug');

const LOCATIONS = [
  {
    id: 'skryganova',
    name: '"У соседа" - прокат инструмента',
    url: 'https://www.google.com/maps/place/%22%D0%A3+%D1%81%D0%BE%D1%81%D0%B5%D0%B4%D0%B0%22+-+%D0%BF%D1%80%D0%BE%D0%BA%D0%B0%D1%82+%D0%B8%D0%BD%D1%81%D1%82%D1%80%D1%83%D0%BC%D0%B5%D0%BD%D1%82%D0%B0/@53.8407933,27.5413653,17z/data=!4m18!1m9!3m8!1s0x46dbd12f5cb6e2fd:0x3d274afc25b2b629!2zItCjINGB0L7RgdC10LTQsCIgLSDQv9GA0L7QutCw0YIg0LjQvdGB0YLRgNGD0LzQtdC90YLQsA!8m2!3d53.8407933!4d27.5439402!9m1!1b1!16s%2Fg%2F11nnr5w_3n!3m7!1s0x46dbd12f5cb6e2fd:0x3d274afc25b2b629!8m2!3d53.8407933!4d27.5439402!9m1!1b1!16s%2Fg%2F11nnr5w_3n?entry=ttu'
  },
  {
    id: 'asanaliyeva',
    name: 'Usoseda.by',
    url: 'https://www.google.com/maps/place/Usoseda.by/@53.9129193,27.5150361,17z/data=!4m8!3m7!1s0x46dbc5833a1f2091:0x4411c357b6b7ed94!8m2!3d53.9129193!4d27.517611!9m1!1b1!16s%2Fg%2F11n4t9ntg3?entry=ttu'
  }
];

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(DEBUG_DIR, { recursive: true });
}

async function clickConsentIfShown(page) {
  const labels = [
    'Accept all',
    'I agree',
    'Принять все',
    'Согласен',
    'Принять',
    'Reject all',
    'Отклонить все'
  ];

  for (const label of labels) {
    const clicked = await page.evaluate((buttonLabel) => {
      const elements = Array.from(document.querySelectorAll('button, [role="button"]'));
      const button = elements.find((element) => {
        const text = (element.innerText || element.textContent || '').trim();
        return text.toLowerCase() === buttonLabel.toLowerCase();
      });

      if (!button) {
        return false;
      }

      button.click();
      return true;
    }, label).catch(() => false);

    if (clicked) {
      await page.waitForTimeout(2500);
      return label;
    }
  }

  return null;
}

async function inspectLocation(browser, location) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.7,en;q=0.6'
  });
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  );

  const startedAt = new Date().toISOString();
  let responseStatus = null;
  let responseUrl = null;
  let error = null;
  let consentButton = null;

  try {
    const response = await page.goto(location.url, {
      waitUntil: 'domcontentloaded',
      timeout: 90000
    });
    responseStatus = response ? response.status() : null;
    responseUrl = response ? response.url() : null;
    await page.waitForTimeout(7000);
    consentButton = await clickConsentIfShown(page);
    await page.waitForTimeout(8000);
  } catch (caughtError) {
    error = caughtError instanceof Error ? caughtError.message : String(caughtError);
  }

  const title = await page.title().catch(() => '');
  const finalUrl = page.url();
  const html = await page.content().catch(() => '');
  const bodyText = await page.evaluate(() => document.body.innerText || '').catch(() => '');
  const reviewHints = bodyText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /отзыв|review|rating|рейтинг|звезд/i.test(line))
    .slice(0, 80);

  const htmlFile = path.join(DEBUG_DIR, `${location.id}.html`);
  const textFile = path.join(DEBUG_DIR, `${location.id}.txt`);
  const screenshotFile = path.join(DEBUG_DIR, `${location.id}.png`);

  await fs.writeFile(htmlFile, html);
  await fs.writeFile(textFile, bodyText);
  await page.screenshot({ path: screenshotFile, fullPage: true }).catch(() => null);
  await page.close().catch(() => null);

  return {
    id: location.id,
    name: location.name,
    sourceUrl: location.url,
    startedAt,
    finishedAt: new Date().toISOString(),
    ok: !error,
    error,
    responseStatus,
    responseUrl,
    finalUrl,
    title,
    consentButton,
    htmlBytes: Buffer.byteLength(html),
    textBytes: Buffer.byteLength(bodyText),
    textHash: sha256(bodyText),
    reviewHintCount: reviewHints.length,
    reviewHints,
    debugFiles: {
      html: path.relative(ROOT, htmlFile),
      text: path.relative(ROOT, textFile),
      screenshot: path.relative(ROOT, screenshotFile)
    }
  };
}

await ensureDirs();

const locations = [];
let browser = null;
let launchError = null;

try {
  browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1440,1100'
    ]
  });

  for (const location of LOCATIONS) {
    locations.push(await inspectLocation(browser, location));
  }
} catch (caughtError) {
  launchError = caughtError instanceof Error ? caughtError.message : String(caughtError);
} finally {
  if (browser) {
    await browser.close().catch(() => null);
  }
}

const status = {
  generatedAt: new Date().toISOString(),
  ok: !launchError && locations.every((location) => location.ok),
  launchError,
  runner: {
    node: process.version,
    platform: process.platform,
    arch: process.arch
  },
  locations
};

const reviewsExport = {
  generatedAt: status.generatedAt,
  source: 'google',
  status: 'diagnostic-only',
  note: 'This file is created by the first browser test. Real review parsing will be added after diagnostics are checked.',
  locations: locations.map((location) => ({
    id: location.id,
    name: location.name,
    url: location.sourceUrl,
    ok: location.ok,
    title: location.title,
    reviewHintCount: location.reviewHintCount,
    reviews: []
  }))
};

await fs.writeFile(
  path.join(DATA_DIR, 'status.json'),
  JSON.stringify(status, null, 2) + '\n'
);
await fs.writeFile(
  path.join(DATA_DIR, 'google-reviews.json'),
  JSON.stringify(reviewsExport, null, 2) + '\n'
);

console.log(JSON.stringify(status, null, 2));

if (launchError) {
  process.exitCode = 1;
}
