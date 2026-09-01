const fs = require('fs');
const path = require('path');

const root = process.cwd();
const chunksDir = path.join(root, 'src', 'data', 'smartwatch-art');
const output = path.join(root, 'public', 'images', 'history', 'smartwatch-current.webp');

const chunks = fs.readdirSync(chunksDir)
  .filter((name) => name.endsWith('.txt'))
  .sort()
  .map((name) => fs.readFileSync(path.join(chunksDir, name), 'utf8').trim());

const encoded = chunks.join('');
const binary = Buffer.from(encoded, 'base64');

if (binary.length < 30000 || binary.subarray(0, 4).toString('ascii') !== 'RIFF' || binary.subarray(8, 12).toString('ascii') !== 'WEBP') {
  throw new Error(`Invalid smartwatch artwork: ${binary.length} bytes`);
}

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, binary);
console.log(`Prepared smartwatch artwork: ${binary.length} bytes`);
