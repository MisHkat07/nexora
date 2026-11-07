const pug = require('pug');
const dayjs = require('dayjs');

const storage = require('@/storage');
const { loadSettings } = require('@/middlewares/settings');
const useLanguage = require('@/locale/useLanguage');
const { useMoney, useDate } = require('@/settings');
const logger = require('@/logger');

const pugFiles = ['invoice', 'offer', 'quote', 'payment'];

// Keeps memory bounded on small instances (Render free plan has 512 MB)
const MAX_CONCURRENT_RENDERS = 2;
const RENDER_TIMEOUT_MS = 20000;

let browserPromise = null;

/** One shared headless Chrome, relaunched if it crashes. */
const getBrowser = () => {
  if (!browserPromise) {
    // Puppeteer is ESM-only, so it is imported (once) rather than required
    browserPromise = import('puppeteer')
      .then(({ default: puppeteer }) =>
        puppeteer.launch({
        headless: true,
        // Set PUPPETEER_EXECUTABLE_PATH to use a system Chromium (as the Docker image does)
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
        })
      )
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
 * Turns an uploaded image key like "public/uploads/setting/logo.png" into a data URI read
 * from storage, so the PDF needs no network access. Anything else renders no image.
 */
const imageSource = async (key) => {
  if (!storage.isValidKey(key)) return '';
  const file = await storage.get(key);
  if (!file || !file.contentType.startsWith('image/') || file.contentType === 'image/svg+xml') return '';
  return `data:${file.contentType};base64,${file.body.toString('base64')}`;
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

  const html = pug.renderFile('src/pdf/' + modelName + '.pug', {
    model: result,
    settings,
    logoSrc: await imageSource(settings.company_logo),
    translate,
    dateFormat,
    moneyFormatter,
    dayjs,
  });
  return applyBranding(html, settings);
};

const safeColor = (color) => (/^#[0-9a-fA-F]{6}$/.test(color || '') ? color : null);

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

/** Applies the organization's brand color, template and footer without rewriting each Pug file. */
const applyBranding = (html, settings) => {
  const color = safeColor(settings.brand_color);
  let out = color ? html.replaceAll('#52008c', color) : html;
  if (settings.pdf_template === 'modern') {
    out = out.replace('font-family: sans-serif', 'font-family: "Segoe UI", Helvetica, sans-serif');
    if (color) {
      out = out.replace('h1.invoice{\n        font-size:32px;', `h1.invoice{\n        font-size:28px;border-bottom:3px solid ${color};padding-bottom:8px;`);
    }
  }
  const footer = String(settings.email_footer || '').trim();
  if (footer && out.includes('</body>')) {
    out = out.replace('</body>', `<p style="margin-top:28px;font-size:11px;color:#666">${escapeHtml(footer)}</p></body>`);
  }
  return out;
};

/** Renders a document (invoice, quote, payment) to a PDF and returns it as a Buffer. */
exports.generatePdf = async (modelName, result, { format = 'A4' } = {}) => {
  if (!pugFiles.includes(modelName.toLowerCase())) {
    throw new Error(`No PDF template for ${modelName}`);
  }

  const html = await renderHtml(modelName, result);

  await acquireSlot();
  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    page.setDefaultTimeout(RENDER_TIMEOUT_MS);

    // The document content is user data: no scripts, and nothing loaded from the network
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      if (url.startsWith('data:') || url === 'about:blank') request.continue();
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
