import { mkdirSync, writeFileSync } from 'node:fs';
import { createApp } from '../src/app.js';

// Saves the digest page as one self-contained HTML file for review (plan § 3, ADR 0003).
// var/ is git-ignored, so the preview never lands in the repo.
const night = process.argv[2] ?? '2026-10-28';
const outDir = 'var/preview';

const res = await createApp().request(`/digest/${night}`);
if (res.status !== 200) {
  throw new Error(`/digest/${night} answered ${res.status}`);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/index.html`, await res.text());
console.log(`saved /digest/${night} to ${outDir}/index.html`);
