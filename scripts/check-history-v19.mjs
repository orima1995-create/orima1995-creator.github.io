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
 await page.goto(origin+base+'history/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 const pageGeom=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 assert.equal(pageGeom.client,pageGeom.scroll,`${width}: page overflow`);
 assert.equal(await page.locator('details.chronology-era').count(),6);
 assert.equal(await page.locator('details.chronology-era[open]').count(),0);
 assert.equal(await page.locator('.chapter-motif-v18').count(),4);
 assert.equal(await page.locator('[id="1910s"] .chapter-motif-v18').count(),0);
 assert.equal(await page.locator('[id="1940s"] .chapter-motif-v18').count(),0);
 for(const id of ['before','1950s','1960s','electronic']){
   const img=page.locator(`[id="${id}"] .chapter-motif-v18`);
   assert.equal(await img.count(),1,`${width}: ${id} motif missing`);
   assert(await img.evaluate(e=>e.complete&&e.naturalWidth>0),`${width}: ${id} motif failed to load`);
   const opacity=Number(await img.evaluate(e=>getComputedStyle(e).opacity));
   assert(opacity>=0.1,`${width}: ${id} collapsed motif too faint`);
 }
 if(width===390&&screens)await page.screenshot({path:path.join(screens,'history-v19-390-collapsed.png'),fullPage:true});
 if(width===1280&&screens)await page.screenshot({path:path.join(screens,'history-v19-1280-collapsed.png'),fullPage:true});
 const chapter=page.locator('[id="1950s"]');await chapter.locator('summary').click();assert(await chapter.evaluate(e=>e.open));
 const openOpacity=Number(await chapter.locator('.chapter-motif-v18').evaluate(e=>getComputedStyle(e).opacity));assert(openOpacity<=0.16&&openOpacity>=0.09);
 assert.equal(await chapter.locator('.shelf-card-v18').count(),4);assert.equal(await chapter.locator('.owner-frame').count(),4);
 if(width===390&&screens)await chapter.screenshot({path:path.join(screens,'history-v19-390-1950s-open.png')});
 assert.equal(await page.evaluate(()=>document.documentElement.clientWidth),await page.evaluate(()=>document.documentElement.scrollWidth));
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({width,motifs:4,blankEras:['1910s','1940s'],result:'PASS'}));
 await page.close();
}}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
