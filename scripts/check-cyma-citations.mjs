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
const out=process.env.CYMA_CITATIONS_SCREENSHOT_DIR;
if(out) await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  for(const width of [390,1280]){
    const page=await browser.newPage({viewport:{width,height:width===390?1000:900}});
    await page.goto(origin+base+'cyma-time-o-vox/',{waitUntil:'networkidle'});
    await page.evaluate(()=>document.fonts.ready);

    const details=page.locator('.deep-list > details');
    assert.equal(await details.count(),5);
    for(let i=0;i<5;i++){
      if(!(await details.nth(i).getAttribute('open'))) await details.nth(i).locator('summary').click();
    }
    const sources=page.locator('.sources details');
    if(!(await sources.getAttribute('open'))) await sources.locator('summary').click();

    assert.equal(await page.locator('.cite-refs').count(),21);
    assert.equal(await page.locator('.source-list > li').count(),6);
    assert.equal(await page.locator('#source-1 .source-kind').innerText(),'REFERENCE');
    assert.equal(await page.locator('#source-4 .source-kind').innerText(),'PROVENANCE');
    assert.equal(await page.locator('#source-5 .source-kind').innerText(),'OWNER OBSERVATION');
    assert.equal(await page.locator('#source-6 .source-kind').innerText(),'OWNER OBSERVATION');

    const body=await page.locator('body').textContent();
    assert(body?.includes('そして、アラームにクロノメーター'));
    assert(body?.includes('アラーム時計の一つの極北'));
    assert(body?.includes('タイミングホイールの約6秒の動きをXで見る'));
    assert(body?.includes("NEXT OWNER'S NOTE ／ 次の一本"));

    const sizes=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    assert(sizes.scroll<=sizes.client+1,`horizontal overflow ${JSON.stringify(sizes)}`);

    if(out) await page.screenshot({path:path.join(out,`cyma-citations-${width}.png`),fullPage:true});
    await page.close();

    const duofon=await browser.newPage({viewport:{width,height:900}});
    await duofon.goto(origin+base+'pierce-duofon/',{waitUntil:'networkidle'});
    const ds=duofon.locator('.sources details');
    if(!(await ds.getAttribute('open'))) await ds.locator('summary').click();
    assert.equal(await duofon.locator('#source-1 .source-kind').innerText(),'PRIMARY SOURCE');
    assert((await duofon.locator('body').textContent())?.includes("NEXT OWNER'S NOTE ／ 次の一本"));
    await duofon.close();
  }
  console.log('PASS');
}finally{
  await browser.close();
  await new Promise(r=>server.close(r));
}
