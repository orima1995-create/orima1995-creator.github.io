interface Env {
  OPENAI_API_KEY: string;
  ALLOWED_ORIGIN?: string;
  COUNCIL_MODEL_FAST?: string;
  COUNCIL_MODEL_JUDGE?: string;
  COUNCIL_VECTOR_STORE_ID?: string;
  DB?: any;
}
type Resident={id:string;name:string;role:string;bias:string};
type SourceInput={id:string;name:string;kind:string;selected?:boolean};
type ThreadRef={title:string;shareId?:string|null;conclusion?:string};
type CouncilRequest={title:string;body:string;mode:'general'|'watch'|'business'|'roast';engine:'quick'|'project'|'deep-web-10';residents:Resident[];sources:SourceInput[];previousThread?:ThreadRef|null};
type ContinueRequest={thread:any;mode:CouncilRequest['mode'];engine:CouncilRequest['engine'];residents:Resident[];sources:SourceInput[];focus?:string};
type Citation={title:string;url:string};
type Post={resident:string;text:string;confidence:number;evidence:string;citations?:Citation[];format?:'text'|'aa';replyTo?:number;conclusion?:boolean;continue?:boolean};

const FIXED_PROJECT_SOURCES:SourceInput[]=[
  {id:'alarm-am-arm',name:'Alarm am Arm',kind:'Project PDF'},
  {id:'alarm-wristwatch',name:'The Alarm Wristwatch',kind:'Project PDF'},
  {id:'typec-rules',name:'TypeC project rules',kind:'Project instructions'}
];
const PROJECT_RULES=`このMVPはTypeCプロジェクト専用。毎回次を固定ルールとして扱う。
- 目の前の資料・Project資料・Web・一般論の順で根拠を扱う。
- 確認済み、資料記載、Web確認、専門家意見、推論、未確認を混ぜない。
- 未確認を自然な物語で補完しない。反証資料も探す。
- 時計研究では画像・PDF・表・メール・修理記録・市場資料など参照対象があるなら、一般論より先に確認する。
- 数字や結論が食い違う時は転記、計算、後続修正、別資料、見積と実費、返金・補償、同一個体混同を疑う。
- 発想は広くてよいが、仮説は仮説と明示する。`;

const headers=(origin:string)=>({'content-type':'application/json; charset=utf-8','access-control-allow-origin':origin,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type','cache-control':'no-store'});
const origin=(env:Env)=>env.ALLOWED_ORIGIN||'*';
function responseText(p:any){if(typeof p?.output_text==='string')return p.output_text.trim();const out:string[]=[];for(const item of p?.output||[])if(item?.type==='message')for(const c of item?.content||[])if(c?.type==='output_text'&&typeof c.text==='string')out.push(c.text);return out.join('\n').trim()}
function citations(p:any){const seen=new Set<string>(),out:Citation[]=[];for(const item of p?.output||[]){if(item?.type==='web_search_call')for(const s of item?.action?.sources||[]){if(s?.url&&!seen.has(s.url)){seen.add(s.url);out.push({title:s.title||s.url,url:s.url})}}if(item?.type==='message')for(const c of item?.content||[])for(const a of c?.annotations||[]){const url=a?.url||a?.url_citation?.url,title=a?.title||a?.url_citation?.title||url;if(url&&!seen.has(url)){seen.add(url);out.push({title,url})}}}return out.slice(0,14)}
function parseMeta(raw:string){
  const conf=raw.match(/CONFIDENCE\s*[:：]\s*(\d{1,3})/i);const target=raw.match(/TARGET\s*[:：]\s*(\d+)/i);const cont=raw.match(/CONTINUE\s*[:：]\s*(YES|NO)/i);
  const text=raw.replace(/^\s*(?:CONFIDENCE|TARGET|STANCE|CONTINUE)\s*[:：].*$/gim,'').replace(/^\s*\n/gm,'').trim();
  return {text,confidence:Math.max(0,Math.min(100,Number(conf?.[1]||65))),target:target?Number(target[1]):undefined,continue:cont?.[1]?.toUpperCase()==='YES'};
}
function toolset(req:CouncilRequest,env:Env){const tools:any[]=[];const web=req.engine==='deep-web-10'||req.sources.some(s=>s.id==='web'||s.kind.toLowerCase().includes('web'));if(web)tools.push({type:'web_search',search_context_size:req.engine==='deep-web-10'?'high':'medium'});if(env.COUNCIL_VECTOR_STORE_ID)tools.push({type:'file_search',vector_store_ids:[env.COUNCIL_VECTOR_STORE_ID],max_num_results:18});return tools}
function sourceText(req:CouncilRequest){const seen=new Set<string>();const all=[...FIXED_PROJECT_SOURCES,...req.sources].filter(x=>{if(seen.has(x.id))return false;seen.add(x.id);return true});return all.map(s=>`- ${s.name} (${s.kind})`).join('\n')}
function watchRule(req:CouncilRequest){return req.mode==='watch'?'時計研究では日本語だけに寄せず、必要に応じ英語・ドイツ語・フランス語、旧表記、キャリバー、特許、刻印語まで展開する。販売文・専門家意見・一次資料を分離する。':''}
async function call(env:Env,input:string,tools:any[],model:string,effort:'low'|'medium'|'high'='medium'){const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${env.OPENAI_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({model,input,tools,reasoning:{effort},max_output_tokens:3200})});if(!r.ok)throw new Error(`OpenAI ${r.status}: ${await r.text()}`);return r.json()}
async function mapLimit<T,R>(items:T[],limit:number,fn:(v:T,i:number)=>Promise<R>){const out=new Array<R>(items.length);let cursor=0;await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(true){const i=cursor++;if(i>=items.length)return;out[i]=await fn(items[i],i)}}));return out}
function residentMap(req:CouncilRequest){return new Map(req.residents.map(r=>[r.id,r]))}

