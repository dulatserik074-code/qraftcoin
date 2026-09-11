const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const out=path.join(__dirname,'v041/demo');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({ignoreHTTPSErrors:process.env.QA_ALLOW_SELF_SIGNED==='true'});const errors=[];const failures=[];const results=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('requestfailed',r=>failures.push(r.url()+': '+r.failure()?.errorText));
 page.on('response',r=>{if(r.status()>=400)failures.push(r.status()+' '+r.url())});
 try {
 for(const width of [320,390,768,1440]) {
  await page.setViewportSize({width,height:900});
  for(const route of ['/','/demo','/legacy-qfc']) {
   const response=await page.goto((process.env.QA_BASE_URL || 'http://127.0.0.1:3107')+route);assert.equal(response.status(),200);await page.waitForLoadState('networkidle');
   const layout=await page.evaluate(()=>({viewport:document.querySelector('meta[name="viewport"]')?.content,width:innerWidth,scroll:document.documentElement.scrollWidth}));
   assert.match(layout.viewport,/width=device-width/);assert.ok(layout.scroll<=layout.width,JSON.stringify({route,width,...layout}));
   await page.screenshot({path:path.join(out,`${route==='/'?'home':route.slice(1)}-${width}.png`),fullPage:true});
   results.push({route,width,...layout});
  }
 }
 await page.goto((process.env.QA_BASE_URL || 'http://127.0.0.1:3107')+'/');await page.getByRole('link',{name:'Try the rewards demo'}).click();await page.waitForURL('**/demo');
 await page.getByRole('button',{name:'Issue reward',exact:true}).click();await page.getByRole('heading',{name:'500 QL Points',exact:true}).waitFor();
 await page.getByLabel('Points to redeem').fill('800');await page.getByRole('button',{name:'Redeem points',exact:true}).click();assert.equal(await page.getByRole('status').innerText(),'Insufficient points');
 await page.getByLabel('Points to redeem').fill('100');await page.getByRole('button',{name:'Redeem points',exact:true}).click();await page.getByRole('heading',{name:'400 QL Points',exact:true}).waitFor();
 assert.equal(await page.locator('tbody tr').count(),2);
 for(const invalid of ['', '-1', 'abc', '1.001']) {
  await page.getByLabel('Purchase amount').fill(invalid);await page.getByRole('button',{name:'Issue reward',exact:true}).click();assert.match(await page.getByRole('status').innerText(),/Enter a purchase/);assert.equal(await page.locator('tbody tr').count(),2);
 }
 await page.getByLabel('Purchase amount').fill('1');await page.getByRole('button',{name:'Issue reward',exact:true}).click();assert.match(await page.getByRole('status').innerText(),/earns 0 QL Points/);assert.equal(await page.locator('tbody tr').count(),2);
 await page.getByLabel('Points to redeem').fill('0');await page.getByRole('button',{name:'Redeem points',exact:true}).click();assert.match(await page.getByRole('status').innerText(),/at least 1 QL Point/);assert.equal(await page.locator('tbody tr').count(),2);
 await page.getByLabel('Purchase amount').fill('10000');await page.getByLabel('Reward rate (%)').fill('101');await page.getByRole('button',{name:'Issue reward',exact:true}).click();assert.match(await page.getByRole('status').innerText(),/Invalid reward/);
 await page.getByLabel('Reward rate (%)').fill('5');await page.getByLabel('Currency').selectOption('USD');await page.getByRole('button',{name:'Issue reward',exact:true}).click();await page.getByRole('heading',{name:'900 QL Points',exact:true}).waitFor();
 await page.reload();await page.getByRole('heading',{name:'0 QL Points',exact:true}).waitFor();
 await page.goto((process.env.QA_BASE_URL || 'http://127.0.0.1:3107')+'/tokenomics');assert.match(page.url(),/\/legacy-qfc$/);assert.match(await page.locator('main').innerText(),/integration is disabled/);
 await page.goto((process.env.QA_BASE_URL || 'http://127.0.0.1:3107')+'/');assert.equal(await page.locator('a[href="#"]').count(),0);
 const html=await page.content();fs.writeFileSync(path.join(out,'home-rendered.html'),html);
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({passed:true,results,scenarios:['navigation','earn 500','reject overspend','redeem 100','ledger history','invalid inputs','invalid rate','currency selection','zero reward without ledger entry','zero redemption rejected','session reset','legacy disabled','tokenomics redirect'],consoleErrors:errors,networkFailures:failures,notes:'Chromium headless desktop emulation. No real mobile hardware or MetaMask interaction. This regression script covers the isolated demo; persistent HTTP API is tested separately.'},null,2));
 console.log('PASS: responsive routes, reward scenarios, no console/network errors');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});


