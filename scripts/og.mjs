// Renders og.html to public/og.jpg with headless Chrome or Edge. Set CHROME to override the browser path.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';

const candidates = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const browser = candidates.find((p) => existsSync(p));
if (!browser) throw new Error('No Chrome or Edge found. Set CHROME to the browser executable.');

const server = await createServer({ server: { port: 5399, strictPort: true }, logLevel: 'error' });
await server.listen();
const out = resolve('public/og.jpg');
const profile = mkdtempSync(join(tmpdir(), 'og-chrome-'));
try {
  // Async so the dev server in this process can still answer the browser.
  await promisify(execFile)(browser, [
    '--headless=new',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1200,630',
    '--virtual-time-budget=8000',
    `--screenshot=${out}`,
    'http://localhost:5399/og.html',
  ], { timeout: 60_000 });
  console.log(`Wrote ${out}`);
} finally {
  await server.close();
  rmSync(profile, { recursive: true, force: true });
}
