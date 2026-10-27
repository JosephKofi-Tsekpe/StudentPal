import {createApp} from './server.ts';
const app=await createApp();
const port=Number(process.env.PORT||8000);
app.server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Studentpal listening on port ${port}`));
async function shutdown(){app.server.close(async()=>{await app.close();process.exit(0);});setTimeout(()=>process.exit(1),25000).unref();}
process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
