import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.resolve('dist'),base='/orima1995-creator.github.io/';
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith(base))throw Error();let file=path.resolve(root,decodeURIComponent(url.pathname.slice(base.length)));if(file!==root&&!file.startsWith(root+path.sep))throw Error();if((await stat(file)).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`,screens=process.env.HISTORY_SCREENSHOT_DIR;
if(screens)await mkdir(screens,{recursive:true});
const browser=await chromium.launch({headless:true});
try{for(const width of [320,390,768,1280]){
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=400)errors.push(r.status()+' '+r.url());});
 const checkPage=async label=>{
  const g=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  assert.equal(g.scroll,g.client,`${width} ${label}: page overflow`);
 };
 await page.goto(origin+base+'history/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('h1').count(),1);
 assert.equal(await page.locator('details.chronology-era').count(),6);
 assert.equal(await page.locator('details.chronology-era[open]').count(),0);
 assert.equal(await page.locator('.chapter-motif-v18').count(),2);
 assert((await page.locator('[id="before"] .chapter-motif-v18').getAttribute('src')).includes('before-clocktower.svg'));
 assert((await page.locator('[id="1950s"] .chapter-motif-v18').getAttribute('src')).includes('1950s-train.svg'));
 const bodyText=await page.locator('body').innerText();assert(!bodyText.includes('TEST v14'));assert(!bodyText.includes('テスト版の写真枠について'));
 for(const toggle of await page.locator('.chapter-toggle-v18').all()){const s=await toggle.evaluate(e=>({w:e.clientWidth,h:e.clientHeight}));assert(s.w>=44&&s.h>=44);}
 await checkPage('closed');
 if(width===390&&screens)await page.screenshot({path:path.join(screens,'history-v18-390-overview.png'),fullPage:true});

 await page.goto(origin+base+'history/#before',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(120);
 assert(await page.locator('[id="before"]').evaluate(e=>e.open));await checkPage('before open');
 if(width===390&&screens)await page.locator('[id="before"]').screenshot({path:path.join(screens,'history-v18-390-before-open.png')});

 await page.goto(origin+base+'history/#1950s',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(120);
 const chapter=page.locator('[id="1950s"]');assert(await chapter.evaluate(e=>e.open));
 assert.equal(await chapter.locator('.shelf-card-v18').count(),4);
 assert.equal(await chapter.locator('.owner-frame').count(),4);
 assert.equal(await chapter.locator('.owner-frame img').count(),2);
 for(const img of await chapter.locator('.owner-frame img').all())assert(await img.evaluate(e=>e.complete&&e.naturalWidth>0));
 const fit=await chapter.evaluate(e=>({client:e.clientHeight,scroll:e.scrollHeight,bottom:e.getBoundingClientRect().bottom,last:[...e.querySelectorAll('.owner-frame')].at(-1)?.getBoundingClientRect().bottom||0,frames:[...e.querySelectorAll('.owner-frame')].map(x=>({client:x.clientHeight,scroll:x.scrollHeight}))}));
 assert(fit.scroll<=fit.client+1,`${width}: chapter vertical overflow`);assert(fit.last<=fit.bottom+1,`${width}: owner frame escapes chapter`);assert(fit.frames.every(x=>x.scroll<=x.client+1),`${width}: owner frame content clipped`);
 const rail=chapter.locator('.shelf-rail-v18');
 const rg=await rail.evaluate(e=>({client:e.clientWidth,scroll:e.scrollWidth,first:e.firstElementChild.getBoundingClientRect().width,tops:[...e.children].map(c=>c.getBoundingClientRect().top)}));
 if(width<=760){assert(rg.scroll>rg.client,`${width}: shelf should scroll`);assert(rg.first<rg.client,`${width}: peek should remain`);}
 else{assert(rg.scroll<=rg.client+1,`${width}: desktop shelf overflow`);assert(Math.abs(rg.tops[0]-rg.tops[1])<1,`${width}: desktop two-column shelf`);}
 await checkPage('1950 open');
 if(width===390&&screens){await chapter.screenshot({path:path.join(screens,'history-v18-390-1950s-open.png')});await page.screenshot({path:path.join(screens,'history-v18-390-1950s-page.png'),fullPage:true});}
 if(width===1280&&screens)await chapter.screenshot({path:path.join(screens,'history-v18-1280-1950s-open.png')});

 await page.goto(origin+base+'history/',{waitUntil:'networkidle'});await page.locator('.history-era-nav a[href="#1940s"]').click();await page.waitForTimeout(150);
 assert(await page.locator('[id="1940s"]').evaluate(e=>e.open),'nav opens target chapter');
 assert.equal(await page.locator('[id="1940s"] .owner-frame').count(),1);
 await checkPage('nav open');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({width,chapters:6,motifs:2,peek:width<=760,owners1950:4,result:'PASS'}));
 await page.close();
}}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
