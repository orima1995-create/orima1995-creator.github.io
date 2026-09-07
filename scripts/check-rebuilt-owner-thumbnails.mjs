import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const root=path.resolve('dist');
const base='/orima1995-creator.github.io/';
const server=createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,'http://localhost');
    if(!u.pathname.startsWith(base)) throw Error();
    let file=path.resolve(root,decodeURIComponent(u.pathname.slice(base.length)));
    if(file!==root&&!file.startsWith(root+path.sep)) throw Error();
    if((await stat(file)).isDirectory()) file=path.join(file,'index.html');
    const ext=path.extname(file);
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp'})[ext]||'application/octet-stream');
    res.end(await readFile(file));
  }catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const out=process.env.THUMB_REBUILD_DIR;
if(out) await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  for(const width of [390,1280]){
    const page=await browser.newPage({viewport:{width,height:width===390?1100:900}});
    await page.goto(origin+base+'history/',{waitUntil:'networkidle'});
    const ch=page.locator('[id="1950s"]');
    if(!(await ch.evaluate(el=>el.hasAttribute('open')))) await ch.locator('summary').click();
    await page.evaluate(()=>document.fonts.ready);
    const imgs=page.locator('[id="1950s"] .owner-tiles .frame-media img');
    assert.equal(await imgs.count(),2);
    for(let i=0;i<2;i++){
      const src=await imgs.nth(i).getAttribute('src');
      assert(src?.includes('-full.png'));
      const fit=await imgs.nth(i).evaluate(el=>getComputedStyle(el).objectFit);
      assert.equal(fit,'contain');
      const natural=await imgs.nth(i).evaluate(el=>({w:el.naturalWidth,h:el.naturalHeight}));
      assert.deepEqual(natural,{w:720,h:720});
    }
    if(out) await ch.screenshot({path:path.join(out,`history-owner-thumbs-rebuilt-${width}.png`)});
    await page.close();
  }
  console.log('PASS');
}finally{
  await browser.close();
  await new Promise(r=>server.close(r));
}
