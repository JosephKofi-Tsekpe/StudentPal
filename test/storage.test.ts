import {signup} from './auth-fixture.ts';
import {test} from 'node:test';import assert from 'node:assert/strict';import {createApp} from '../src/server.ts';import {memoryStorage} from './storage-fixture.ts';import {createStorage} from '../src/storage.ts';
test('restart preserves course data and recovers interrupted reading',async()=>{
 const services=memoryStorage();await services.courses.save({id:'restart',name:'Biology',pages:7,status:'reading',progress:5,content:'Pages 1-5',plan:[],attempts:[]});
 const first=await createApp(services);await first.close();const second=await createApp(services);
 const c=await services.courses.get('restart');assert.equal(c?.status,'error');assert.equal(c?.progress,5);assert.equal(c?.content,'Pages 1-5');await second.close();
});
test('missing cloud configuration fails clearly with no SQLite fallback',()=>{const old=process.env.DATABASE_URL;delete process.env.DATABASE_URL;try{assert.throws(()=>createStorage(),/DATABASE_URL/);}finally{if(old)process.env.DATABASE_URL=old;}});
test('failed database save cleans up uploaded object; failed object deletion preserves course',async()=>{
 const savedEnv={...process.env};delete process.env.STAGING_PASSWORD;delete process.env.RENDER_EXTERNAL_HOSTNAME;
 const services=memoryStorage();const app=await createApp(services);await new Promise<void>(r=>app.server.listen(0,'127.0.0.1',r));const address=app.server.address() as {port:number};const base=`http://127.0.0.1:${address.port}`;
 const {PDFDocument}=await import('pdf-lib');const doc=await PDFDocument.create();doc.addPage();const file=Buffer.from(await doc.save()).toString('base64');
 const {cookie}=await signup(base);
 const post=async(route:string,b:unknown)=>{const r=await fetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(b)});return {status:r.status,body:await r.json()};};
 const originalSave=services.courses.save;let removed=0;const originalDelete=services.objects.delete;services.objects.delete=async k=>{removed++;await originalDelete(k);};
 try{
  services.courses.save=async()=>{throw Error('Database unavailable');};assert.equal((await post('upload',{name:'Failure',file})).status,400);assert.equal(removed,1);
  services.courses.save=originalSave;const c=(await post('upload',{name:'Saved',file})).body;services.objects.delete=async()=>{throw Error('Storage unavailable');};assert.equal((await post('delete',{id:c.id})).status,400);assert.ok(await services.courses.get(c.id));
 }finally{await new Promise<void>(r=>app.server.close(()=>r()));await app.close();process.env=savedEnv;}
});
