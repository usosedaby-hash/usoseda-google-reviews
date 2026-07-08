import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import puppeteer from 'puppeteer';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const DEBUG_DIR = path.join(ROOT, 'debug');
const REPOSITORY_RAW_BASE = 'https://raw.githubusercontent.com/usosedaby-hash/usoseda-google-reviews/main/data';

const LOCATIONS = [
  {
    id: 'asanaliyeva-25',
    name: 'Минск, ул. Асаналиева 25',
    businessName: '"У соседа" - прокат инструмента',
    outputFile: 'google-reviews-asanaliyeva-25.json',
    url: 'https://www.google.com/maps/place/%22%D0%A3+%D1%81%D0%BE%D1%81%D0%B5%D0%B4%D0%B0%22+-+%D0%BF%D1%80%D0%BE%D0%BA%D0%B0%D1%82+%D0%B8%D0%BD%D1%81%D1%82%D1%80%D1%83%D0%BC%D0%B5%D0%BD%D1%82%D0%B0/@53.8407933,27.5413653,17z/data=!4m18!1m9!3m8!1s0x46dbd12f5cb6e2fd:0x3d274afc25b2b629!2zItCjINGB0L7RgdC10LTQsCIgLSDQv9GA0L7QutCw0YIg0LjQvdGB0YLRgNGD0LzQtdC90YLQsA!8m2!3d53.8407933!4d27.5439402!9m1!1b1!16s%2Fg%2F11nnr5w_3n!3m7!1s0x46dbd12f5cb6e2fd:0x3d274afc25b2b629!8m2!3d53.8407933!4d27.5439402!9m1!1b1!16s%2Fg%2F11nnr5w_3n?entry=ttu&g_ep=EgoyMDI2MDYyNC4wIKXMDSoASAFQAw%3D%3D',
    alternateUrls: [
      'https://www.google.com/maps/place/%22%D0%A3+%D1%81%D0%BE%D1%81%D0%B5%D0%B4%D0%B0%22+-+%D0%BF%D1%80%D0%BE%D0%BA%D0%B0%D1%82+%D0%B8%D0%BD%D1%81%D1%82%D1%80%D1%83%D0%BC%D0%B5%D0%BD%D1%82%D0%B0/@53.8407933,27.5413653,17z/data=!4m18!1m9!3m8!1s0x46dbd12f5cb6e2fd:0x3d274afc25b2b629!2zItCjINGB0L7RgdC10LTQsCIgLSDQv9GA0L7QutCw0YIg0LjQvdGB0YLRgNGD0LzQtdC90YLQsA!8m2!3d53.8407933!4d27.5439402!9m1!1b1!16s%2Fg%2F11nnr5w_3n!3m7!1s0x46dbd12f5cb6e2fd:0x3d274afc25b2b629!8m2!3d53.8407933!4d27.5439402!9m1!1b1!16s%2Fg%2F11nnr5w_3n?entry=ttu&hl=ru&gl=by',
      'https://www.google.com/maps?cid=4406573207230002729&hl=ru&gl=by',
      'https://www.google.com/maps/search/?api=1&query=%22%D0%A3%20%D1%81%D0%BE%D1%81%D0%B5%D0%B4%D0%B0%22%20%D0%BF%D1%80%D0%BE%D0%BA%D0%B0%D1%82%20%D0%B8%D0%BD%D1%81%D1%82%D1%80%D1%83%D0%BC%D0%B5%D0%BD%D1%82%D0%B0%20%D0%90%D1%81%D0%B0%D0%BD%D0%B0%D0%BB%D0%B8%D0%B5%D0%B2%D0%B0%2025%20%D0%9C%D0%B8%D0%BD%D1%81%D0%BA&hl=ru&gl=by'
    ]
  },
  {
    id: 'skryganova-39a',
    name: 'Минск, ул. Скрыганова 39А',
    businessName: 'Usoseda.by',
    outputFile: 'google-reviews-skryganova-39a.json',
    url: 'https://www.google.com/maps/place/Usoseda.by/@53.9129193,27.5150361,17z/data=!4m8!3m7!1s0x46dbc5833a1f2091:0x4411c357b6b7ed94!8m2!3d53.9129193!4d27.517611!9m1!1b1!16s%2Fg%2F11n4t9ntg3?entry=ttu&g_ep=EgoyMDI2MDYyNC4wIKXMDSoASAFQAw%3D%3D',
    alternateUrls: [
      'https://www.google.com/maps/place/Usoseda.by/@53.9129193,27.5150361,17z/data=!4m8!3m7!1s0x46dbc5833a1f2091:0x4411c357b6b7ed94!8m2!3d53.9129193!4d27.517611!9m1!1b1!16s%2Fg%2F11n4t9ntg3?entry=ttu&hl=ru&gl=by',
      'https://www.google.com/maps?cid=4904916250678259092&hl=ru&gl=by'
    ]
  }
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function cleanLine(value) {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isIconLine(line) {
  return /^[^\p{L}\p{N}]+$/u.test(line);
}

function isReviewMeta(line) {
  return /^\d+\s+отзыв/u.test(line);
}

function isReviewDate(line) {
  return /(секунд|минут|час|день|дня|дней|недел|месяц|месяца|месяцев|год|года|лет)\s+назад/i.test(line);
}

function getRatingFromLines(lines, fromIndex, toIndex) {
  let rating = 0;

  for (let index = fromIndex; index < toIndex; index += 1) {
    if (lines[index] === '') {
      rating += 1;
    }
  }

  return rating || null;
}

function parseReviewsFromText(bodyText, location) {
  const lines = bodyText
    .split('\n')
    .map(cleanLine)
    .filter(Boolean);

  const reviews = [];
  const seen = new Set();
  const totalLine = lines.find((line) => /^Отзывов:\s*\d+/i.test(line)) || null;
  const total = totalLine ? Number(totalLine.replace(/\D+/g, '')) : null;
  const startIndex = Math.max(
    lines.findIndex((line) => line === 'Самые релевантные'),
    lines.findIndex((line) => line === 'Поиск отзывов'),
    lines.findIndex((line) => line === 'Отзывы')
  );
  const scanStart = startIndex >= 0 ? startIndex : 0;

  for (let index = scanStart; index < lines.length - 4; index += 1) {
    const author = lines[index];
    const meta = lines[index + 1];

    if (!author || !isReviewMeta(meta) || isIconLine(author)) {
      continue;
    }

    let dateIndex = -1;
    for (let cursor = index + 2; cursor < Math.min(index + 14, lines.length); cursor += 1) {
      if (isReviewDate(lines[cursor])) {
        dateIndex = cursor;
        break;
      }
    }

    if (dateIndex === -1) {
      continue;
    }

    const textLines = [];
    for (let cursor = dateIndex + 1; cursor < lines.length; cursor += 1) {
      const line = lines[cursor];
      const nextLine = lines[cursor + 1] || '';

      if (line === 'Нравится' || line === 'Поделиться') {
        break;
      }

      if (isReviewMeta(nextLine) && !isIconLine(line)) {
        break;
      }

      if (line === 'Ещё' || isIconLine(line)) {
        continue;
      }

      textLines.push(line);
    }

    const text = cleanLine(textLines.join(' '));
    if (!text) {
      continue;
    }

    const hash = sha256([
      'google',
      location.id,
      author.toLowerCase(),
      lines[dateIndex].toLowerCase(),
      text.toLowerCase()
    ].join('|'));

    if (seen.has(hash)) {
      continue;
    }

    seen.add(hash);
    reviews.push({
      id: hash.slice(0, 16),
      hash,
      author,
      authorMeta: meta,
      rating: getRatingFromLines(lines, index + 2, dateIndex),
      relativeDate: lines[dateIndex],
      text,
      source: 'google',
      locationId: location.id
    });
  }

  return { total, reviews };
}

async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(DEBUG_DIR, { recursive: true });
}

async function clickByText(page, labels) {
  for (const label of labels) {
    const clicked = await page.evaluate((buttonLabel) => {
      const elements = Array.from(document.querySelectorAll('a, button, [role="button"]'));
      const element = elements.find((item) => {
        const text = (item.innerText || item.textContent || item.getAttribute('aria-label') || '').trim();
        return text.toLowerCase() === buttonLabel.toLowerCase();
      });

      if (!element) {
        return false;
      }

      element.click();
      return true;
    }, label).catch(() => false);

    if (clicked) {
      await sleep(2500);
      return label;
    }
  }

  return null;
}

async function expandReviewText(page) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const clicked = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('button, [role="button"]'));
      let count = 0;

      for (const element of elements) {
        const text = (element.innerText || element.textContent || element.getAttribute('aria-label') || '').trim();
        if (text === 'Ещё' || text === 'More') {
          element.click();
          count += 1;
        }
      }

      return count;
    }).catch(() => 0);

    if (!clicked) {
      break;
    }

    await sleep(1500);
  }
}

