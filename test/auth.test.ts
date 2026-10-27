import {test} from 'node:test';import assert from 'node:assert/strict';
import {createApp} from '../src/server.ts';import {memoryStorage} from './storage-fixture.ts';import {signup} from './auth-fixture.ts';import {PDFDocument} from 'pdf-lib';
test('signup, signin, durable sessions, logout and strict course ownership',async()=>{
 const old={...process.env};delete process.env.RENDER_EXTERNAL_HOSTNAME;delete process.env.BETTER_AUTH_URL;
 const services=memoryStorage();let app=await createApp(services);let base='';
 async function listen(){await new Promise<void>(r=>app.server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${(app.server.address() as {port:number}).port}`;}
 await listen();
 const post=async(route:string,body:unknown,cookie='')=>{const r=await fetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie,Origin:base},body:JSON.stringify(body)});return {response:r,body:await r.json()};};
 try{
  const page=await fetch(base);assert.equal(page.status,200);assert.equal(page.headers.get('www-authenticate'),null);
  assert.equal((await fetch(base+'/api/courses')).status,401);
  const weak=await post('auth/sign-up/email',{name:'Weak',email:'weak@example.test',password:'short'});assert.equal(weak.response.status,400);
  const alice=await signup(base,'alice@example.test');const bob=await signup(base,'bob@example.test');
  assert.match(alice.cookie,/session_token/);const session=await fetch(base+'/api/session',{headers:{Cookie:alice.cookie}});const info=await session.json();assert.equal(info.user.id,alice.user.id);assert.equal(info.user.password,undefined);
  const duplicate=await post('auth/sign-up/email',{name:'Duplicate',email:'alice@example.test',password:'Another long password!'});assert.ok(duplicate.response.status>=400);
  const wrong=await post('auth/sign-in/email',{email:'alice@example.test',password:'Definitely wrong password'});assert.equal(wrong.response.status,401);
  const pdf=await PDFDocument.create();pdf.addPage();const upload=await post('upload',{name:'Alice private course',file:Buffer.from(await pdf.save()).toString('base64'),ownerId:bob.user.id},alice.cookie);assert.equal(upload.response.status,200);const id=upload.body.id;assert.equal((await services.courses.get(id))?.ownerId,alice.user.id);
  const bobList=await (await fetch(base+'/api/courses',{headers:{Cookie:bob.cookie}})).json();assert.equal(bobList.courses.length,0);
  for(const route of ['plan','delete','read','lesson','quiz','submit','done']){const denied=await post(route,{id,topic:'Private',dates:['2030-01-01'],index:0},bob.cookie);assert.equal(denied.body.error,'Course not found.');}
  await services.courses.save({id:'legacy',name:'Old shared course',pages:1,status:'uploaded',progress:0,content:'',plan:[],attempts:[]});
  const aliceList=await (await fetch(base+'/api/courses',{headers:{Cookie:alice.cookie}})).json();assert.equal(aliceList.courses.length,1);
  const out=await post('auth/sign-out',{},alice.cookie);assert.equal(out.response.status,200);assert.equal((await fetch(base+'/api/courses',{headers:{Cookie:alice.cookie}})).status,401);
  const login=await post('auth/sign-in/email',{email:'alice@example.test',password:'A test password with 12+ chars!'});assert.equal(login.response.status,200);assert.ok(login.response.headers.getSetCookie().some(c=>/HttpOnly/i.test(c)&&/SameSite=Lax/i.test(c)));
  const cookie=login.response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
  await new Promise<void>(r=>app.server.close(()=>r()));app=await createApp(services);await listen();
  assert.equal((await fetch(base+'/api/courses',{headers:{Cookie:cookie}})).status,200);
  const forged=await fetch(base+'/api/auth/sign-out',{method:'POST',headers:{Origin:'https://attacker.example',Cookie:cookie,'Content-Type':'application/json'},body:'{}'});assert.equal(forged.status,403);
 }finally{await new Promise<void>(r=>app.server.close(()=>r()));await app.close();process.env=old;}
});
