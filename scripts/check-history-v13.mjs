import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.resolve('dist'),base='/orima1995-creator.github.io/';
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith(base))throw Error();let file=path.resolve(root,decodeURIComponent(url.pathname.slice(base.length)));if(file!==root&&!file.startsWith(root+path.sep))throw Error();if((await stat(file)).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`,screens=process.env.HISTORY_SCREENSHOT_DIR;
if(screens)await mkdir(screens,{recursive:true});
const browser=await chromium.launch({headless:true});
try{for(const width of [320,390,768,1280]){
 const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(origin+base+'history/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 const text=await page.locator('body').innerText();
 assert(text.includes('所有個体から見る。'));
 assert(text.includes('次に気になっているものと、そのデータ。'));
 assert(!text.includes('アラームを、腕へ。'));
 assert(!text.includes('TEST v14'));
 assert(!text.includes('テスト版の写真枠について'));
 assert.equal(await page.locator('h1').count(),1);
 for(const section of await page.locator('.chronology-era,#current,#research').all()){
  await section.scrollIntoViewIfNeeded();
  const geometry=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,clipped:[...document.querySelectorAll('h1,h2,h3,h4,.chapter-copy p,.evidence-item p,.frame-name,.frame-kind')].filter(e=>e.clientWidth&&e.scrollWidth>e.clientWidth+1).map(e=>e.textContent)}));
  assert.equal(geometry.scroll,geometry.width,`${width}: page overflow`);assert.deepEqual(geometry.clipped,[],`${width}: clipped text`);
 }
 assert.equal(await page.locator('[data-entry]').count(),11);
 assert.equal(await page.locator('#milestones-1950s [data-entry]').count(),4);
 assert.equal(await page.locator('.rail-controls').count(),0);
 for(const grid of await page.locator('.evidence-grid,.owner-tiles').all())assert(await grid.evaluate(e=>e.scrollWidth<=e.clientWidth+1));
 assert.equal(await page.locator('[id="1940s"] .owner-frame').count(),1);
 assert.equal(await page.locator('[id="1950s"] .owner-frame').count(),4);
 assert.equal(await page.locator('.owner-frame').count(),5);
 assert.equal(await page.locator('.owner-frame img').count(),2);
 for(const img of await page.locator('.owner-frame img').all())assert(await img.evaluate(e=>e.complete&&e.naturalWidth>0));
 for(const frame of await page.locator('.owner-frame').all()){assert(await frame.locator('.frame-name strong').innerText());assert(await frame.evaluate(e=>e.scrollWidth<=e.clientWidth+1));}
 const frameGeometry=await page.locator('[id="1950s"] .owner-frame').evaluateAll(els=>els.map(e=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,top:e.getBoundingClientRect().top,width:e.clientWidth,height:e.clientHeight})));
 assert.equal(frameGeometry.length,4);
 if(width<=760){
  assert(Math.abs(frameGeometry[0].top-frameGeometry[1].top)<1);
  assert(Math.abs(frameGeometry[2].top-frameGeometry[3].top)<1);
  assert(frameGeometry[2].top>frameGeometry[0].top);
  assert(frameGeometry.every(t=>t.left>=0&&t.right<=width&&t.height<=190));
 }
 assert.equal(await page.locator('.owner-tile').count(),2);
 if(screens){await page.locator('[id="1950s"]').screenshot({path:path.join(screens,`history-v16-1950s-${width}.png`)});await page.goto(origin+base+'history/');await page.screenshot({path:path.join(screens,`history-v16-cover-${width}.png`)});}
 const links=await page.locator('.history-era-nav a').evaluateAll(els=>els.map(e=>({href:e.href,hash:e.hash})));
 for(const link of links){await page.goto(link.href);await page.waitForTimeout(120);assert(await page.locator(`[id="${link.hash.slice(1)}"]`).isVisible());}
 await page.locator('.history-sources-v13 summary').click();assert(await page.locator('.history-sources-v13 li').first().isVisible());
 await page.locator('.section-menu summary').click();assert(await page.locator('.section-menu-panel').isVisible());await page.locator('.section-menu summary').click();
 for(const link of await page.locator('.owner-tile,.current-link,.collection-lead a').all()){
  const href=await link.getAttribute('href'),response=await page.request.get(origin+href);assert.equal(response.status(),200,href);const hash=new URL(href,origin).hash;if(hash)assert((await response.text()).includes(`id="${hash.slice(1)}"`));
 }
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),await page.evaluate(()=>document.documentElement.clientWidth),`${width}: expanded content overflow`);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({width,entries:11,ownerFrames:5,ownerImages:2,result:'PASS'}));await page.close();
}}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
