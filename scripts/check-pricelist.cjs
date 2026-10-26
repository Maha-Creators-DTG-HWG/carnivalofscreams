// Run: PLAYWRIGHT_MODULE=/path/to/playwright node scripts/check-pricelist.cjs
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:3000'}/pricelist`);
    const menu = page.getByRole('slider');
    await menu.waitFor();
    const bounds = await menu.boundingBox();
    async function swipe(dx) {
      const x = bounds.x + bounds.width / 2;
      const y = bounds.y + bounds.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + dx, y, { steps: 12 });
      await page.mouse.up();
      await page.waitForTimeout(450);
    }
    async function isPage(number) { assert.equal(await menu.getAttribute('aria-valuenow'), String(number)); }
    await isPage(1);
    await swipe(130); await isPage(1);
    await swipe(-130); await isPage(2);
    await page.screenshot({ path: 'output/previews/pricelist-swipe-mobile.png', fullPage: true });
    await swipe(-25); await isPage(2);
    await swipe(-130); await isPage(3);
    await swipe(-130); await isPage(3);
    await swipe(130); await isPage(2);
    await menu.focus(); await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(450); await isPage(1);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await swipe(-130); await isPage(2);
    const touch = await page.context().newCDPSession(page);
    const y = bounds.y + bounds.height / 2;
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y }] });
    for (let x = 280; x >= 100; x -= 20) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(450); await isPage(3);
    assert.equal(await page.locator('main').getByRole('button').count(), 0);
    assert.equal(await page.getByRole('link', { name: 'Chat with us on WhatsApp' }).count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    console.log('PASS: swipes, boundaries, cancelled turn, keyboard, reduced motion, no buttons, no overflow, no runtime errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
