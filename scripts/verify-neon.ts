import '../src/env.ts';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
import {createApp} from '../src/server.ts';
import {createStorage} from '../src/storage.ts';
// Real network checks; no mocks. Only this script's generated record is deleted.
const services=createStorage();
let app:Awaited<ReturnType<typeof createApp>>|undefined;
let id:string|undefined;
let base='';
const auth:Record<string,string>=process.env.STAGING_PASSWORD?{Authorization:'Basic '+Buffer.from(`${process.env.STAGING_USERNAME||'studentpal'}:${process.env.STAGING_PASSWORD}`).toString('base64')}:{};
async function start(){app=await createApp(services);await new Promise<void>(resolve=>app!.server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+(app.server.address() as {port:number}).port;}
async function post(route:string,body:unknown){const r=await fetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json',...auth},body:JSON.stringify(body)});const result=await r.json();assert.equal(r.status,200,`App ${route} failed`);return result;}
try{
 await start();assert.equal((await fetch(base+'/healthz')).status,200);console.log('PASS app HTTP health check');
 const pdf=await PDFDocument.create();pdf.addPage().drawText('StudentPal Neon end-to-end storage verification');const bytes=await pdf.save();
 const course=await post('upload',{name:'Neon verification '+new Date().toISOString(),file:Buffer.from(bytes).toString('base64')});id=course.id;
 assert.equal((await services.courses.get(id!))?.pages,1);console.log('PASS app upload -> Neon Postgres record');
 const stored=await services.objects.get(id+'.pdf');const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');assert.equal(hash(stored),hash(bytes));console.log('PASS app upload -> Neon Object Storage -> byte-identical download');
 await post('plan',{id,topic:'Neon verification',dates:['2030-01-03','2030-01-08']});
 await new Promise<void>(resolve=>app!.server.close(()=>resolve()));await start();
 const response=await fetch(base+'/api/courses',{headers:auth});assert.equal(response.status,200);const listed=await response.json();assert.equal(listed.courses.find((c:{id:string})=>c.id===id)?.plan.length,2);console.log('PASS saved course and dates survive app restart');
 await post('delete',{id});assert.equal(await services.courses.get(id!),undefined);let missing=false;try{await services.objects.get(id+'.pdf');}catch(e){missing=(e as {name?:string}).name==='NoSuchKey'||(e as {$metadata?:{httpStatusCode?:number}}).$metadata?.httpStatusCode===404;}assert.ok(missing,'Deleted object must return not found');id=undefined;console.log('PASS app deletion removes database record and stored PDF');
}finally{
 if(id){await services.objects.delete(id+'.pdf').catch(()=>{});await services.courses.delete(id).catch(()=>{});}
 if(app)await new Promise<void>(resolve=>app!.server.close(()=>resolve()));await services.courses.close();
}
