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
const out=process.env.DUOFON_SCREENSHOT_DIR;
if(out) await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  for(const width of [390,1280]){
    const page=await browser.newPage({viewport:{width,height:width===390?1000:900}});
    await page.goto(origin+base+'pierce-duofon/',{waitUntil:'networkidle'});
    await page.evaluate(()=>document.fonts.ready);

    const details=page.locator('.deep-list > details');
    assert.equal(await details.count(),4);
    for(let i=0;i<4;i++){
      if(!(await details.nth(i).getAttribute('open'))) await details.nth(i).locator('summary').click();
    }
    const sources=page.locator('.sources details');
    if(!(await sources.getAttribute('open'))) await sources.locator('summary').click();

    assert((await page.locator('.cite-refs').count()) >= 10);
    assert.equal(await page.locator('#source-1 .source-kind').innerText(),'PRIMARY SOURCE');
    assert.equal(await page.locator('#source-2 .source-kind').innerText(),'REFERENCE');
    assert.equal(await page.locator('.sources').filter({hasText:'COMMUNICATION HISTORY'}).count(),0);
    assert.equal(await page.locator('.sources').filter({hasText:'※'}).count(),0);

    const body=await page.locator('body').textContent();
    assert(body?.includes('リマインドの気遣いまで、ぜんぶ機械仕掛け。'));
    assert(body?.includes('マナーモードの祖先!?'));

    const sizes=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    assert(sizes.scroll<=sizes.client+1,`horizontal overflow ${JSON.stringify(sizes)}`);

    if(out) await page.screenshot({path:path.join(out,`duofon-citations-${width}.png`),fullPage:true});
    await page.close();
  }
  console.log('PASS');
}finally{
  await browser.close();
  await new Promise(r=>server.close(r));
}
