export type Question={question:string;type:'mcq'|'theory';options:string[];answer:string;explanation:string};
export type Plan={date:string;topic:string;done:boolean};
export type Attempt={date:string;results:(Question&{response:string;correct:boolean|null})[];score:number;mcqs:number};
export type Course={id:string;name:string;pages:number;status:string;progress:number;content:string;error?:string;plan:Plan[];attempts:Attempt[];active?:{token:string;questions:Question[];deadline:number}};
export interface CourseStore {
 list():Promise<Course[]>;
 get(id:string):Promise<Course|undefined>;
 save(course:Course):Promise<void>;
 delete(id:string):Promise<void>;
 close():Promise<void>;
}
export interface ObjectStore {
 put(key:string,bytes:Uint8Array):Promise<void>;
 get(key:string):Promise<Uint8Array>;
 delete(key:string):Promise<void>;
}
export type Services={courses:CourseStore;objects:ObjectStore};
