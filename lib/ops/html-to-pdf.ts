import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Browser } from 'puppeteer-core';

/** Remote pack for Vercel / serverless: binaries are not bundled in the deploy. */
const DEFAULT_CHROMIUM_PACK =
  'https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar';

const LOCAL_CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
].filter((p): p is string => Boolean(p));

function localChromePath(): string | undefined {
  return LOCAL_CHROME_CANDIDATES.find((p) => existsSync(p));
}

function isServerless(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION || process.env.AWS_EXECUTION_ENV);
}

/** Inline `/logo.svg` so PDF generation does not depend on an absolute site URL. */
export function withInlineLogo(html: string): string {
  const svg = readFileSync(join(process.cwd(), 'public', 'logo.svg'), 'utf8');
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  return html.replace(/https?:\/\/[^"'>\s]+\/logo\.svg|\/logo\.svg/g, dataUri);
}

async function launchBrowser(): Promise<Browser> {
  const puppeteer = await import('puppeteer-core');
  const localPath = localChromePath();

  if (localPath && !isServerless()) {
    return puppeteer.launch({
      executablePath: localPath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    });
  }

  const chromium = (await import('@sparticuz/chromium-min')).default;
  chromium.setGraphicsMode = false;

  const packUrl = process.env.CHROMIUM_PACK_URL || DEFAULT_CHROMIUM_PACK;
  const args = await puppeteer.defaultArgs({ args: chromium.args, headless: 'shell' });

  return puppeteer.launch({
    args,
    defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
    executablePath: await chromium.executablePath(packUrl),
    headless: 'shell',
  });
}

export async function htmlToPdf(html: string): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      if (
        url.startsWith('data:') ||
        url.startsWith('about:') ||
        url.startsWith('blob:') ||
        url.startsWith('https://cdn.jsdelivr.net/')
      ) {
        void req.continue();
        return;
      }
      void req.abort();
    });
    await page.setContent(withInlineLogo(html), {
      waitUntil: 'load',
      timeout: 45_000,
    });
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });
    await page
      .waitForFunction(
        () => {
          const blocks = document.querySelectorAll('.mermaid');
          if (!blocks.length) return true;
          return Array.from(blocks).every(
            (el) =>
              Boolean(el.querySelector('svg')) || el.getAttribute('data-processed') === 'true'
          );
        },
        { timeout: 20_000 }
      )
      .catch(() => undefined);
    await page.addStyleTag({
      content:
        '@media print { .mermaid, pre.mermaid { break-inside: avoid; page-break-inside: avoid; } svg { max-width: 100% !important; height: auto !important; } }',
    });
    await new Promise((r) => setTimeout(r, 400));
    await page.emulateMediaType('print');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: '14mm', right: '12mm', bottom: '16mm', left: '12mm' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close().catch(() => undefined);
  }
}
