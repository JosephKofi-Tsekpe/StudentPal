import {createAuth} from './auth.ts';
import {prismaAdapter} from 'better-auth/adapters/prisma';
import {PrismaClient,Prisma} from './generated/prisma/client.ts';
import {PrismaPg} from '@prisma/adapter-pg';
import {S3Client,PutObjectCommand,GetObjectCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';
import type {Course,Services} from './types.ts';
function required(name:string){const value=process.env[name];if(!value)throw Error(`Missing server environment variable: ${name}`);return value;}
export function createStorage():Services {
 const connectionString=required('DATABASE_URL');
 const endpoint=required('AWS_ENDPOINT_URL_S3');if(new URL(endpoint).protocol!=='https:')throw Error('Object storage must use HTTPS.');
 const bucket=process.env.S3_BUCKET||'assets';const region=required('AWS_REGION');
 const client=new S3Client({endpoint,region,forcePathStyle:true,credentials:{accessKeyId:required('AWS_ACCESS_KEY_ID'),secretAccessKey:required('AWS_SECRET_ACCESS_KEY')}});
 const prisma=new PrismaClient({adapter:new PrismaPg({connectionString})});
 const baseURL=process.env.BETTER_AUTH_URL||(process.env.RENDER_EXTERNAL_HOSTNAME?'https://'+process.env.RENDER_EXTERNAL_HOSTNAME:'http://127.0.0.1:'+ (process.env.PORT||8000));
 const auth=createAuth(prismaAdapter(prisma,{provider:'postgresql'}),baseURL,required('BETTER_AUTH_SECRET'));
 return {auth,
  courses:{
   async list(ownerId){return (await prisma.course.findMany({where:ownerId?{ownerId}:undefined,orderBy:{createdAt:'asc'}})).map(r=>({...r.body as object,ownerId:r.ownerId||undefined}) as Course);},
   async get(id){const r=await prisma.course.findUnique({where:{id}});return r?({...r.body as object,ownerId:r.ownerId||undefined}) as Course:undefined;},
   async save(c){const body=JSON.parse(JSON.stringify(c)) as Prisma.InputJsonValue;await prisma.course.upsert({where:{id:c.id},create:{id:c.id,ownerId:c.ownerId,body},update:{body}});},
   async delete(id){await prisma.course.delete({where:{id}});},
   async close(){await prisma.$disconnect();client.destroy();},
  },
  objects:{
   async put(key,bytes){await client.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:bytes,ContentType:'application/pdf'}));},
   async get(key){const r=await client.send(new GetObjectCommand({Bucket:bucket,Key:key}));if(!r.Body)throw Error('Stored PDF has no content.');return r.Body.transformToByteArray();},
   async delete(key){await client.send(new DeleteObjectCommand({Bucket:bucket,Key:key}));},
  },
 };
}
