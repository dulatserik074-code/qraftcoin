const assert = require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), {randomUUID}=require('node:crypto');
const base=process.env.QA_INTERNAL_URL;
if(!base || new URL(base).hostname!=='127.0.0.1') throw Error('Explicit loopback test server required');
const password='Synthetic-HTTP-Password-2026!';
const email=()=>`http-${randomUUID()}@example.test`;
const post=async(action,body,ip)=>{
 const r=await fetch(base+'/api/'+action,{method:'POST',headers:{'Content-Type':'application/json',Origin:process.env.NEXT_PUBLIC_APP_URL,'X-Real-IP':ip,'X-Forwarded-For':`198.51.100.${Math.floor(Math.random()*200)}`},body:JSON.stringify(body)});
 return {status:r.status,body:await r.json(),retry:r.headers.get('retry-after')};
};
(async()=>{
 const scope='2001:db8:'+randomUUID().replaceAll('-','').slice(0,20).match(/.{4}/g).join(':'); const ipA=scope+':1',ipB=scope+':2',account=email();
 assert.equal((await post('auth/register',{email:account,password},ipB)).status,201);
 for(let i=0;i<60;i++) assert.equal((await post('auth/login',{email:email(),password:'short'},ipA)).status,400);
 const blocked=await post('auth/login',{email:account,password},ipA);
 assert.equal(blocked.status,429);assert.ok(Number(blocked.retry)>0&&Number(blocked.retry)<=300);
 assert.deepEqual(blocked.body,{error:'Too many attempts. Please try again later.'});
 assert.equal((await post('auth/login',{email:account,password},ipB)).status,200);
 const bad=email();for(let i=0;i<10;i++)assert.equal((await post('auth/login',{email:bad,password},ipB)).status,401);
 assert.equal((await post('auth/login',{email:` ${bad.toUpperCase()} `,password},ipB)).status,429);
 assert.equal((await post('auth/login',{email:account,password},ipB)).status,200);
 const unknown=email(),times=[];
 for(let i=0;i<5;i++)for(const target of [account,unknown]){
  const start=performance.now(),r=await post('auth/forgot-password',{email:target},ipB);times.push({known:target===account,ms:Math.round(performance.now()-start)});
  assert.equal(r.status,200);assert.deepEqual(r.body,{message:'If an account exists for this email, password reset instructions have been sent.'});
 }
 const resetKnown=await post('auth/forgot-password',{email:account},ipB),resetUnknown=await post('auth/forgot-password',{email:unknown},ipB);
 for(const r of [resetKnown,resetUnknown]){assert.equal(r.status,429);assert.ok(Number(r.retry)>0);assert.deepEqual(r.body,blocked.body);}
 for(let i=0;i<20;i++)assert.equal((await post('auth/register',{email:email(),password:'short'},scope+':3')).status,400);
 assert.equal((await post('auth/register',{email:email(),password},scope+':3')).status,429);
 assert.equal((await post('auth/register',{email:email(),password},scope+':4')).status,201);
 const health=await fetch(base+'/api/health');assert.equal(health.status,200);const data=await health.json();assert.equal(data.version,'0.4.1');assert.deepEqual(Object.keys(data).sort(),['database','status','timestamp','version']);
 for(const key of ['content-security-policy','permissions-policy','referrer-policy','x-content-type-options','strict-transport-security'])assert.ok(health.headers.get(key),key);
 assert.ok(!health.headers.get('content-security-policy').includes('unsafe-eval'));
 const result={version:'0.4.1',timestamp:new Date().toISOString(),passed:true,scenarios:['HTTP IP isolation and spoofed XFF ignored','normalized account isolation','registration IP isolation','reset enumeration and identical limits','429 Retry-After','safe health and production security headers'],resetTimings:times};
 fs.writeFileSync(path.join(__dirname,'v041/security-http.json'),JSON.stringify(result,null,2));console.log('PASS: HTTP security and rate limit isolation');
})().catch(e=>{console.error(e);process.exitCode=1;});

