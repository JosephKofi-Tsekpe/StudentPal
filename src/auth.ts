import {betterAuth,type BetterAuthOptions} from 'better-auth';
import {toNodeHandler,fromNodeHeaders} from 'better-auth/node';
import type {IncomingMessage,ServerResponse} from 'node:http';
export type SignedInUser={id:string;name:string;email:string};
export interface AuthService {
 handle(req:IncomingMessage,res:ServerResponse):Promise<void>;
 getUser(req:IncomingMessage):Promise<SignedInUser|null>;
}
export function createAuth(database:BetterAuthOptions['database'],baseURL:string,secret:string):AuthService{
 if(secret.length<32)throw Error('BETTER_AUTH_SECRET must be at least 32 characters.');
 const auth=betterAuth({database,baseURL,secret,
  emailAndPassword:{enabled:true,minPasswordLength:12,maxPasswordLength:128},
  session:{expiresIn:60*60*24*7,updateAge:60*60*24},
  rateLimit:{enabled:true,window:60,max:100},
  advanced:{useSecureCookies:new URL(baseURL).protocol==='https:',ipAddress:{ipAddressHeaders:['x-studentpal-client-ip']}},
 });
 const handler=toNodeHandler(auth);
 return {async handle(req,res){req.headers['x-studentpal-client-ip']=req.socket.remoteAddress||'127.0.0.1';await handler(req,res);},async getUser(req){const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});return session?{id:session.user.id,name:session.user.name,email:session.user.email}:null;}};
}
