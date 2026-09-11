// Test-only mail provider double. Never load for a real deployment.
const fs = require('node:fs');
const realFetch = globalThis.fetch;
globalThis.fetch = async function(input, init) {
  if(String(input) !== 'https://api.resend.com/emails') return realFetch(input, init);
  const app = new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://invalid');
  const db = new URL(process.env.DATABASE_URL || 'postgresql://invalid');
  if (!['localhost','127.0.0.1'].includes(app.hostname) || !['localhost','127.0.0.1'].includes(db.hostname) || !db.pathname.endsWith('_dev') || process.env.EMAIL_API_KEY !== 'qa-local-capture-no-real-provider-key' || !process.env.QA_OUTBOX_FILE) throw Error('Mail capture is restricted to explicit local QA');
  const message=JSON.parse(init.body);
  if(!message.to.every(email => email.endsWith('@example.test'))) throw Error('Synthetic recipients only');
  fs.appendFileSync(process.env.QA_OUTBOX_FILE, JSON.stringify(message)+'\n');
  return new Response(JSON.stringify({ id:'local-qa-mail' }),{status:200,headers:{'Content-Type':'application/json'}});
};
