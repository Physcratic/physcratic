import assert from 'node:assert/strict';
// Run against tests/auth-ux-local.mjs dev; API responses are mocked, external requests blocked.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try {
 const p=await b.newPage();
 await p.route('**/*',r=>{
 const u=new URL(r.request().url());if(u.origin!=='http://127.0.0.1:3218')return r.abort();
 if(u.pathname==='/dashboard/submissions')return r.fulfill({contentType:'text/html',body:'<main><h1>Dashboard fixture</h1></main>'});
 if(u.pathname.startsWith('/api/auth/'))return r.fulfill({json:u.pathname.endsWith('/sign-in/email')?{user:{id:'fixture',emailVerified:true},token:'fixture'}:null});
 return r.continue();});
 await p.goto('http://127.0.0.1:3218/sign-in');
 await p.getByRole('button',{name:'Need a verification email?'}).click();
 await p.getByRole('heading',{name:'Account next steps',exact:true}).waitFor();
 await p.getByLabel('Email',{exact:true}).fill('unknown@example.test');
 await p.getByRole('button',{name:'Resend verification email'}).click();
 await p.getByText('Request received',{exact:true}).waitFor();
 assert.ok((await p.getByRole('status').allTextContents()).some(text=>text.includes('does not confirm delivery')));
 await p.getByRole('button',{name:'Back to account form'}).click();
 await p.getByLabel('Email',{exact:true}).fill('verified@example.test');await p.getByLabel('Password',{exact:true}).fill('fixture-password');const navigation=p.waitForRequest(r=>new URL(r.url()).pathname==='/dashboard/submissions');await p.getByRole('button',{name:'Sign in',exact:true}).click();await navigation;assert.equal(await p.getByText('Verify your email',{exact:true}).count(),0);console.log('PASS verified login requests dashboard navigation without verification prompt');
}finally{await b.close()}
