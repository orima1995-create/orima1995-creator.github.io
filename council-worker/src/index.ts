interface Env {
  OPENAI_API_KEY: string;
  ALLOWED_ORIGIN?: string;
  COUNCIL_MODEL_FAST?: string;
  COUNCIL_MODEL_JUDGE?: string;
  COUNCIL_VECTOR_STORE_ID?: string;
  DB?: any;
}

type Resident = {
  id: string;
  name: string;
  role: string;
  bias: string;
};

type SourceInput = {
  id: string;
  name: string;
  kind: string;
  selected?: boolean;
};

type CouncilRequest = {
  title: string;
  body: string;
  mode: 'general' | 'watch' | 'business' | 'roast';
  engine: 'quick' | 'project' | 'deep-web-10';
  residents: Resident[];
  sources: SourceInput[];
};

type Citation = { title: string; url: string };

type Post = {
  resident: string;
  text: string;
  confidence: number;
  evidence: string;
  source?: string | null;
  citations?: Citation[];
  format?: 'text' | 'aa';
};

const jsonHeaders = (origin: string) => ({
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': origin,
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type',
  'cache-control': 'no-store'
});

function cleanOrigin(env: Env) {
  return env.ALLOWED_ORIGIN || '*';
}

function responseText(payload: any): string {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  const parts: string[] = [];
  for (const item of payload?.output || []) {
    if (item?.type !== 'message') continue;
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && typeof content?.text === 'string') parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

function extractCitations(payload: any): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const item of payload?.output || []) {
    if (item?.type === 'web_search_call') {
      for (const source of item?.action?.sources || []) {
        if (!source?.url || seen.has(source.url)) continue;
        seen.add(source.url);
        out.push({ title: source.title || source.url, url: source.url });
      }
    }
    if (item?.type === 'message') {
      for (const content of item?.content || []) {
        for (const ann of content?.annotations || []) {
          const url = ann?.url || ann?.url_citation?.url;
          const title = ann?.title || ann?.url_citation?.title || url;
          if (!url || seen.has(url)) continue;
          seen.add(url);
          out.push({ title, url });
        }
      }
    }
  }
  return out.slice(0, 12);
}

function parseConfidence(text: string): { text: string; confidence: number } {
  const match = text.match(/(?:CONFIDENCE|確信度)\s*[:：]\s*(\d{1,3})/i);
  const confidence = Math.max(0, Math.min(100, Number(match?.[1] || 65)));
  const cleaned = text.replace(/\n?(?:CONFIDENCE|確信度)\s*[:：]\s*\d{1,3}\s*%?/ig, '').trim();
  return { text: cleaned, confidence };
}

function toolsFor(req: CouncilRequest, env: Env) {
  const tools: any[] = [];
  const wantsWeb = req.engine === 'deep-web-10' || req.sources.some(s => s.id === 'web' || s.kind.toLowerCase().includes('web'));
  const wantsFiles = req.engine === 'project' || req.sources.some(s => s.kind.toLowerCase().includes('pdf') || s.kind.toLowerCase().includes('project'));

  if (wantsWeb) tools.push({ type: 'web_search', search_context_size: req.engine === 'deep-web-10' ? 'high' : 'medium' });
  if (wantsFiles && env.COUNCIL_VECTOR_STORE_ID) {
    tools.push({ type: 'file_search', vector_store_ids: [env.COUNCIL_VECTOR_STORE_ID], max_num_results: 12 });
  }
  return tools;
}

function watchSearchInstruction(mode: CouncilRequest['mode']) {
  if (mode !== 'watch') return '';
  return `\n時計研究では日本語だけに寄せない。必要に応じて英語・ドイツ語・フランス語へ展開し、ブランド名、モデル名、キャリバー名、旧表記、スペル揺れ、刻印語を分解して探す。販売文と一次資料を混ぜない。`;
}

