import './src/env.ts';
import {defineConfig} from 'prisma/config';
export default defineConfig({
 schema:'prisma/schema.prisma',
 migrations:{path:'prisma/migrations'},
 // Generation and unit tests need no database; migrate deploy requires a real URL.
 datasource:{url:process.env.DATABASE_URL_UNPOOLED||process.env.DIRECT_URL||process.env.DATABASE_URL||'postgresql://localhost:5432/studentpal'},
});
