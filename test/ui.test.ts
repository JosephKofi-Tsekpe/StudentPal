import {test} from 'node:test';import assert from 'node:assert/strict';import {JSDOM,CookieJar} from 'jsdom';import {createApp} from '../src/server.ts';import {memoryStorage} from './storage-fixture.ts';
test('signup/signin page controls complete the account flow and restore a session',async()=>{
 const old={...process.env};delete process.env.RENDER_EXTERNAL_HOSTNAME;
 const app=await createApp(memoryStorage());await new Promise<void>(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${(app.server.address() as {port:number}).port}`;
 const jar=new CookieJar();let dom:JSDOM|undefined;
 const html=await (await fetch(base)).text();
 const open=()=>new JSDOM(html,{url:base,runScripts:'dangerously',cookieJar:jar,beforeParse(window){window.fetch=async(input:unknown,init?:RequestInit)=>{const url=new URL(String(input),base).toString();const headers=new Headers(init?.headers);const cookie=await jar.getCookieString(url);if(cookie)headers.set('Cookie',cookie);if(init?.method==='POST')headers.set('Origin',base);const r=await fetch(url,{...init,headers});for(const c of r.headers.getSetCookie())await jar.setCookie(c,url);return r;};}});
 async function until(fn:()=>boolean){for(let i=0;i<200;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('UI state did not appear: '+dom?.window.document.body.textContent);}
 function fill(id:string,value:string){(dom!.window.document.querySelector(id) as HTMLInputElement).value=value;}
 function submit(){dom!.window.document.querySelector('form')!.dispatchEvent(new dom!.window.Event('submit',{bubbles:true,cancelable:true}));}
 try{
  dom=open();await until(()=>!!dom!.window.document.querySelector('#auth-confirm'));
  fill('#auth-name','Student');fill('#auth-email','ui@example.test');fill('#auth-password','Long test password 123');fill('#auth-confirm','Mismatched test password');submit();await until(()=>dom!.window.document.querySelector('#auth-error')?.textContent==='Your passwords do not match.');
  fill('#auth-confirm','Long test password 123');submit();await until(()=>!dom!.window.document.body.classList.contains('signed-out'));assert.equal(dom.window.document.querySelector('#account-name')?.textContent,'Student');
  dom.window.close();dom=open();await until(()=>!dom!.window.document.body.classList.contains('signed-out'));
  await dom.window.eval('signOut()');await until(()=>!!dom!.window.document.querySelector('#auth-email'));assert.match(dom.window.document.querySelector('#auth-inner')!.textContent!,/Welcome back/);
  fill('#auth-email','ui@example.test');fill('#auth-password','Long test password 123');submit();await until(()=>!dom!.window.document.body.classList.contains('signed-out'));
 }finally{dom?.window.close();await new Promise<void>(r=>app.server.close(()=>r()));await app.close();process.env=old;}
});