function sourcePackText(req: CouncilRequest) {
  if (!req.sources.length) return '指定資料なし';
  return req.sources.map(s => `- ${s.name} (${s.kind})`).join('\n');
}

function independentPrompt(req: CouncilRequest, resident: Resident) {
  return `あなたは匿名掲示板の住民「${resident.name}」。\n役割: ${resident.role}\n弱点/偏り: ${resident.bias}\n\n議題: ${req.title}\n>>1本文:\n${req.body}\n\n指定SOURCE PACK:\n${sourcePackText(req)}\n\n重要ルール:\n- 他の住民の回答はまだ見えていない。独立して考える。\n- 自分の役割に固有の評価軸を使う。別人格の言い換えをしない。\n- 確認できた事実、資料記載、Web確認、推論、未確認を混ぜない。\n- 反証または「この結論が崩れる条件」を最低1つ考える。\n- ${req.engine === 'deep-web-10' ? '必ずWeb検索を使い、自分の担当軸に合う検索語を複数試す。最初の検索結果だけで終わらない。' : '必要な場合のみ利用可能なツールを使う。'}\n- SOURCE PACKがFile Searchに未接続なら、読んだふりをしない。\n- 掲示板レスとして読める自然な日本語で、長すぎず、しかし論点は削らない。\n${watchSearchInstruction(req.mode)}\n\n最後に別行で「CONFIDENCE: 0-100」を出す。`;
}

function critiquePrompt(req: CouncilRequest, resident: Resident, own: Post, targetName: string, target: Post) {
  return `あなたは匿名掲示板の住民「${resident.name}」。\n役割: ${resident.role}\n弱点/偏り: ${resident.bias}\n\n議題: ${req.title}\n\n自分の初回レス:\n${own.text}\n\n反論対象「${targetName}」のレス:\n${target.text}\n\nやること:\n1. 相手の最も強い点を1つ認める。\n2. 相手の見落とし、弱い根拠、評価軸の混同のどれかを具体的に指摘する。\n3. 必要なら再検索して、自分の初回見解を維持・修正・撤回のどれかに更新する。\n4. 冒頭は「>>n」相当のレスアンカー感がある文章にする。ただし番号自体はシステム側で付けるので数字は書かなくてよい。\n5. ${req.engine === 'deep-web-10' ? 'Web検索を再度使ってよい。初回検索と同じ結果に依存しない。' : '利用可能な資料・Webを必要に応じて確認する。'}\n${watchSearchInstruction(req.mode)}\n\n最後に別行で「CONFIDENCE: 0-100」を出す。`;
}

async function callOpenAI(env: Env, input: string, tools: any[], model: string) {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model,
      input,
      tools,
      reasoning: { effort: 'medium' },
      max_output_tokens: 2200
    })
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  return res.json();
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function independentRound(req: CouncilRequest, env: Env): Promise<Post[]> {
  const model = env.COUNCIL_MODEL_FAST || 'gpt-5.6-luna';
  const tools = toolsFor(req, env);
  const concurrency = req.engine === 'deep-web-10' ? 4 : 5;
  return mapLimit(req.residents, concurrency, async (resident, index) => {
    const payload = await callOpenAI(env, independentPrompt(req, resident), tools, model);
    const parsed = parseConfidence(responseText(payload));
    return {
      resident: resident.id,
      text: parsed.text,
      confidence: parsed.confidence,
      evidence: tools.length ? 'ツール利用可。根拠欄を確認' : 'モデル推論のみ',
      source: req.sources[index % Math.max(req.sources.length, 1)]?.name || null,
      citations: extractCitations(payload),
      format: 'text'
    };
  });
}

