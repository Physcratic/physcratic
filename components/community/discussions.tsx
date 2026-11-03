"use client";
import React,{createContext,useContext,useEffect,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {authClient} from '@/lib/auth-client';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {commentsPageSchema,commentBodySchema,commentAckSchema,type DiscussionComment} from '@/lib/community/comments-contracts';
type Write=Record<string,unknown>;
class DiscussionError extends Error{constructor(public status:number){super(status===401||status===403?'Your session changed. Refresh your account before writing.':status===404?'This problem or comment is no longer available. Reload the discussion.':status===409?'This comment changed or repeats recent text. Reload before retrying.':status===429?'Discussion limit reached. Wait before retrying.':status===400||status===413?'Use 1 to 2000 characters of plain text.':'The request could not be confirmed. Reload the discussion before retrying.');}}
type ContextValue={problemKey:string;verified:boolean;signedIn:boolean;sort:'newest'|'top';refresh:number;changedParent:string|null|undefined;write:(v:Write,parent?:string|null)=>Promise<void>;reload:()=>void};
const Context=createContext<ContextValue|null>(null);
export function Discussions({problemKey}:{problemKey:string}){
 const {data,isPending,error}=authClient.useSession();
 return <DiscussionWorkspace key={JSON.stringify([problemKey,data?.user.id,isPending,Boolean(error)])} problemKey={problemKey} signedIn={Boolean(data?.user)&&!error} verified={data?.user.emailVerified===true&&!error&&!isPending}/>;
}
function DiscussionWorkspace({problemKey,signedIn,verified}:{problemKey:string;signedIn:boolean;verified:boolean}){
 const [sort,setSort]=useState<'newest'|'top'>('newest'),[refresh,setRefresh]=useState(0),[changedParent,setChangedParent]=useState<string|null|undefined>(),[denied,setDenied]=useState(false);
 const actions=useRef(new Set<AbortController>());
 useEffect(()=>()=>{for(const c of actions.current)c.abort();},[]);
 async function write(v:Write,parent?:string|null){const c=new AbortController();actions.current.add(c);try{
  const r=await fetch('/api/community/comments',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({...v,key:problemKey}),signal:AbortSignal.any([c.signal,AbortSignal.timeout(15000)])});
  if(!r.ok){if(r.status===401||r.status===403){setDenied(true);authClient.$store.notify('$sessionSignal');}throw new DiscussionError(r.status);}
  const ack=commentAckSchema.parse(await r.json());if(v.id&&ack.id!==v.id)throw new Error('The response did not match this comment. Reload before retrying.');
  if(c.signal.aborted)throw new Error('Request interrupted. Reload before retrying.');setChangedParent(parent);setRefresh(n=>n+1);
 }finally{actions.current.delete(c);}}
 const value:ContextValue={problemKey,verified:verified&&!denied,signedIn,sort,refresh,changedParent,write,reload:()=>{setChangedParent(undefined);setRefresh(n=>n+1);}};
 return <Context.Provider value={value}><section aria-labelledby="discussion-heading" className="mx-auto w-full min-w-0 max-w-4xl space-y-5 rounded-xl border bg-card p-4 sm:p-6">
  <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="discussion-heading" className="text-xl font-semibold">Discussion</h2><Button variant="outline" onClick={value.reload}>Reload discussion</Button></div>
  <p className="text-sm text-muted-foreground">Plain text only. Keep private information out of comments. Replies stay after a parent is deleted.</p>
  <label className="flex flex-wrap items-center gap-3 text-sm">Sort discussions<select aria-label="Sort discussions" className="min-h-11 rounded border bg-background px-3" value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="newest">Newest</option><option value="top">Top</option></select></label>
  <p className="text-xs text-muted-foreground">Pages show current discussions. Top scores can move between pages as reactions change. Reload to see current order.</p>
  {!signedIn?<p><Link className="inline-flex min-h-11 items-center underline" href="/sign-in">Sign in to join the discussion</Link></p>:!value.verified?<p role="status">Verify your email or refresh your account before writing.</p>:<Composer parent={null}/>}
  <ThreadPage key={sort} parent={null}/>
 </section></Context.Provider>;
}
function Composer({parent,onDone}:{parent:string|null;onDone?:()=>void}){
 const context=useContext(Context)!,[body,setBody]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[uncertain,setUncertain]=useState(false);
 const intent=useRef<Write|null>(null),inFlight=useRef(false);
 async function submit(e:FormEvent){e.preventDefault();if(inFlight.current)return;const parsed=commentBodySchema.safeParse(body);if(!parsed.success){setError('Use 1 to 2000 characters of plain text.');return;}if(!intent.current)intent.current={action:'create',parent,requestId:crypto.randomUUID(),body:parsed.data};inFlight.current=true;setBusy(true);setError('');
 try{await context.write(intent.current,parent);intent.current=null;setBody('');setUncertain(false);onDone?.();}
 catch(e){setError(e instanceof Error?e.message:'Comment unavailable.');if(e instanceof DiscussionError&&[400,401,403,404,409,413,415].includes(e.status)){intent.current=null;setUncertain(false);}else setUncertain(true);}
 finally{inFlight.current=false;setBusy(false);}}
 return <form onSubmit={submit} className="space-y-3"><label className="block space-y-2 text-sm">{parent?'Your reply':'New comment'}<Textarea value={body} onChange={e=>setBody(e.target.value)} readOnly={uncertain} disabled={busy} maxLength={2000} rows={3}/></label><p className="text-xs text-muted-foreground">{body.length}/2000 characters</p>{error&&<p role="alert" className="text-sm">{error}</p>}{uncertain&&<p className="text-sm">Retry sends the same request reference. Reload to check whether it was posted. Text stays fixed until that request is confirmed. Reload before discarding it.</p>}<Button className="min-h-11" disabled={busy||!context.verified} type="submit">{busy?'Posting…':uncertain?'Retry same comment':parent?'Post reply':'Post comment'}</Button>{uncertain&&<Button type="button" variant="ghost" disabled={busy} onClick={()=>{intent.current=null;setBody('');setUncertain(false);setError('');}}>Discard pending draft</Button>}</form>;
}
function ThreadPage({parent}:{parent:string|null}){
 const context=useContext(Context)!,[cursors,setCursors]=useState<(string|undefined)[]>([undefined]),[page,setPage]=useState<{key:string;value:ReturnType<typeof commentsPageSchema.parse>}>(),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const heading=useRef<HTMLDivElement>(null),focus=useRef(false),after=cursors.at(-1),key=JSON.stringify([parent,after]);
 useEffect(()=>{if(context.changedParent===parent)setCursors([undefined]);},[context.refresh,context.changedParent,parent]);
 useEffect(()=>{const c=new AbortController();setLoading(true);setError('');const p=new URLSearchParams({key:context.problemKey,sort:context.sort});if(parent)p.set('parent',parent);if(after)p.set('after',after);
 fetch('/api/community/comments?'+p,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.any([c.signal,AbortSignal.timeout(15000)])}).then(async r=>{if(!r.ok)throw new DiscussionError(r.status);const value=commentsPageSchema.parse(await r.json());if(!c.signal.aborted){setPage({key,value});if(focus.current){heading.current?.focus();focus.current=false;}}}).catch(e=>{if(!c.signal.aborted){setPage(undefined);setError(e instanceof Error?e.message:'Discussion unavailable.');}}).finally(()=>{if(!c.signal.aborted)setLoading(false);});return()=>c.abort();
 },[context.problemKey,context.sort,context.refresh,parent,after,key]);
 const current=page?.key===key?page.value:undefined;
 return <div id={parent?'replies-'+parent:'discussion-roots'} role="group" ref={heading} tabIndex={-1} className="min-w-0 space-y-4 focus:outline-none" aria-label={parent?'Replies':'Comments'}>
  {loading&&<p role="status" className="text-sm">Loading {parent?'replies':'comments'}…</p>}
  {error&&<div role="alert" className="space-y-2"><p className="text-sm">{error}</p><Button variant="outline" onClick={context.reload}>Retry discussion</Button></div>}
  {!loading&&!error&&!current?.comments.length&&<p className="text-sm text-muted-foreground">{parent?'No replies yet.':'No comments yet. Start the discussion.'}</p>}
  {current&&<ul className="min-w-0 space-y-4">{current.comments.map(comment=><li key={comment.id} className="min-w-0"><CommentNode comment={comment}/></li>)}</ul>}
  <nav aria-label={parent?'Reply pages for comment '+parent.slice(0,8):'Comment pages'} className="flex flex-wrap gap-3"><Button variant="outline" disabled={loading||cursors.length===1} onClick={()=>{focus.current=true;setCursors(v=>v.slice(0,-1));}}>Previous {parent?'replies':'comments'}</Button><Button variant="outline" disabled={loading||!current?.nextCursor} onClick={()=>{focus.current=true;setCursors(v=>[...v,current!.nextCursor!]);}}>Next {parent?'replies':'comments'}</Button></nav>
 </div>;
}
function CommentNode({comment:c}:{comment:DiscussionComment}){
 const context=useContext(Context)!,[open,setOpen]=useState(false),[reply,setReply]=useState(false),[edit,setEdit]=useState<{body:string;version:number}|null>(null),[confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');const flight=useRef(false);
 async function action(v:Write,onDone?:()=>void){if(flight.current)return;flight.current=true;setBusy(true);setError('');try{await context.write(v);onDone?.();}catch(e){setError(e instanceof Error?e.message:'Comment unavailable.');}finally{flight.current=false;setBusy(false);}}
 return <><article id={'comment-'+c.id} data-comment-id={c.id} data-depth={c.depth} className="min-w-0 space-y-3 rounded-lg border p-3 [overflow-wrap:anywhere]" style={{marginLeft:Math.min(c.depth,3)*12}}>
  <header className="flex flex-wrap items-center gap-2 text-sm"><span className="font-medium">{c.deleted?'Deleted comment':c.author?<Link className="underline" href={'/u/'+c.author.handle}>{c.author.displayName||'@'+c.author.handle}</Link>:'Community member'}</span><time dateTime={c.createdAt} className="text-xs text-muted-foreground">{new Date(c.createdAt).toISOString()}</time>{c.editedAt&&!c.deleted&&<span className="text-xs">Edited</span>}</header>
  {c.parentId&&<p className="text-xs text-muted-foreground">Replying to {c.replyAuthor?<Link className="underline" href={'/u/'+c.replyAuthor.handle}>@{c.replyAuthor.handle}</Link>:'a community member or deleted comment'} · <a className="underline" href={'#comment-'+c.parentId}>Parent {c.parentId.slice(0,8)}</a></p>}
  {c.deleted?<p className="italic text-muted-foreground">This comment was deleted. Replies are preserved.</p>:<p className="whitespace-pre-wrap break-words">{c.body}</p>}
  {error&&<p role="alert" className="text-sm">{error}</p>}
  <div className="flex flex-wrap items-center gap-2">{!c.deleted&&<><span className="text-sm">{c.score} {c.score===1?'like':'likes'}</span>{context.verified&&<Button className="min-h-11" variant="outline" disabled={busy} aria-pressed={c.liked} onClick={()=>action({action:'like',id:c.id,liked:!c.liked})}>{c.liked?'Liked':'Like'}</Button>}{context.verified&&c.owned&&<><Button className="min-h-11" variant="ghost" disabled={busy} onClick={()=>{setEdit({body:c.body,version:c.version});setConfirm(false);}}>Edit</Button><Button className="min-h-11" variant="ghost" disabled={busy} onClick={()=>{setConfirm(true);setEdit(null);}}>Delete</Button></>}</>}
   {context.verified&&c.depth<64&&<Button className="min-h-11" variant="ghost" onClick={()=>setReply(v=>!v)}>{reply?'Cancel reply':'Reply'}</Button>}
   {(c.hasReplies||open)&&<Button className="min-h-11" variant="outline" aria-expanded={open} aria-controls={open?'replies-'+c.id:undefined} onClick={()=>setOpen(v=>!v)}>{open?'Hide replies':'View replies'}</Button>}
  </div>
  {confirm&&!c.deleted&&<div className="space-y-2"><p className="text-sm">Delete your text? Child replies will remain.</p><Button className="min-h-11" variant="destructive" disabled={busy||!context.verified} onClick={()=>action({action:'delete',id:c.id,version:c.version},()=>setConfirm(false))}>Confirm deletion</Button><Button className="min-h-11" variant="ghost" onClick={()=>setConfirm(false)}>Cancel deletion</Button></div>}
  {edit&&!c.deleted&&<form className="space-y-3" onSubmit={e=>{e.preventDefault();if(!commentBodySchema.safeParse(edit.body).success){setError('Use 1 to 2000 characters of plain text.');return;}void action({action:'edit',id:c.id,version:edit.version,body:edit.body},()=>setEdit(null));}}><label className="block space-y-2 text-sm">Edit your comment<Textarea disabled={busy} maxLength={2000} value={edit.body} onChange={e=>setEdit({...edit,body:e.target.value})}/></label><Button className="min-h-11" disabled={busy||!context.verified} type="submit">Save edit</Button><Button className="min-h-11" variant="ghost" type="button" onClick={()=>setEdit(null)}>Cancel edit</Button></form>}
  {reply&&context.verified&&<Composer parent={c.id} onDone={()=>{setReply(false);setOpen(true);}}/>}
 </article>{open&&<ThreadPage parent={c.id}/>}</>;
}
