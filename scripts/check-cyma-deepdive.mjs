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
const out=process.env.CYMA_SCREENSHOT_DIR;
if(out) await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  for(const width of [390,1280]){
    const page=await browser.newPage({viewport:{width,height:width===390?1000:900}});
    await page.goto(origin+base+'cyma-time-o-vox/',{waitUntil:'networkidle'});
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('.deep-list > details').count(),5);
    assert.equal(await page.locator('#listen .x-link').count(),0);
    assert.equal(await page.locator('.deep-list > details').nth(1).locator('.deep-media img').count(),2);
    const mech=page.locator('.deep-list > details').nth(3);
    await mech.locator('summary').click();
    const href=await mech.locator('.deep-link').getAttribute('href');
    assert(href?.includes('2085277918473883977'));
    assert.equal((await mech.locator('.deep-link').innerText()).trim().replace(/\s+/g,' '),'輪列の動きをXで見る ↗');
    for(const i of [1,2]){
      const det=page.locator('.deep-list > details').nth(i);
      if(!(await det.getAttribute('open'))) await det.locator('summary').click();
    }
    const body=await page.locator('body').textContent();
    assert(body?.includes('そして、アラームにクロノメーター'));
    assert(body?.includes('アラーム時計の一つの極北'));
    const sizes=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    assert(sizes.scroll<=sizes.client+1,`horizontal overflow ${JSON.stringify(sizes)}`);
    if(out) await page.screenshot({path:path.join(out,`cyma-deepdive-${width}.png`),fullPage:true});
    await page.close();
  }
  console.log('PASS');
}finally{
  await browser.close();
  await new Promise(r=>server.close(r));
}
