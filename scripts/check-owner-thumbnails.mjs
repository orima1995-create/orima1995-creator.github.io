import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.resolve('dist'),base='/orima1995-creator.github.io/';
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');if(!u.pathname.startsWith(base))throw Error();let file=path.resolve(root,decodeURIComponent(u.pathname.slice(base.length)));if(file!==root&&!file.startsWith(root+path.sep))throw Error();if((await stat(file)).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`,screens=process.env.OWNER_SCREENSHOT_DIR;
if(screens)await mkdir(screens,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:1000}});
 await page.goto(origin+base+'owners-notes/',{waitUntil:'networkidle'});
 await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('img[src*="owners-thumbnails"]').count(),2);
 for(const img of await page.locator('img[src*="owners-thumbnails"]').all()) assert(await img.evaluate(e=>e.complete&&e.naturalWidth>0));
 await page.screenshot({path:path.join(screens,'owners-thumbnails-390.png'),fullPage:true});
 await page.goto(origin+base+'history/#1950s',{waitUntil:'networkidle'});
 await page.evaluate(()=>document.fonts.ready);
 assert(await page.locator('[id="1950s"]').evaluate(e=>e.open));
 assert.equal(await page.locator('#1950s img[src*="owners-thumbnails"]').count(),2);
 await page.screenshot({path:path.join(screens,'history-1950s-thumbnails-390.png'),fullPage:true});
 const widths=await page.evaluate(()=>({c:document.documentElement.clientWidth,s:document.documentElement.scrollWidth}));
 assert(widths.s<=widths.c+40);
 console.log(JSON.stringify({result:'PASS',ownerThumbs:2}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
