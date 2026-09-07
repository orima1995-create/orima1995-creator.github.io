import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const root=path.resolve('dist');
const base='/orima1995-creator.github.io/';
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(!url.pathname.startsWith(base)) throw Error();
    let file=path.resolve(root,decodeURIComponent(url.pathname.slice(base.length)));
    if(file!==root&&!file.startsWith(root+path.sep)) throw Error();
    if((await stat(file)).isDirectory()) file=path.join(file,'index.html');
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
    res.end(await readFile(file));
  }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const screens=process.env.HOME_SCREENSHOT_DIR;
if(screens) await mkdir(screens,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  for(const width of [320,390,768,1280]){
    const page=await browser.newPage({viewport:{width,height:1000}});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=400) errors.push(r.status()+' '+r.url());});
    await page.goto(origin+base,{waitUntil:'networkidle'});
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('.home-cover h1').innerText(),'VINTAGE\nALARM');
    assert.equal(await page.getByText('アラームを、腕へ。').count(),0);
    assert.equal(await page.locator('.home-cover-art img').count(),4);
    assert.equal(await page.locator('.home-index>a').count(),4);
    const geom=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    assert.equal(geom.client,geom.scroll,`${width}: horizontal overflow`);
    for(const img of await page.locator('.home-cover-art img').all()){
      assert(await img.evaluate(e=>e.complete&&e.naturalWidth>0),`${width}: art failed to load`);
    }
    assert.deepEqual(errors,[]);
    if(screens && width===390) await page.screenshot({path:path.join(screens,'home-v2-390.png'),fullPage:true});
    if(screens && width===1280) await page.screenshot({path:path.join(screens,'home-v2-1280.png'),fullPage:true});
    console.log(JSON.stringify({width,art:4,nav:4,result:'PASS'}));
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
