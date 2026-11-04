"use client";
import {useEffect,useState} from 'react';
import type {z} from 'zod';
import {moderationFetch} from '@/lib/community/moderation-client';
export function useModerationQuery<T>(path:string,schema:z.ZodType<T>,refresh=0){
 const [result,setResult]=useState<{key:string;data?:T;error?:Error}>();
 const key=JSON.stringify([path,refresh]);
 useEffect(()=>{const c=new AbortController();setResult(undefined);moderationFetch(path,{signal:c.signal}).then(v=>{const data=schema.parse(v);if(!c.signal.aborted)setResult({key,data});}).catch(e=>{if(!c.signal.aborted)setResult({key,error:e instanceof Error?e:new Error('Could not load this page.')});});return()=>c.abort();},[key,path,schema]);
 const current=result?.key===key?result:undefined;
 return {data:current?.data,error:current?.error,loading:!current};
}
