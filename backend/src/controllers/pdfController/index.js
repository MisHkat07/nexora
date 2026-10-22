const path = require('path');
const fs = require('fs');
const pug = require('pug');
const moment = require('moment');
const puppeteer = require('puppeteer');

const { loadSettings } = require('@/middlewares/settings');
const useLanguage = require('@/locale/useLanguage');
const { useMoney, useDate } = require('@/settings');
const logger = require('@/logger');

const pugFiles = ['invoice', 'offer', 'quote', 'payment'];

// Keeps memory bounded on small instances (Render free plan has 512 MB)
const MAX_CONCURRENT_RENDERS = 2;
const RENDER_TIMEOUT_MS = 20000;

const PUBLIC_DIR = path.resolve('src/public');
const IMAGE_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.gif': 'image/gif' };

let browserPromise = null;

/** One shared headless Chrome, relaunched if it crashes. */
const getBrowser = () => {
  if (!browserPromise) {
    browserPromise = puppeteer
      .launch({
        headless: true,
        // Set PUPPETEER_EXECUTABLE_PATH to use a system Chromium (as the Docker image does)
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
      })
      .then((browser) => {
        browser.on('disconnected', () => {
          browserPromise = null;
        });
        return browser;
      })
      .catch((error) => {
        browserPromise = null;
        throw error;
      });
  }
  return browserPromise;
};

let activeRenders = 0;
const waiting = [];
const acquireSlot = () =>
  activeRenders < MAX_CONCURRENT_RENDERS
    ? (activeRenders++, Promise.resolve())
    : new Promise((resolve) => waiting.push(resolve));
const releaseSlot = () => {
  const next = waiting.shift();
  if (next) next();
  else activeRenders--;
};

/**
 * Turns an uploaded image path like "public/uploads/setting/logo.png" into a data URI,
 * so the PDF needs no network access. Remote URLs are returned unchanged.
 */
const imageSource = (filePath) => {
  if (!filePath) return '';
  if (/^https?:\/\//i.test(filePath)) return filePath;
  const absolutePath = path.resolve('src', filePath);
  const mimeType = IMAGE_TYPES[path.extname(absolutePath).toLowerCase()];
  if (!mimeType || !absolutePath.startsWith(PUBLIC_DIR + path.sep) || !fs.existsSync(absolutePath)) {
    return '';
  }
  return `data:${mimeType};base64,${fs.readFileSync(absolutePath).toString('base64')}`;
};

const renderHtml = async (modelName, result) => {
  const settings = await loadSettings();
  const selectedLang = settings['idurar_app_language'];
  const translate = useLanguage({ selectedLang });

  const { currency_symbol, currency_position, decimal_sep, thousand_sep, cent_precision, zero_format } =
    settings;

  const { moneyFormatter } = useMoney({
    settings: {
      currency_symbol,
      currency_position,
      decimal_sep,
      thousand_sep,
      cent_precision,
      zero_format,
    },
  });
  const { dateFormat } = useDate({ settings });

  const logoSrc = imageSource(settings.company_logo);
  const html = pug.renderFile('src/pdf/' + modelName + '.pug', {
    model: result,
    settings,
    logoSrc,
    translate,
    dateFormat,
    moneyFormatter,
    moment: moment,
  });
  return { html, remoteLogo: logoSrc.startsWith('http') ? logoSrc : null };
};

/** Renders a document (invoice, quote, payment) to a PDF and returns it as a Buffer. */
exports.generatePdf = async (modelName, result, { format = 'A4' } = {}) => {
  if (!pugFiles.includes(modelName.toLowerCase())) {
    throw new Error(`No PDF template for ${modelName}`);
  }

  const { html, remoteLogo } = await renderHtml(modelName, result);

  await acquireSlot();
  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    page.setDefaultTimeout(RENDER_TIMEOUT_MS);

    // The document content is user data: no scripts, and nothing loaded from the network
    // except an explicitly configured remote logo
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      if (url.startsWith('data:') || url === 'about:blank' || url === remoteLogo) request.continue();
      else request.abort();
    });

    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format,
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    });
    return Buffer.from(pdf);
  } finally {
    if (page) await page.close().catch(() => {});
    releaseSlot();
  }
};

exports.imageSource = imageSource;

/** Closes the shared browser (graceful shutdown and tests). */
exports.closeBrowser = async () => {
  if (!browserPromise) return;
  try {
    const browser = await browserPromise;
    await browser.close();
  } catch (error) {
    logger.warn({ err: error }, 'Could not close PDF browser');
  } finally {
    browserPromise = null;
  }
};
