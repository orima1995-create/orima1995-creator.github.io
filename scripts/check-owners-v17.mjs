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
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg'})[path.extname(file)]||'application/octet-stream');
    res.end(await readFile(file));
  }catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const out=process.env.OWNERS_SCREENSHOT_DIR;
if(out) await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  for(const width of [320,390,768,1280]){
    const page=await browser.newPage({viewport:{width,height:1100}});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=400) errors.push(r.status()+' '+r.url());});
    await page.goto(origin+base+'owners-notes/',{waitUntil:'networkidle'});
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.getByText('写真枠',{exact:true}).count(),0);
    assert.equal(await page.locator('.directory-meta').innerText(),'OWNED SPECIMENS\nCOLLECTION');
    assert((await page.locator('.directory-tiles .owner-frame').count())>0);
    const geom=await page.evaluate(()=>({c:document.documentElement.clientWidth,s:document.documentElement.scrollWidth}));
    assert.equal(geom.c,geom.s,`${width}: directory overflow`);
    if(out && width===390) await page.screenshot({path:path.join(out,'owners-v17-390-directory.png'),fullPage:true});
    if(out && width===1280) await page.screenshot({path:path.join(out,'owners-v17-1280-directory.png'),fullPage:true});
    assert.deepEqual(errors,[]);
    await page.close();

    const detail=await browser.newPage({viewport:{width,height:1200}});
    const detailErrors=[];
    detail.on('pageerror',e=>detailErrors.push(e.message));
    detail.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=400) detailErrors.push(r.status()+' '+r.url());});
    await detail.goto(origin+base+'pierce-duofon/',{waitUntil:'networkidle'});
    await detail.evaluate(()=>document.fonts.ready);
    assert((await detail.locator('.deep-list details').count())>0);
    const after=await detail.locator('.deep-list summary').first().evaluate(el=>getComputedStyle(el,'::after').content);
    assert(after.includes('⌄'));
    assert((await detail.locator('.owner-note-next small').innerText()).startsWith("NEXT OWNER'S NOTE"));
    const dg=await detail.evaluate(()=>({c:document.documentElement.clientWidth,s:document.documentElement.scrollWidth}));
    assert.equal(dg.c,dg.s,`${width}: detail overflow`);
    if(out && width===390) await detail.screenshot({path:path.join(out,'owners-v17-390-detail.png'),fullPage:true});
    if(out && width===1280) await detail.screenshot({path:path.join(out,'owners-v17-1280-detail.png'),fullPage:true});
    assert.deepEqual(detailErrors,[]);
    await detail.close();

    console.log(JSON.stringify({width,result:'PASS'}));
  }
} finally {
  await browser.close();
  await new Promise(r=>server.close(r));
}
