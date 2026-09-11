const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const base = process.env.QA_BASE_URL || 'http://localhost:3107';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('This automated account-creation test is restricted to localhost');
const password = 'Browser-Test-Password-2026!';
const email = `browser-${randomUUID()}@example.test`;
const api = (page, endpoint, method = 'GET', body) => page.evaluate(async ({ endpoint, method, body }) => {
  const r = await fetch(`/api/${endpoint}`, { method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  return { status: r.status, body: await r.json() };
}, { endpoint, method, body });
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: process.env.QA_ALLOW_SELF_SIGNED === 'true' }); const page = await context.newPage();
  const pageErrors = []; const consoleErrors = []; const results = [];
  page.on('pageerror', e => pageErrors.push(e.message)); page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  const out = path.join(__dirname, 'v041/persistent'); fs.mkdirSync(out, { recursive: true });
  try {
    await page.goto(base + '/register');
    await page.getByLabel('Email', { exact: true }).fill(email); await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Create account', exact: true }).click(); await page.waitForURL('**/onboarding');
    await page.getByLabel('Business name').fill('Qaz Coffee'); await page.getByLabel('Reward percentage').fill('5'); await page.getByLabel('Customer name', { exact: true }).fill('Ayan');
    await page.getByRole('button', { name: 'Create business and customer' }).click(); await page.waitForURL('**/customers/**');
    const customerUrl = page.url(); const id = new URL(customerUrl).pathname.split('/').pop(); const businessId = new URL(customerUrl).searchParams.get('businessId');
    await page.getByTestId('persistent-balance').filter({ hasText: '0 QL Points' }).waitFor();
    await page.getByRole('button', { name: 'Confirm reward', exact: true }).click(); await page.getByTestId('persistent-balance').filter({ hasText: '500 QL Points' }).waitFor();
    await page.reload(); await page.getByTestId('persistent-balance').filter({ hasText: '500 QL Points' }).waitFor();
    await page.getByLabel('QL Points to redeem').fill('800'); await page.getByRole('button', { name: 'Confirm redemption' }).click(); await page.getByRole('status').filter({ hasText: 'Insufficient points' }).waitFor();
    await page.getByLabel('QL Points to redeem').fill('100'); await page.getByRole('button', { name: 'Confirm redemption' }).click(); await page.getByTestId('persistent-balance').filter({ hasText: '400 QL Points' }).waitFor();
    assert.equal(await page.locator('tbody tr').count(), 2); assert.equal(await page.getByAltText('Customer QR identifier').count(), 1);
    const publicText = await page.locator('.public-id').innerText(); const publicId = publicText.replace('Customer ID: ', '');
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
      assert.ok(dimensions.scroll <= width, JSON.stringify(dimensions));
      await page.screenshot({ path: path.join(out, `customer-${width}.png`), fullPage: true }); results.push({ view: 'customer', ...dimensions });
    }
    await page.getByRole('link', { name: 'Scan / customer ID' }).click(); await page.getByLabel('Customer QR link or ID').fill(publicId); await page.getByRole('button', { name: 'Open customer' }).click(); await page.waitForURL('**/customers/**');
    await page.getByRole('button', { name: 'Sign out' }).click(); await page.waitForURL('**/login');
    assert.equal((await api(page, `businesses/${businessId}/dashboard`)).status, 401);
    await page.getByLabel('Email', { exact: true }).fill(email); await page.getByLabel('Password', { exact: true }).fill(password); await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await page.waitForURL('**/dashboard');
    await page.goto(customerUrl); await page.getByTestId('persistent-balance').filter({ hasText: '400 QL Points' }).waitFor();
    const stats = await api(page, `businesses/${businessId}/dashboard`); assert.equal(stats.body.pointsIssued, '500'); assert.equal(stats.body.pointsRedeemed, '100'); assert.equal(stats.body.revenueTracked, '1000000');
    const csrf = await context.request.post(base + `/api/businesses/${businessId}/rewards`, { headers: { Origin: 'https://untrusted.example' }, data: { type: 'REDEEM', customerId: id, points: '1', idempotencyKey: randomUUID() } }); assert.equal(csrf.status(), 403);
    const attack = await api(page, `businesses/${businessId}`, 'PATCH', { name: 'Qaz Coffee', rewardRateBps: 500, ownerId: randomUUID() }); assert.equal(attack.status, 400);
    const otherContext = await browser.newContext({ ignoreHTTPSErrors: process.env.QA_ALLOW_SELF_SIGNED === 'true' }); const otherPage = await otherContext.newPage(); await otherPage.goto(base + '/register');
    const reg = await api(otherPage, 'auth/register', 'POST', { email: `other-${randomUUID()}@example.test`, password }); assert.equal(reg.status, 201);
    const other = await api(otherPage, 'businesses', 'POST', { business: { name: 'Other Business', currency: 'KZT', rewardRateBps: 500 }, customer: { name: 'Other Customer' } }); assert.equal(other.status, 201);
    for (const endpoint of [`businesses/${businessId}/customers/${id}`, `businesses/${businessId}/dashboard`, `businesses/${businessId}/transactions`]) assert.equal((await api(otherPage, endpoint)).status, 404);
    assert.equal((await api(otherPage, `businesses/${other.body.id}/scan?code=${publicId}`)).status, 404);
    for (const type of ['EARN', 'REDEEM']) {
      const body = { type, customerId: id, idempotencyKey: randomUUID(), ...(type === 'EARN' ? { purchaseAmount: '10000' } : { points: '1' }) };
      for (const target of [businessId, other.body.id]) assert.equal((await api(otherPage, `businesses/${target}/rewards`, 'POST', body)).status, 404);
    }
    await otherContext.close();
    const unchanged = await api(page, `businesses/${businessId}/dashboard`);
    assert.equal(unchanged.body.pointsIssued, '500'); assert.equal(unchanged.body.pointsRedeemed, '100');
    const fixture = await api(page, `businesses/${businessId}/customers`, 'POST', { name: 'Idempotency fixture' }); assert.equal(fixture.status, 201);
    for (const type of ['EARN', 'REDEEM']) {
      const body = { type, customerId: fixture.body.customerId, idempotencyKey: randomUUID(), ...(type === 'EARN' ? { purchaseAmount: '10000' } : { points: '500' }) };
      const responses = await Promise.all([api(page, `businesses/${businessId}/rewards`, 'POST', body), api(page, `businesses/${businessId}/rewards`, 'POST', body)]);
      for (const r of responses) assert.equal(r.status, 200, JSON.stringify(r));
      assert.equal(responses[0].body.transaction.id, responses[1].body.transaction.id);
      const replay = await api(page, `businesses/${businessId}/rewards`, 'POST', body);
      assert.equal(replay.status, 200); assert.equal(replay.body.transaction.id, responses[0].body.transaction.id); assert.equal(replay.body.replayed, true);
      const conflict = await api(page, `businesses/${businessId}/rewards`, 'POST', { ...body, ...(type === 'EARN' ? { purchaseAmount: '20000' } : { points: '1' }) }); assert.equal(conflict.status, 409);
      const member = await api(page, `businesses/${businessId}/customers/${fixture.body.customerId}`); assert.equal(member.status, 200); assert.equal(member.body.pointsBalance, type === 'EARN' ? '500' : '0');
    }
    const ledger = await api(page, `businesses/${businessId}/transactions`); assert.equal(ledger.body.total, 4);
    await page.goto(base + `/dashboard?businessId=${businessId}`); await page.getByRole('link', { name: 'Ayan →' }).waitFor();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 }); const scroll = await page.evaluate(() => document.documentElement.scrollWidth); assert.ok(scroll <= width); await page.screenshot({ path: path.join(out, `dashboard-${width}.png`), fullPage: true }); results.push({ view: 'dashboard', width, scroll });
    }
    assert.deepEqual(pageErrors, []);
    const unexpectedConsole = consoleErrors.filter(s => !/Failed to load resource:.*\b(400|401|403|404|409)\b/.test(s)); assert.deepEqual(unexpectedConsole, []);
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ passed: true, results, scenarios: ['registration', 'onboarding Qaz Coffee / Ayan', 'earn 500', 'reload persists', 'reject insufficient 800', 'redeem 100', 'history has two operations', 'QR/manual lookup', 'logout/login persists 400', 'real analytics', 'CSRF rejected', 'mass assignment rejected', 'HTTP tenant isolation'], pageErrors, expectedConsoleResponses: consoleErrors, unexpectedConsole, limits: 'Local Chromium, isolated PostgreSQL. No real personal data, mobile hardware or blockchain transactions.' }, null, 2));
    fs.writeFileSync(path.join(out, 'http-hardening.json'), JSON.stringify({ passed: true, crossTenantEarn: 404, crossTenantRedeem: 404, foreignCustomerEarn: 404, foreignCustomerRedeem: 404, concurrentEarn: 'one ledger entry', concurrentRedeem: 'one ledger entry', replayAfterExhaustedBalance: 200, changedPayloadSameKey: 409, totalLedgerEntries: ledger.body.total }, null, 2));
    console.log('PASS: persistent MVP, HTTP tenant read/write isolation, concurrent EARN/REDEEM idempotency and responsive layouts');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });

