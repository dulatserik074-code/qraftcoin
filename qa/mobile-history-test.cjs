const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.QA_BASE_URL || 'http://localhost:3107';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local QA only');
const business = { id: 'mobile-business', ownerId: 'owner', name: 'Qaz Coffee', currency: 'KZT', rewardRateBps: 500 };
const longName = 'Alexander Nurgaliyev with a very long customer name';
const rows = [
  { type: 'EARN', points: '62500', purchaseAmount: '125000000', name: longName, employee: { email: 'alexander.nurgaliyev.with.an.extremely.long.employee.address@example.test' } },
  { type: 'REDEEM', points: '100', purchaseAmount: null, name: 'Ayan', employee: null },
  { type: 'BONUS', points: '125000000000', purchaseAmount: null, name: 'VeryLongUnbrokenCustomerNameForCheckingWrappingAt320Pixels', employee: null },
  { type: 'ADJUSTMENT', points: '-250', purchaseAmount: null, name: 'Adjustment customer', employee: null },
  { type: 'ADJUSTMENT', points: '250', purchaseAmount: '12345', name: 'Positive adjustment', employee: null },
  { type: 'EXPIRE', points: '10', purchaseAmount: null, name: 'Expired points', employee: null },
  { type: 'BONUS', points: '0', name: 'Zero points' },
].map((t, i) => ({ ...t, id: `row-${i}`, createdAt: '2026-09-10T14:32:00.000Z', membership: { customer: { name: t.name } }, status: 'COMPLETED' }));
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ locale: 'en-GB', timezoneId: 'UTC', ignoreHTTPSErrors: process.env.QA_ALLOW_SELF_SIGNED === 'true' });
  const errors = []; const results = []; const out = path.join(__dirname, 'v041/mobile-history');
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url()); const pageNumber = Number(url.searchParams.get('page') || 1);
    const history = { items: pageNumber === 1 ? rows : [rows[1]], total: 21, page: pageNumber, pageSize: 20 };
    let body;
    if (url.pathname === '/api/me') body = { user: { id: 'owner', email: 'owner@example.test', role: 'BUSINESS_OWNER' }, businesses: [business] };
    else if (url.pathname.endsWith('/transactions')) body = history;
    else if (url.pathname.endsWith('/customers/mobile-customer')) body = { customerId: 'mobile-customer', publicId: 'synthetic-qa-id', pointsBalance: '62400', customer: { name: 'Ayan', phone: null, email: null }, history };
    else throw Error(`Unexpected fixture request: ${url.pathname}`);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  try {
    for (const route of ['/transactions', '/customers/mobile-customer']) {
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 }); await page.goto(base + route);
        const mobile = width < 768;
        const list = page.getByRole('list', { name: 'Transaction history', exact: true });
        const table = page.getByRole('table', { name: 'Transaction history', exact: true });
        await (mobile ? list : table).waitFor();
        assert.equal(await page.locator('ul[aria-label="Transaction history"]').count(), mobile ? 1 : 0);
        assert.equal(await page.locator('table[aria-label="Transaction history"]').count(), mobile ? 0 : 1);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        const snapshot = await (mobile ? list : table).ariaSnapshot();
        assert.equal(await (mobile ? list : table).getByText(longName, { exact: true }).count(), 1, 'Customer content is rendered once');
        if (mobile) {
          const cards = list.getByRole('listitem'); assert.equal(await cards.count(), rows.length);
          for (let i = 0; i < rows.length; i++) {
            const card = cards.nth(i); const text = await card.innerText();
            for (const value of [rows[i].type, rows[i].name, 'Date', 'Purchase amount', 'QL Points', 'Completed']) assert.ok(text.includes(value), value);
            const layout = await card.evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth, left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right, viewport: innerWidth }));
            assert.ok(layout.scroll <= layout.width && layout.left >= 0 && layout.right <= width, JSON.stringify(layout));
            const minimumFont = await card.evaluate(el => Math.min(...Array.from(el.querySelectorAll('dt,dd')).map(n => parseFloat(getComputedStyle(n).fontSize)))); assert.ok(minimumFont >= 14);
          }
          assert.match(await cards.nth(0).innerText(), /1 250 000 ₸/); assert.match(await cards.nth(0).innerText(), /\+62 500 QL Points/);
          assert.match(await cards.nth(1).innerText(), /−100 QL Points/); assert.equal(await cards.nth(1).getByText('Employee', { exact: true }).count(), 0);
          assert.match(await cards.nth(2).innerText(), /\+125 000 000 000 QL Points/);
          assert.match(await cards.nth(3).innerText(), /−250 QL Points/); assert.match(await cards.nth(4).innerText(), /\+250 QL Points/);
          assert.match(await cards.nth(4).innerText(), /123\.45 ₸/); assert.match(await cards.nth(5).innerText(), /−10 QL Points/);
          assert.match(await cards.nth(6).innerText(), /\n0 QL Points/);
          const contrasts = await cards.nth(0).evaluate(el => {
            const rgb = s => s.match(/[\d.]+/g).slice(0,3).map(Number);
            const luminance = c => c.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((a,v,i) => a + v * [.2126,.7152,.0722][i], 0);
            const bg = luminance(rgb(getComputedStyle(el).backgroundColor));
            return Array.from(el.querySelectorAll('dt,dd')).map(n => { const fg = luminance(rgb(getComputedStyle(n).color)); return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05); });
          });
          assert.ok(Math.min(...contrasts) >= 4.5, JSON.stringify(contrasts));
          const debitContrast = await cards.nth(1).evaluate(el => {
            const lum = s => s.match(/[\d.]+/g).slice(0,3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4).reduce((a,v,i) => a+v*[.2126,.7152,.0722][i],0);
            const fg=lum(getComputedStyle(el.querySelectorAll('dd')[4]).color), bg=lum(getComputedStyle(el).backgroundColor); return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);
          }); assert.ok(debitContrast >= 4.5);
        } else {
          assert.equal(await table.getByRole('columnheader').count(), 7); assert.equal(await table.locator('tbody tr').count(), rows.length);
          assert.match(await table.innerText(), /1250000\.00 KZT/); assert.match(await table.innerText(), /\+62500/);
          await table.evaluate(el => { el.parentElement.scrollLeft = el.parentElement.scrollWidth; });
          assert.ok(await table.getByRole('columnheader', { name: 'Status', exact: true }).isVisible());
          await table.evaluate(el => { el.parentElement.scrollLeft = 0; });
        }
        await page.screenshot({ path: path.join(out, `${route.startsWith('/customers') ? 'customer' : 'transactions'}-${width}.png`), fullPage: true });
        fs.writeFileSync(path.join(out, `${route.startsWith('/customers') ? 'customer' : 'transactions'}-${width}-aria.txt`), snapshot);
        const nav = page.getByRole('navigation', { name: 'Transaction history pages' });
        await nav.getByRole('button', { name: 'Next', exact: true }).focus();
        assert.ok(await nav.getByRole('button', { name: 'Next', exact: true }).evaluate(el => parseFloat(getComputedStyle(el).outlineWidth) >= 3));
        await page.keyboard.press('Enter'); await nav.getByText('Page 2 · 21 transactions', { exact: true }).waitFor();
        await nav.getByRole('button', { name: 'Previous', exact: true }).focus();
        await page.keyboard.press('Enter'); await nav.getByText('Page 1 · 21 transactions', { exact: true }).waitFor();
        results.push({ route, width, view: mobile ? 'cards' : 'table', passed: true, keyboardPagination: true, duplicateAccessibleContent: false });
      }
    }
    await page.setViewportSize({ width: 767, height: 900 });
    await page.getByRole('list', { name: 'Transaction history', exact: true }).waitFor();
    assert.equal(await page.locator('table[aria-label="Transaction history"]').count(), 0);
    await page.setViewportSize({ width: 768, height: 900 });
    await page.getByRole('table', { name: 'Transaction history', exact: true }).waitFor();
    assert.equal(await page.locator('ul[aria-label="Transaction history"]').count(), 0);
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ passed: true, results, errors, dataSource: 'Synthetic HTTP response fixtures on the real production UI; not database or auth validation.', accessibility: 'Semantic list/dl/time or table/column headers, one representation in DOM, Chromium ARIA snapshots, keyboard pagination, mobile text contrast >=4.5:1. No manual screen reader/device audit.' }, null, 2));
    console.log('PASS: mobile history cards and desktop tables on both routes at 320/390/768/1440; long names, large amounts, signs, null fields, contrast, keyboard pagination, single accessibility representation.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });



