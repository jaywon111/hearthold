const { chromium } = require('/usr/local/lib/node_modules/playwright');
const fs = require('fs');
const out = '/w/hosts/1/u/6ada478de56518fe37365d4c/workspace/hearthold/screenshots/proof';
const base = 'http://127.0.0.1:4173';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const errors = [];
  async function prep(page, route) {
    page.on('pageerror', e => errors.push(`${route}: ${e.message}`));
    await page.goto(base + route, { waitUntil: 'networkidle', timeout: 90000 });
    await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
    await page.waitForSelector('header button', { timeout: 30000 });
    await page.getByRole('button', { name: /connect near testnet wallet/i }).waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(1700);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  }
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  for (const [route, name] of [['/', 'home-desktop'], ['/explore', 'explore-desktop'], ['/listing/l2', 'listing-l2-desktop']]) {
    await prep(desktop, route);
    const button = desktop.getByRole('button', { name: /connect near testnet wallet/i });
    const detail = await button.evaluate(el => ({ text: el.innerText, bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color, box: el.getBoundingClientRect().toJSON() }));
    await desktop.screenshot({ path: `${out}/${name}.png`, fullPage: true, animations: 'disabled' });
    console.log(JSON.stringify({ name, url: desktop.url(), button: detail, screenshot: `${out}/${name}.png` }));
  }
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await prep(mobile, '/');
  await mobile.screenshot({ path: `${out}/home-mobile.png`, fullPage: true, animations: 'disabled' });
  console.log(JSON.stringify({ name: 'home-mobile', url: mobile.url(), screenshot: `${out}/home-mobile.png` }));
  await desktop.goto(base + '/', { waitUntil: 'networkidle', timeout: 90000 });
  await desktop.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
  await desktop.waitForTimeout(1500);
  await desktop.getByRole('button', { name: /connect near testnet wallet/i }).click();
  await desktop.getByText(/meteor/i).first().waitFor({ state: 'visible', timeout: 30000 });
  await desktop.waitForTimeout(1200);
  const modalEvidence = await desktop.locator('body').innerText();
  if (!/meteor/i.test(modalEvidence)) throw new Error('Meteor label absent in wallet modal');
  await desktop.screenshot({ path: `${out}/wallet-modal-meteor.png`, fullPage: false, animations: 'disabled' });
  console.log(JSON.stringify({ name: 'wallet-modal-meteor', meteorVisible: /meteor/i.test(modalEvidence), screenshot: `${out}/wallet-modal-meteor.png` }));
  console.log(JSON.stringify({ pageErrors: errors }));
  await browser.close();
})().catch(e => { console.error(e.stack || e); process.exit(1); });
