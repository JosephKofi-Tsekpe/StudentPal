import {testAuth} from './auth-fixture.ts';
import type {Course,Services} from '../src/types.ts';
// Explicit injected test double: production has no memory/local fallback.
export function memoryStorage():Services{
 const rows=new Map<string,Course>();const files=new Map<string,Uint8Array>();
 return {auth:testAuth(),courses:{async list(ownerId){return structuredClone([...rows.values()].filter(c=>!ownerId||c.ownerId===ownerId));},async get(id){return structuredClone(rows.get(id));},async save(c){rows.set(c.id,structuredClone(c));},async delete(id){rows.delete(id);},async close(){}},objects:{async put(k,b){files.set(k,b.slice());},async get(k){const b=files.get(k);if(!b)throw Error('Object not found');return b.slice();},async delete(k){files.delete(k);}}};
}
