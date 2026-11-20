// Pre-reads the sample resume with the server extractor so the browser-only build can offer
// "Try a sample" without shipping a PDF. Run: npx tsx scripts/make-static-sample.ts
import fs from 'node:fs';
import { extractPdf } from '../src/server/extract.ts';
const r = await extractPdf(fs.readFileSync('public/samples/sample-resume.pdf'));
fs.writeFileSync('src/client/sample-static.json', JSON.stringify({ name: 'sample-resume.pdf', pages: r.pages, previews: r.previews, warnings: r.warnings, ms: r.ms }));
console.log('wrote src/client/sample-static.json', fs.statSync('src/client/sample-static.json').size, 'bytes');
