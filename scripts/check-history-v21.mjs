import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.resolve('dist'),base='/orima1995-creator.github.io/';
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');if(!u.pathname.startsWith(base))throw Error();let file=path.resolve(root,decodeURIComponent(u.pathname.slice(base.length)));if(file!==root&&!file.startsWith(root+path.sep))throw Error();if((await stat(file)).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`,screens=process.env.HISTORY_SCREENSHOT_DIR;
if(screens)await mkdir(screens,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const width of [320,390,768]){
  const page=await browser.newPage({viewport:{width,height:1100}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=400)errors.push(r.status()+' '+r.url());});
  await page.goto(origin+base+'history/#electronic',{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  const chapter=page.locator('#electronic');
  assert(await chapter.evaluate(e=>e.open));
  const geom=await page.evaluate(()=>({c:document.documentElement.clientWidth,s:document.documentElement.scrollWidth}));
  if(geom.c!==geom.s){
    const offenders=await page.evaluate(()=>[...document.querySelectorAll('*')].map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,cls:el.className?.toString?.()||'',text:(el.textContent||'').trim().slice(0,80),left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width)}}).filter(x=>x.right>document.documentElement.clientWidth+1||x.left<-1).slice(0,20));
    console.log('OFFENDERS '+width+' '+JSON.stringify(offenders));
  }
  assert.equal(geom.c,geom.s,`${width}: overflow`);
  const title=chapter.locator('h2');
  assert.equal(await title.innerText(),'自動巻きの成熟と電子⁠化。');
  const pieces=await title.locator('.ja-phrase').allTextContents();
  assert(pieces.length>3);
  const para=chapter.locator('.chapter-copy p').first();
  const paraPieces=await para.locator('.ja-phrase').allTextContents();
  assert(paraPieces.includes('さらに'));
  assert.deepEqual(errors,[]);
  if(screens&&width===390)await page.screenshot({path:path.join(screens,'history-v21-390-electronic.png'),fullPage:true});
  if(screens&&width===320)await page.screenshot({path:path.join(screens,'history-v21-320-electronic.png'),fullPage:true});
  console.log(JSON.stringify({width,titlePieces:pieces,hasFurther:paraPieces.includes('さらに'),result:'PASS'}));
  await page.close();
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