async function scrollReviewPanel(page) {
  let previousTextLength = 0;
  let stableAttempts = 0;

  for (let attempt = 0; attempt < 35; attempt += 1) {
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('div'));
      const scrollable = elements
        .filter((element) => element.scrollHeight > element.clientHeight + 100)
        .sort((a, b) => b.scrollHeight - a.scrollHeight)[0];

      if (scrollable) {
        scrollable.scrollTop = scrollable.scrollHeight;
      } else {
        window.scrollTo(0, document.body.scrollHeight);
      }
    }).catch(() => null);
    await sleep(1000);

    const textLength = await page.evaluate(() => document.body.innerText.length).catch(() => 0);
    if (textLength === previousTextLength) {
      stableAttempts += 1;
    } else {
      stableAttempts = 0;
      previousTextLength = textLength;
    }

    if (stableAttempts >= 5) {
      break;
    }
  }
}

async function collectLocationAttempt(browser, location, attemptUrl, attemptIndex) {
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
    const response = await page.goto(attemptUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 90000
    });
    responseStatus = response ? response.status() : null;
    responseUrl = response ? response.url() : null;
    await sleep(7000);
    consentButton = await clickByText(page, [
      'Accept all',
      'I agree',
      'Принять все',
      'Согласен',
      'Принять',
      'Reject all',
      'Отклонить все'
    ]);
    await clickByText(page, ['Отзывы', 'Reviews']);
    await sleep(4000);
    await scrollReviewPanel(page);
    await expandReviewText(page);
  } catch (caughtError) {
    error = caughtError instanceof Error ? caughtError.message : String(caughtError);
  }

  const title = await page.title().catch(() => '');
  const finalUrl = page.url();
  const html = await page.content().catch(() => '');
  const bodyText = await page.evaluate(() => document.body.innerText || '').catch(() => '');
  const parsed = parseReviewsFromText(bodyText, location);

  const debugName = attemptIndex === 0 ? location.id : `${location.id}-attempt-${attemptIndex + 1}`;
  const htmlFile = path.join(DEBUG_DIR, `${debugName}.html`);
  const textFile = path.join(DEBUG_DIR, `${debugName}.txt`);
  const screenshotFile = path.join(DEBUG_DIR, `${debugName}.png`);

  await fs.writeFile(htmlFile, html);
  await fs.writeFile(textFile, bodyText);
  await page.screenshot({ path: screenshotFile, fullPage: true }).catch(() => null);
  await page.close().catch(() => null);

  const output = {
    generatedAt: new Date().toISOString(),
    source: 'google',
    location: {
      id: location.id,
      name: location.name,
      businessName: location.businessName,
      sourceUrl: location.url,
      usedUrl: attemptUrl,
      sourceFileUrl: `${REPOSITORY_RAW_BASE}/${location.outputFile}`
    },
    status: {
      ok: !error,
      error,
      attemptIndex,
      responseStatus,
      responseUrl,
      finalUrl,
      title,
      consentButton,
      declaredReviewCount: parsed.total,
      collectedReviewCount: parsed.reviews.length,
      htmlBytes: Buffer.byteLength(html),
      textBytes: Buffer.byteLength(bodyText),
      textHash: sha256(bodyText),
      debugFiles: {
        html: path.relative(ROOT, htmlFile),
        text: path.relative(ROOT, textFile),
        screenshot: path.relative(ROOT, screenshotFile)
      }
    },
    reviews: parsed.reviews
  };

  await fs.writeFile(
    path.join(DATA_DIR, location.outputFile),
    JSON.stringify(output, null, 2) + '\n'
  );

  return output;
}

