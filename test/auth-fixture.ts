import {memoryAdapter} from 'better-auth/adapters/memory';
import {createAuth,type AuthService} from '../src/auth.ts';
// Real Better Auth handlers and password/session logic, test-only memory database.
export function testAuth():AuthService{
 const database=memoryAdapter({user:[],session:[],account:[],verification:[]});
 let instance:AuthService|undefined;
 const forRequest=(req:import('node:http').IncomingMessage)=>instance??=createAuth(database,'http://'+req.headers.host,'test-only-secret-at-least-32-characters-long');
 return {handle:(req,res)=>forRequest(req).handle(req,res),getUser:req=>forRequest(req).getUser(req)};
}
export async function signup(base:string,email='tester@example.test'){
 const r=await fetch(base+'/api/auth/sign-up/email',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({email,password:'A test password with 12+ chars!',name:'Test Student'})});
 if(!r.ok)throw Error('Signup failed: '+await r.text());
 return {cookie:r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),user:(await r.json()).user};
}