function firstPrompt(req:CouncilRequest,r:Resident){const len=req.engine==='deep-web-10'?'500〜1000':'350〜750';const prev=req.previousThread?`\n前スレ情報:\n- ${req.previousThread.title}\n- 前スレ暫定結論: ${req.previousThread.conclusion||'未記載'}\n`:'';return `あなたは匿名掲示板の住民「${r.name}」。役割は「${r.role}」、自覚すべき偏りは「${r.bias}」。\n\nスレタイ: ${req.title}\n>>1:\n${req.body}${prev}\n\nSOURCE PACK:\n${sourceText(req)}\n\n他住民のレスはまだ見ない。自分の判断軸だけで独立に考える。${req.engine==='deep-web-10'?'必ずWeb検索を使い、検索語を複数変え、反証資料も探す。':'必要なら利用可能な資料/検索を使う。'} File Search未接続の資料を読んだふりしない。確認済み・資料記載・Web確認・推論・未確認を混ぜない。反証条件を最低1つ入れる。${watchRule(req)}\n\n掲示板レスとして${len}字程度、2〜5段落。短い感想で終わらせず、自分なりの暫定結論まで出す。\n\n固定Projectルール:\n${PROJECT_RULES}\n\n最後に CONFIDENCE: 0-100。`}
function digest(posts:Post[],req:CouncilRequest){const rm=residentMap(req);return posts.map((p,i)=>`${i+2} 名前:${rm.get(p.resident)?.name||p.resident}\n${p.text}`).join('\n\n')}
function replyPrompt(req:CouncilRequest,r:Resident,own:Post,first:Post[]){return `あなたは「${r.name}」。初回見解:\n${own.text}\n\n現在のレス:\n${digest(first,req)}\n\n全部読んだ上で、自分が最も返す価値があるレスを1つ自分で選ぶ。単なる賛同ではなく、相手の強い点を認めた上で、弱点・反証・評価軸の衝突を具体化する。自説も維持/修正/撤回のどれでもよい。${req.engine==='deep-web-10'?'必要ならWebを再検索し、初回と別の検索語・別ソースも使う。':''}${watchRule(req)}\n\n350〜850字、2〜5段落。先頭のアンカー文字列は本文に書かない。同じ主張の言い換えは禁止。新しい証拠・反例・定義修正・譲歩のどれかを追加する。\n\n固定Projectルール:\n${PROJECT_RULES}\n\n最後に以下4行を必ず付ける。\nTARGET: 返信したいレス番号\nSTANCE: MAINTAIN または REVISE または WITHDRAW\nCONTINUE: YES または NO\nCONFIDENCE: 0-100`}
function discussionPrompt(req:CouncilRequest,r:Resident,posts:Post[],wave:number){
  const rm=residentMap(req);
  const text=posts.map((p,i)=>`${i+2} 名前:${rm.get(p.resident)?.name||p.resident}${p.replyTo?` >>${p.replyTo}`:''}\n${p.text}`).join('\n\n');
  return `あなたは「${r.name}」。スレはすでに進行中。ここまで全部読め。\n\n${text}\n\n
第${wave+1}段階だが、その段階名を本文には絶対に書かない。2ch/5chの普通のレスとして書く。
まだ返す価値があるレスを1つ自分で選ぶ。前と同じ主張の反復は禁止。新しい証拠、反例、定義の修正、譲歩、相手の誤読指摘のどれかを必ず追加する。
自説を維持する必要はない。相手が強ければ修正・撤回してよい。
${req.engine==='deep-web-10'?'必要ならWebを再検索し、前回とは別の検索語または別ソースを使う。':''}
${watchRule(req)}

固定Projectルール:
${PROJECT_RULES}

350〜850字、2〜5段落。最後に以下3行を必ず付ける。
TARGET: 返信したいレス番号
CONTINUE: YES または NO
CONFIDENCE: 0-100`;
}

