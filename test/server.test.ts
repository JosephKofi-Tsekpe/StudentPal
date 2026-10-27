import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';import {PDFDocument} from 'pdf-lib';import {createApp} from '../src/server.ts';
test('PDF upload, calendar persistence, key failure, deletion and isolation from cross-site requests',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'studentpal-'));const app=await createApp(directory);await new Promise<void>(r=>app.server.listen(0,'127.0.0.1',r));const address=app.server.address() as {port:number};const base=`http://127.0.0.1:${address.port}`;
 const post=async(route:string,body:unknown)=>{const r=await fetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
 try{
  assert.equal((await fetch(base)).status,200);const doc=await PDFDocument.create();doc.addPage();const uploaded=await post('upload',{name:'Accounting',file:Buffer.from(await doc.save()).toString('base64')});assert.equal(uploaded.status,200);const id=uploaded.body.id;
  const old=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;assert.equal((await post('read',{id})).status,400);if(old)process.env.OPENAI_API_KEY=old;
  assert.equal((await post('plan',{id,topic:'Assets',dates:['2026-11-02','2026-11-05']})).body.plan.length,2);assert.equal((await post('plan',{id,topic:'Assets',dates:['2026-02-30']})).status,400);
  assert.equal((await fetch(base+'/api/courses')).status,200);assert.equal((await fetch(base+'/api/courses',{headers:{Origin:'https://example.com'}})).status,403);
  assert.equal((await post('delete',{id})).status,200);assert.equal((await post('upload',{name:'Bad',file:Buffer.from('not a pdf').toString('base64')})).status,400);
 }finally{await new Promise<void>(r=>app.server.close(()=>r()));app.close();await rm(directory,{recursive:true,force:true});}
});
