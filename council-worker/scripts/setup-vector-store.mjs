import fs from 'node:fs/promises';
import path from 'node:path';

const apiKey = process.env.OPENAI_API_KEY;
const args = process.argv.slice(2);

if (!apiKey) {
  console.error('OPENAI_API_KEY is required.');
  process.exit(1);
}
if (args.length < 1) {
  console.error('Usage: OPENAI_API_KEY=... npm run setup:vector -- "/path/to/file1.pdf" "/path/to/file2.pdf"');
  process.exit(1);
}

const base = 'https://api.openai.com/v1';
const headers = { Authorization: `Bearer ${apiKey}` };

async function json(res) {
  const body = await res.text();
  let parsed;
  try { parsed = body ? JSON.parse(body) : {}; } catch { parsed = { raw: body }; }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${JSON.stringify(parsed)}`);
  return parsed;
}

async function createVectorStore() {
  return json(await fetch(`${base}/vector_stores`, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'TypeC Council Project Mirror' })
  }));
}

async function uploadFile(filePath) {
  const bytes = await fs.readFile(filePath);
  const name = path.basename(filePath);
  const form = new FormData();
  form.set('purpose', 'assistants');
  form.set('file', new Blob([bytes], { type: 'application/pdf' }), name);

  return json(await fetch(`${base}/files`, {
    method: 'POST',
    headers,
    body: form
  }));
}

async function attachFile(vectorStoreId, fileId) {
  return json(await fetch(`${base}/vector_stores/${vectorStoreId}/files`, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ file_id: fileId })
  }));
}

async function listFiles(vectorStoreId) {
  return json(await fetch(`${base}/vector_stores/${vectorStoreId}/files?limit=100`, {
    headers
  }));
}

async function waitUntilReady(vectorStoreId, expected) {
  const deadline = Date.now() + 15 * 60 * 1000;
  while (Date.now() < deadline) {
    const result = await listFiles(vectorStoreId);
    const data = result.data || [];
    const done = data.filter(x => x.status === 'completed').length;
    const failed = data.filter(x => x.status === 'failed');

    process.stdout.write(`\rIndexing: ${done}/${expected} completed`);

    if (failed.length) {
      console.error('\nOne or more files failed to index:', failed);
      process.exit(1);
    }
    if (done >= expected) {
      process.stdout.write('\n');
      return;
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error('Timed out waiting for vector store indexing.');
}

console.log('Creating private OpenAI Vector Store...');
const vectorStore = await createVectorStore();
console.log(`Vector Store: ${vectorStore.id}`);

for (const filePath of args) {
  console.log(`Uploading: ${filePath}`);
  const file = await uploadFile(filePath);
  console.log(`  File ID: ${file.id}`);
  await attachFile(vectorStore.id, file.id);
}

await waitUntilReady(vectorStore.id, args.length);

console.log('\nREADY');
console.log(`COUNCIL_VECTOR_STORE_ID=${vectorStore.id}`);
console.log('Set this ID and OPENAI_API_KEY as Worker secrets, then deploy the Worker.');