async function firstWave(req:CouncilRequest,env:Env){const model=env.COUNCIL_MODEL_FAST||'gpt-5.6-luna',tools=toolset(req,env);return mapLimit(req.residents,req.engine==='deep-web-10'?4:6,async(r)=>{const p=await call(env,firstPrompt(req,r),tools,model,req.engine==='deep-web-10'?'high':'medium');const m=parseMeta(responseText(p));return {resident:r.id,text:m.text,confidence:m.confidence,evidence:tools.length?'ツール利用。根拠欄参照':'モデル推論のみ',citations:citations(p),format:r.id==='aa'?'aa':'text'} as Post})}
async function replyWave(req:CouncilRequest,env:Env,first:Post[]){const model=env.COUNCIL_MODEL_FAST||'gpt-5.6-luna',tools=toolset(req,env),rm=residentMap(req);const count=req.engine==='deep-web-10'?first.length:Math.min(first.length,6);return mapLimit(first.slice(0,count),req.engine==='deep-web-10'?4:6,async(own)=>{const r=rm.get(own.resident)!;const p=await call(env,replyPrompt(req,r,own,first),tools,model,req.engine==='deep-web-10'?'high':'medium');const m=parseMeta(responseText(p));const max=first.length+1;const target=Math.max(2,Math.min(max,m.target||2));return {resident:r.id,text:m.text,confidence:m.confidence,evidence:req.engine==='deep-web-10'?'Web再検索を許可した返信':'全レスを読んで返信先を自己選択',citations:citations(p),replyTo:target,continue:m.continue,format:'text'} as Post})}
async function discussionWave(req:CouncilRequest,env:Env,posts:Post[],activeIds:string[],wave:number){
  const model=env.COUNCIL_MODEL_FAST||'gpt-5.6-luna',tools=toolset(req,env),rm=residentMap(req);
  const maxActive=req.engine==='deep-web-10'?10:req.engine==='project'?8:6;
  let ids=[...new Set(activeIds)].filter(id=>rm.has(id)).slice(0,maxActive);
  if(ids.length<3){
    const fallback=req.residents.map(r=>r.id).filter(id=>!ids.includes(id)).slice(0,3-ids.length);
    ids=[...ids,...fallback];
  }
  return mapLimit(ids,req.engine==='deep-web-10'?4:6,async(id)=>{
    const r=rm.get(id)!;
    const p=await call(env,discussionPrompt(req,r,posts,wave),tools,model,req.engine==='deep-web-10'?'high':'medium');
    const m=parseMeta(responseText(p));
    const max=posts.length+1;
    return {resident:r.id,text:m.text,confidence:m.confidence,evidence:req.engine==='deep-web-10'?'継続議論・必要に応じWeb再検索':'継続議論',citations:citations(p),replyTo:Math.max(2,Math.min(max,m.target||2)),continue:m.continue,format:'text'} as Post;
  });
}

async function chairPost(req:CouncilRequest,env:Env,posts:Post[]){const model=env.COUNCIL_MODEL_JUDGE||'gpt-5.6-terra',rm=residentMap(req);const thread=posts.map((p,i)=>`${i+2} 名前:${rm.get(p.resident)?.name||p.resident}${p.replyTo?` >>${p.replyTo}`:''}\n${p.text}`).join('\n\n');const prompt=`匿名掲示板の最後に書き込む議長役。議題「${req.title}」。\n\n全レス:\n${thread}\n\n多数決で丸めず、強い根拠と反証を比較して裁定する。500〜1000字程度。本文の中に「結論」「その理由」「残る反対意見」「まだ未確認」を自然に含める。別カード用の箇条書き要約ではなく、普通の一つのレスとして書く。断定できないものは条件付き結論にする。CONFIDENCE: 0-100。`;const p=await call(env,prompt,[],model,'high');const m=parseMeta(responseText(p));return {resident:'chair',text:m.text,confidence:m.confidence,evidence:'全レスを比較した裁定',citations:[],conclusion:true,format:'text'} as Post}


