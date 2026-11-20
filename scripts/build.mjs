// Builds the browser bundle (esbuild) and the stylesheet (Tailwind CSS v4 compile API).
// Usage: node scripts/build.mjs [--watch]
import { build, context } from 'esbuild';
import { compile } from 'tailwindcss';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATIC = process.argv.includes('--static');
const outDir = path.join(root, STATIC ? 'dist-static' : 'dist');
const require = createRequire(import.meta.url);
fs.mkdirSync(outDir, { recursive: true });

function walk(dir, exts, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, acc);
    else if (exts.some((x) => p.endsWith(x))) acc.push(p);
  }
  return acc;
}

// Tailwind v4 normally scans with @tailwindcss/oxide; we scan class candidates ourselves.
async function buildCss() {
  const twDir = path.dirname(require.resolve('tailwindcss/package.json'));
  const input = fs.readFileSync(path.join(root, 'src/client/styles.css'), 'utf8');
  const compiler = await compile(input, {
    base: root,
    loadStylesheet: async (id, base) => {
      let p;
      if (id === 'tailwindcss') p = path.join(twDir, 'index.css');
      else if (id.startsWith('tailwindcss/')) p = path.join(twDir, id.slice('tailwindcss/'.length));
      else p = path.resolve(base, id);
      return { path: p, base: path.dirname(p), content: fs.readFileSync(p, 'utf8') };
    },
  });
  const candidates = new Set();
  for (const file of walk(path.join(root, 'src/client'), ['.tsx', '.ts', '.html'])) {
    const src = fs.readFileSync(file, 'utf8');
    for (const tok of src.split(/[\s"'`{}<>;=]+/)) {
      if (tok && tok.length < 120 && /^[!a-z0-9\-:[\]#./%_@&>*(),]+$/i.test(tok)) candidates.add(tok);
      // Also try the token with trailing punctuation from JS expressions removed.
      const t2 = tok.replace(/[),]+$/, '');
      if (t2 && t2 !== tok && /^[!a-z0-9\-:[\]#./%_@&>*(),]+$/i.test(t2)) candidates.add(t2);
    }
  }
  const css = compiler.build([...candidates]);
  fs.writeFileSync(path.join(outDir, 'app.css'), css);
  return css.length;
}

// Browser-only build: one self-contained HTML file with the script and styles inlined.
function inlineStatic() {
  const js = fs.readFileSync(path.join(outDir, 'app.js'), 'utf8').replace(/<\/script/gi, '<\\/script').replace(/\/\/# sourceMappingURL=.*$/m, '');
  const css = fs.readFileSync(path.join(outDir, 'app.css'), 'utf8').replace(/<\/style/gi, '<\\/style');
  let html = fs.readFileSync(path.join(root, 'src/client/index.html'), 'utf8').split('\n').filter((l) => !l.includes('/brand/')).join('\n');
  html = html.replace('<link rel="stylesheet" href="/app.css" />', () => `<style>${css}</style>`);
  html = html.replace('<script type="module" src="/app.js"></script>', () => `<script type="module">${js}</script>`);
  fs.writeFileSync(path.join(outDir, 'alignly.html'), html);
  return html.length;
}

const jsOptions = {
  entryPoints: [path.join(root, 'src/client/main.tsx')],
  bundle: true,
  format: 'esm',
  outfile: path.join(outDir, 'app.js'),
  minify: !process.argv.includes('--watch'),
  sourcemap: true,
  target: ['es2020', 'safari15'],
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"', __STATIC__: String(STATIC) },
  loader: { '.txt': 'text', '.json': 'json' },
  logLevel: 'warning',
};

fs.copyFileSync(path.join(root, 'src/client/index.html'), path.join(outDir, 'index.html'));

if (process.argv.includes('--watch')) {
  const ctx = await context(jsOptions);
  await ctx.watch();
  await buildCss();
  console.log('Watching client sources (CSS rebuilds on restart).');
} else {
  await build({ ...jsOptions, sourcemap: !STATIC });
  const n = await buildCss();
  if (STATIC) {
    const size = inlineStatic();
    console.log(`Built dist-static/alignly.html (${(size / 1024).toFixed(0)} KB), a self-contained browser-only page`);
    process.exit(0);
  }
  const js = fs.statSync(path.join(outDir, 'app.js')).size;
  console.log(`Built dist/app.js (${(js / 1024).toFixed(0)} KB) and dist/app.css (${(n / 1024).toFixed(0)} KB)`);
}
