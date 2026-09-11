// Starts the built Next server directly, deliberately bypassing npm start.
const {spawn}=require('node:child_process'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const frontend=path.resolve(__dirname,'../frontend');
async function check(key,port){
 const env={...process.env,NODE_ENV:'production'};delete env[key];delete env.NODE_OPTIONS;
 const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{cwd:frontend,env,windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
 try{
  let result;
  for(let i=0;i<100;i++){
   try{result=await fetch(`http://127.0.0.1:${port}/api/health`);break}catch(error){if(child.exitCode!==null)break;if(i===99)throw error;await new Promise(r=>setTimeout(r,100));}
  }
  if(!result){assert.notEqual(child.exitCode,0);assert.match(output,/configuration error/);return {key,mode:'startup refused'};}
  assert.equal(result.status,503);const body=await result.json();assert.deepEqual(Object.keys(body).sort(),['database','status','timestamp','version']);assert.equal(body.version,'0.4.1');
  const auth=await fetch(`http://127.0.0.1:${port}/api/auth/login`,{method:'POST',headers:{'content-type':'application/json',origin:process.env.NEXT_PUBLIC_APP_URL},body:JSON.stringify({email:'fixture@example.test',password:'Synthetic-Runtime-Password!'})});
  assert.equal(auth.status,500);const text=await auth.text();assert.ok(!text.includes(key));assert.ok(!text.includes('configuration error'));
  return {key,mode:'runtime safe failure',healthStatus:503,authStatus:500};
 }finally{child.kill();await new Promise(r=>child.once('exit',r));}
}
(async()=>{const checks=[];for(const [i,key] of ['AUTH_SECRET','DATABASE_URL','RATE_LIMIT_SECRET'].entries())checks.push(await check(key,3460+i));fs.writeFileSync(path.join(__dirname,'v041/runtime-env.json'),JSON.stringify({version:'0.4.1',timestamp:new Date().toISOString(),passed:true,checks},null,2));console.log('PASS: direct Next production runtime missing secrets fails safely');})().catch(e=>{console.error(e);process.exitCode=1;});
