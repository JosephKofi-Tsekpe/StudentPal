import {signup} from './auth-fixture.ts';
import {request} from 'node:http';
import {test} from 'node:test';import assert from 'node:assert/strict';import {memoryStorage} from './storage-fixture.ts';import {PDFDocument} from 'pdf-lib';import {createApp} from '../src/server.ts';
test('PDF upload, calendar persistence, key failure, deletion and isolation from cross-site requests',async()=>{
 const savedEnv={...process.env};delete process.env.STAGING_PASSWORD;delete process.env.STAGING_USERNAME;delete process.env.RENDER_EXTERNAL_HOSTNAME;
 const services=memoryStorage();const app=await createApp(services);await new Promise<void>(r=>app.server.listen(0,'127.0.0.1',r));const address=app.server.address() as {port:number};const base=`http://127.0.0.1:${address.port}`;
 const {cookie}=await signup(base);
 const post=async(route:string,body:unknown)=>{const r=await fetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
 try{
  assert.equal((await fetch(base)).status,200);const doc=await PDFDocument.create();doc.addPage();const uploaded=await post('upload',{name:'Accounting',file:Buffer.from(await doc.save()).toString('base64')});assert.equal(uploaded.status,200);const id=uploaded.body.id;
  const old=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;assert.equal((await post('read',{id})).status,400);if(old)process.env.OPENAI_API_KEY=old;
  assert.equal((await post('plan',{id,topic:'Assets',dates:['2026-11-02','2026-11-05']})).body.plan.length,2);assert.equal((await post('plan',{id,topic:'Assets',dates:['2026-02-30']})).status,400);
  assert.equal((await fetch(base+'/api/courses',{headers:{Cookie:cookie}})).status,200);assert.equal((await fetch(base+'/api/courses',{headers:{Origin:'https://example.com'}})).status,403);
  assert.equal((await post('delete',{id})).status,200);assert.equal((await post('upload',{name:'Bad',file:Buffer.from('not a pdf').toString('base64')})).status,400);
 }finally{await new Promise<void>(r=>app.server.close(()=>r()));await app.close();process.env=savedEnv;}
});

test('Render serves signup without Basic Auth and keeps API private',async()=>{
 const old={...process.env};process.env.RENDER_EXTERNAL_HOSTNAME='studentpal-staging.onrender.com';process.env.STAGING_PASSWORD='obsolete-password';
 const services=memoryStorage();const app=await createApp(services);await new Promise<void>(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${(app.server.address() as {port:number}).port}`;
 try{
  assert.equal((await fetch(base+'/healthz')).status,200);
  const page=await fetch(base+'/signup');assert.equal(page.status,200);assert.equal(page.headers.get('www-authenticate'),null);assert.match(await page.text(),/Create your account/);
  assert.equal((await fetch(base+'/api/courses')).status,401);
  const hosted=(origin:string)=>new Promise<number>((resolve,reject)=>{const r=request(base+'/api/courses',{headers:{Host:'studentpal-staging.onrender.com',Origin:origin}},res=>{res.resume();resolve(res.statusCode!);});r.on('error',reject);r.end();});
  assert.equal(await hosted('https://studentpal-staging.onrender.com'),401);assert.equal(await hosted('https://untrusted.example'),403);
 }finally{await new Promise<void>(r=>app.server.close(()=>r()));await app.close();process.env=old;}
});
