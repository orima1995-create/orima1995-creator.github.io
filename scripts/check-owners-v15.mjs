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
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=400)errors.push(r.status()+' '+r.url());});
 const checkOverflow=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),width+': overflow');
 await page.goto(origin+base+'owners-notes/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('h1').innerText(),'所有個体から見る。');
 assert.equal(await page.locator('.owner-frame').count(),2);
 assert.equal(await page.locator('.owner-frame img').count(),2);
 for(const img of await page.locator('.owner-frame img').all())assert(await img.evaluate(e=>e.complete&&e.naturalWidth>0));
 assert.equal(await page.locator('.owners-mobile-rail').count(),0);
 await checkOverflow();
 const cards=await page.locator('.owner-frame').evaluateAll(els=>els.map(e=>({height:e.clientHeight,width:e.clientWidth,scroll:e.scrollWidth})));
 assert(cards.every(c=>c.width>=120&&c.scroll<=c.width+1));if(width<=760)assert(cards.every(c=>c.height<=190));
 if(screens)await page.screenshot({path:path.join(screens,'owners-v16-directory-'+width+'.png')});
 const hrefs=await page.locator('.owner-frame').evaluateAll(els=>els.map(e=>e.href.split('#')[0]));
 await page.locator('.directory-tiles').first().evaluate(e=>{for(let i=0;i<7;i++)e.append(e.firstElementChild.cloneNode(true));});
 await checkOverflow();
 assert(await page.locator('.directory-tiles').first().evaluate(e=>e.lastElementChild.getBoundingClientRect().top>e.firstElementChild.getBoundingClientRect().top));
 for(const href of hrefs){
  await page.goto(href,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('h1').count(),1);await checkOverflow();
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(247, 248, 244)');
  const img=page.locator('.note-image-stack img');await img.evaluate(e=>e.decode());
  const g=await img.evaluate(e=>({width:e.clientWidth,height:e.clientHeight,nw:e.naturalWidth,nh:e.naturalHeight}));
  assert(Math.abs(g.width/g.height-g.nw/g.nh)<0.01,'original image ratio');
  if(width>760){const tops=await page.locator('#owners-note,#spec').evaluateAll(els=>els.map(e=>e.getBoundingClientRect().top));assert(Math.abs(tops[0]-tops[1])<1,'aligned section labels');}
  if(screens)await page.screenshot({path:path.join(screens,new URL(href).pathname.includes('pierce')?'owners-v16-pierce-'+width+'.png':'owners-v16-cyma-'+width+'.png')});
  await page.locator('.plain summary').click();assert(await page.locator('.owner-copy').isVisible());await checkOverflow();
  for(const summary of await page.locator('#deep').locator('..').locator('summary').all()){await summary.click();await checkOverflow();}
  await page.locator('.sources summary').click();assert(await page.locator('.sources li').first().isVisible());await checkOverflow();
  const original=await page.locator('.note-link').getAttribute('href');assert.equal((await page.request.get(origin+original)).status(),200);
  for(const a of await page.locator('.owner-note-end-nav a').all())assert.equal((await page.request.get(origin+await a.getAttribute('href'))).status(),200);
 }
 await page.goto(origin+base+'cyma-time-o-vox/owners-note/',{waitUntil:'networkidle'});await checkOverflow();
 assert(await page.locator('.owner-note-zoom-stack img').evaluate(e=>e.complete&&e.naturalWidth>0));
 assert.deepEqual(errors,[]);console.log(JSON.stringify({width,owners:'PASS'}));await page.close();
}}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