function reqFromContinue(input:ContinueRequest):CouncilRequest{
  return {
    title:input.thread?.title||'無題のスレ',
    body:input.thread?.body||'',
    mode:input.mode,
    engine:input.engine,
    residents:input.residents,
    sources:input.sources||[],
    previousThread:input.thread?.previousThread||null
  };
}

async function extendRun(input:ContinueRequest,env:Env){
  if(!input.thread?.title||!Array.isArray(input.thread?.posts))throw new Error('thread is required');
  const req=reqFromContinue(input);
  const posts:Post[]=[...input.thread.posts];
  const rm=residentMap(req);
  const active=req.residents
    .filter(r=>r.id!=='aa')
    .slice(0,req.engine==='deep-web-10'?10:req.engine==='project'?8:6)
    .map(r=>r.id);

  const focus=(input.focus||'').trim();
  if(focus){
    posts.push({
      resident:'op',
      text:`>>1\n追加でここを掘ってほしい：${focus}`,
      confidence:100,
      evidence:'ユーザー追記',
      format:'text'
    } as Post);
  }

  const extraWaves=req.engine==='deep-web-10'?3:req.engine==='project'?2:2;
  let ids=[...active];
  for(let wave=0;wave<extraWaves;wave++){
    const next=await discussionWave(req,env,posts,ids,50+wave);
    posts.push(...next);
    ids=next.filter(p=>p.continue).map(p=>p.resident);
    if(ids.length<3){
      ids=next.slice().sort((a,b)=>a.confidence-b.confidence)
        .slice(0,Math.min(req.engine==='deep-web-10'?7:5,next.length))
        .map(p=>p.resident)
        .filter(id=>rm.has(id));
    }
  }

  const revised=await chairPost(req,env,posts);
  revised.evidence='延長後の全レスを比較した更新裁定';
  const thread={...input.thread,posts:[...posts,revised],updatedAt:new Date().toISOString(),extended:true};
  const shareId=await persist(env,thread);
  return {...thread,shareId};
}