async function critiqueRound(req: CouncilRequest, env: Env, first: Post[]): Promise<Post[]> {
  const model = env.COUNCIL_MODEL_FAST || 'gpt-5.6-luna';
  const tools = toolsFor(req, env);
  const residentById = new Map(req.residents.map(r => [r.id, r]));
  const count = req.engine === 'deep-web-10' ? first.length : Math.min(5, first.length);
  const selected = first.slice(0, count);
  return mapLimit(selected, req.engine === 'deep-web-10' ? 4 : 5, async (own, index) => {
    const resident = residentById.get(own.resident)!;
    const target = first[(index + 1) % first.length];
    const targetName = residentById.get(target.resident)?.name || target.resident;
    const payload = await callOpenAI(env, critiquePrompt(req, resident, own, targetName, target), tools, model);
    const parsed = parseConfidence(responseText(payload));
    return {
      resident: resident.id,
      text: parsed.text,
      confidence: parsed.confidence,
      evidence: req.engine === 'deep-web-10' ? '相互反論・再検索フェーズ' : '相互反論フェーズ',
      source: null,
      citations: extractCitations(payload),
      format: 'text'
    };
  });
}

async function judge(req: CouncilRequest, env: Env, first: Post[], second: Post[]) {
  const model = env.COUNCIL_MODEL_JUDGE || env.COUNCIL_MODEL_FAST || 'gpt-5.6-terra';
  const digest = [...first, ...second].map((p, i) => `${i + 1}. ${p.resident}: ${p.text}`).join('\n\n');
  const prompt = `あなたは議長。多数決で結論を潰さない。\n議題: ${req.title}\n\n住民レス:\n${digest}\n\n出力は次の3点だけ。\n- 現在もっとも強い争点\n- 合意している点\n- まだ不足している情報\n\n断定できないことは断定しない。各項目は短く。`;
  const payload = await callOpenAI(env, prompt, [], model);
  return responseText(payload);
}

async function persistThread(env: Env, thread: any) {
  if (!env.DB) return null;
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  await env.DB.prepare('INSERT INTO threads (id, payload, created_at) VALUES (?, ?, ?)')
    .bind(id, JSON.stringify(thread), new Date().toISOString())
    .run();
  return id;
}

async function runCouncil(req: CouncilRequest, env: Env) {
  if (!req.title?.trim()) throw new Error('title is required');
  if (!Array.isArray(req.residents) || req.residents.length < 2) throw new Error('at least 2 residents are required');
  if (req.engine === 'deep-web-10' && req.residents.length < 10) throw new Error('deep-web-10 requires 10 residents');

  const first = await independentRound(req, env);
  const second = await critiqueRound(req, env, first);
  const summary = await judge(req, env, first, second);
  const thread = {
    title: req.title,
    body: req.body || '',
    created: new Date().toISOString(),
    engine: req.engine,
    mode: req.mode,
    posts: [first, second],
    summary
  };
  const shareId = await persistThread(env, thread);
  return { ...thread, shareId };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = cleanOrigin(env);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: jsonHeaders(origin) });

    if (request.method === 'GET' && url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true, openai: Boolean(env.OPENAI_API_KEY), vectorStore: Boolean(env.COUNCIL_VECTOR_STORE_ID), db: Boolean(env.DB) }), { headers: jsonHeaders(origin) });
    }

    if (request.method === 'GET' && url.pathname.startsWith('/api/thread/')) {
      if (!env.DB) return new Response(JSON.stringify({ error: 'DB not configured' }), { status: 501, headers: jsonHeaders(origin) });
      const id = url.pathname.split('/').pop();
      const row = await env.DB.prepare('SELECT payload FROM threads WHERE id = ?').bind(id).first();
      if (!row) return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: jsonHeaders(origin) });
      return new Response(row.payload, { headers: jsonHeaders(origin) });
    }

    if (request.method === 'POST' && url.pathname === '/api/council') {
      try {
        const req = await request.json() as CouncilRequest;
        const thread = await runCouncil(req, env);
        return new Response(JSON.stringify({ thread }), { headers: jsonHeaders(origin) });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error?.message || String(error) }), { status: 500, headers: jsonHeaders(origin) });
      }
    }

    return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: jsonHeaders(origin) });
  }
};
