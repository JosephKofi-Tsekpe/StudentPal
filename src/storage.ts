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
 return {
  courses:{
   async list(){return (await prisma.course.findMany({orderBy:{createdAt:'asc'}})).map(r=>r.body as unknown as Course);},
   async get(id){const r=await prisma.course.findUnique({where:{id}});return r?.body as unknown as Course|undefined;},
   async save(c){const body=JSON.parse(JSON.stringify(c)) as Prisma.InputJsonValue;await prisma.course.upsert({where:{id:c.id},create:{id:c.id,body},update:{body}});},
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