function stripCodeFence(raw:string){
  return raw.trim().replace(/^\`\`\`(?:json)?\s*/i,'').replace(/\s*\`\`\`$/,'').trim();
}

async function nextThreadDraft(input:ContinueRequest,env:Env){
  if(!input.thread?.title||!Array.isArray(input.thread?.posts))throw new Error('thread is required');
  const req=reqFromContinue(input);
  const rm=residentMap(req);
  const threadText=input.thread.posts.map((p:Post,i:number)=>`${i+2} 名前:${p.resident==='chair'?'名無しさん＠議長':(rm.get(p.resident)?.name||p.resident)}${p.replyTo?` >>${p.replyTo}`:''}\n${p.text}`).join('\n\n');
  const model=env.COUNCIL_MODEL_JUDGE||'gpt-5.6-terra';
  const prompt=`次スレの>>1を作る編集役。前スレ「${input.thread.title}」の全レスを読め。

前スレ:
${threadText}

目的は単なるPart2ではなく、前スレで残った最重要の未解決点を一段深く掘ること。
次スレのスレタイは具体的で、前スレより論点を狭くする。
>>1は2ch/5chの次スレ冒頭として自然にし、以下を簡潔に含める。
- 前スレの暫定結論
- 最も強かった根拠
- 最も強かった反証
- まだ未確認のこと
- このスレで決着させたい問い
- 「前スレ：${input.thread.title}」という行

AI的な「議論フェーズ」「深掘りフェーズ」等の見出しは使わない。
断定できないことを断定しない。
ユーザーが編集してから立てる草案なので、問いを明確に残す。

JSONだけ返す:
{"title":"次スレタイ","body":">>1本文"}`;

  const p=await call(env,prompt,[],model,'high');
  const raw=stripCodeFence(responseText(p));
  let parsed:any;
  try{parsed=JSON.parse(raw)}catch{
    parsed={
      title:`${input.thread.title} Part2`,
      body:`前スレ：${input.thread.title}\n\n前スレの暫定結論を踏まえ、未解決点をさらに検証する。`
    };
  }
  const chair=[...input.thread.posts].reverse().find((x:Post)=>x.conclusion||x.resident==='chair');
  return {
    title:String(parsed.title||`${input.thread.title} Part2`).trim(),
    body:String(parsed.body||'').trim(),
    previousThread:{
      title:input.thread.title,
      shareId:input.thread.shareId||null,
      conclusion:chair?.text||''
    }
  };
}

async function persist(env:Env,thread:any){if(!env.DB)return null;const id=crypto.randomUUID().replace(/-/g,'').slice(0,12);await env.DB.prepare('INSERT INTO threads (id, payload, created_at) VALUES (?, ?, ?)').bind(id,JSON.stringify(thread),new Date().toISOString()).run();return id}
async function run(req:CouncilRequest,env:Env){
  if(!req.title?.trim())throw new Error('title is required');
  if(!Array.isArray(req.residents)||req.residents.length<2)throw new Error('at least 2 residents are required');
  if(req.engine==='deep-web-10'&&req.residents.length<10)throw new Error('deep-web-10 requires 10 residents');

  const first=await firstWave(req,env);
  const direct=await replyWave(req,env,first);
  const posts=[...first,...direct];

  const extraWaves=req.engine==='deep-web-10'?4:req.engine==='project'?3:2;
  let active=direct.filter(p=>p.continue).map(p=>p.resident);
  if(active.length<3)active=direct.slice().sort((a,b)=>a.confidence-b.confidence).slice(0,Math.min(5,direct.length)).map(p=>p.resident);

  for(let wave=0;wave<extraWaves;wave++){
    const next=await discussionWave(req,env,posts,active,wave);
    posts.push(...next);
    active=next.filter(p=>p.continue).map(p=>p.resident);
    if(active.length<3){
      active=next.slice().sort((a,b)=>a.confidence-b.confidence).slice(0,Math.min(req.engine==='deep-web-10'?6:4,next.length)).map(p=>p.resident);
    }
  }

  const chair=await chairPost(req,env,posts);
  const thread={title:req.title,body:req.body||'',created:new Date().toISOString(),engine:req.engine,mode:req.mode,posts:[...posts,chair],projectMirror:true,previousThread:req.previousThread||null};
  const shareId=await persist(env,thread);
  return {...thread,shareId};
}

export default{async fetch(request:Request,env:Env):Promise<Response>{const o=origin(env),url=new URL(request.url);if(request.method==='OPTIONS')return new Response(null,{status:204,headers:headers(o)});if(request.method==='GET'&&url.pathname==='/health')return new Response(JSON.stringify({ok:true,openai:Boolean(env.OPENAI_API_KEY),vectorStore:Boolean(env.COUNCIL_VECTOR_STORE_ID),db:Boolean(env.DB)}),{headers:headers(o)});if(request.method==='GET'&&url.pathname.startsWith('/api/thread/')){if(!env.DB)return new Response(JSON.stringify({error:'DB not configured'}),{status:501,headers:headers(o)});const id=url.pathname.split('/').pop();const row=await env.DB.prepare('SELECT payload FROM threads WHERE id = ?').bind(id).first();if(!row)return new Response(JSON.stringify({error:'not found'}),{status:404,headers:headers(o)});return new Response(row.payload,{headers:headers(o)})}if(request.method==='POST'&&url.pathname==='/api/council'){try{const req=await request.json() as CouncilRequest;const result=await run(req,env);return new Response(JSON.stringify(result),{headers:headers(o)})}catch(e:any){return new Response(JSON.stringify({error:e?.message||String(e)}),{status:500,headers:headers(o)})}}if(request.method==='POST'&&url.pathname==='/api/extend'){try{const req=await request.json() as ContinueRequest;const result=await extendRun(req,env);return new Response(JSON.stringify(result),{headers:headers(o)})}catch(e:any){return new Response(JSON.stringify({error:e?.message||String(e)}),{status:500,headers:headers(o)})}}if(request.method==='POST'&&url.pathname==='/api/next-thread'){try{const req=await request.json() as ContinueRequest;const result=await nextThreadDraft(req,env);return new Response(JSON.stringify(result),{headers:headers(o)})}catch(e:any){return new Response(JSON.stringify({error:e?.message||String(e)}),{status:500,headers:headers(o)})}}return new Response(JSON.stringify({error:'not found'}),{status:404,headers:headers(o)})}}
