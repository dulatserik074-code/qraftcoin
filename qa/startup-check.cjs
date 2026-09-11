const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
(async()=>{
 const env={...process.env,NODE_ENV:'production'};delete env.AUTH_SECRET;delete env.NODE_OPTIONS;
 const child=spawn(process.execPath,['--experimental-strip-types','scripts/start.mjs','--hostname','127.0.0.1','--port','3108'],{cwd:path.join(__dirname,'../frontend'),env,windowsHide:true,stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
 const timer=setTimeout(()=>child.kill(),30000);
 const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});clearTimeout(timer);
 if(code===null||code===0||!output.includes('AUTH_SECRET')||!output.includes('configuration error'))throw Error('Missing-secret startup guard did not reject as expected');
 fs.writeFileSync(path.join(__dirname,'v041/startup-guard.json'),JSON.stringify({passed:true,timestamp:new Date().toISOString(),missing:'AUTH_SECRET',exitCode:code,message:'Configuration rejected before serving requests; secret values omitted.'},null,2));
 console.log('PASS: production startup rejects missing AUTH_SECRET');
})().catch(e=>{console.error(e);process.exit(1)});

