import {config} from 'dotenv';
// Neon deploy writes .env.local unless .env already exists. Hosted env wins.
config({path:['.env.local','.env'],quiet:true});