async function collectLocation(browser, location) {
  const urls = [location.url, ...(location.alternateUrls || [])];
  const attempts = [];
  let bestOutput = null;

  for (let index = 0; index < urls.length; index += 1) {
    const output = await collectLocationAttempt(browser, location, urls[index], index);
    attempts.push({
      url: urls[index],
      ok: output.status.ok,
      title: output.status.title,
      declaredReviewCount: output.status.declaredReviewCount,
      collectedReviewCount: output.status.collectedReviewCount,
      textBytes: output.status.textBytes,
      debugFiles: output.status.debugFiles
    });

    if (!bestOutput || output.reviews.length > bestOutput.reviews.length) {
      bestOutput = output;
    }

    if (output.reviews.length > 0 && (!output.status.declaredReviewCount || output.reviews.length >= output.status.declaredReviewCount)) {
      break;
    }
  }

  bestOutput.status.attempts = attempts;
  await fs.writeFile(
    path.join(DATA_DIR, location.outputFile),
    JSON.stringify(bestOutput, null, 2) + '\n'
  );

  return bestOutput;
}

await ensureDirs();

const outputs = [];
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
    outputs.push(await collectLocation(browser, location));
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
  ok: !launchError && outputs.every((output) => output.status.ok),
  launchError,
  runner: {
    node: process.version,
    platform: process.platform,
    arch: process.arch
  },
  files: LOCATIONS.map((location) => ({
    locationId: location.id,
    locationName: location.name,
    file: `data/${location.outputFile}`,
    sourceFileUrl: `${REPOSITORY_RAW_BASE}/${location.outputFile}`
  })),
  locations: outputs.map((output) => ({
    id: output.location.id,
    name: output.location.name,
    ok: output.status.ok,
    error: output.status.error,
    declaredReviewCount: output.status.declaredReviewCount,
    collectedReviewCount: output.status.collectedReviewCount,
    sourceUrl: output.location.sourceUrl,
    sourceFileUrl: output.location.sourceFileUrl,
    title: output.status.title
  }))
};

await fs.writeFile(
  path.join(DATA_DIR, 'status.json'),
  JSON.stringify(status, null, 2) + '\n'
);

console.log(JSON.stringify(status, null, 2));

if (launchError) {
  process.exitCode = 1;
}
