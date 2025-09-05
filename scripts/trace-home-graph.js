#!/usr/bin/env node
// Trace dependencies starting from pages/index.tsx, following relative imports
// and mapping referenced API endpoints to pages/api files. Outputs two lists:
// - keep: files reachable from the homepage thread
// - quarantine: candidate files not in the keep set

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const exts = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const indexNames = ['index.tsx', 'index.ts', 'index.js', 'index.jsx'];

const isFile = (p) => {
  try { return fs.statSync(p).isFile(); } catch { return false; }
};
const isDir = (p) => {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
};

function resolveImport(fromFile, spec) {
  // Ignore node_modules/bare imports
  if (!spec.startsWith('.') && !spec.startsWith('@/') && !spec.startsWith('/')) {
    // Heuristic: treat top-level workspace dirs as root-relative
    const tops = ['lib/', 'utils/', 'components/', 'data/', 'context/', 'pages/'];
    if (tops.some(t => spec.startsWith(t))) {
      // eslint-disable-next-line no-var
      var base = path.join(ROOT, spec);
    } else {
      return null;
    }
  }
  // Map @/ to project root
  // Reuse base if set by heuristic, else compute from spec
  // eslint-disable-next-line no-var
  var base2;
  if (spec.startsWith('@/')) {
    base2 = path.join(ROOT, spec.replace(/^@\//, ''));
  } else if (spec.startsWith('/')) {
    base2 = path.join(ROOT, spec.replace(/^\//, ''));
  } else {
    base2 = base || path.resolve(path.dirname(fromFile), spec);
  }

  // If explicit file with extension
  if (isFile(base2)) return base2;
  for (const ext of exts) {
    if (isFile(base2 + ext)) return base2 + ext;
  }
  // Directory with index.*
  if (isDir(base2)) {
    for (const idx of indexNames) {
      const cand = path.join(base2, idx);
      if (isFile(cand)) return cand;
    }
  }
  return null;
}

function parseImports(src) {
  const specs = new Set();
  const re1 = /import\s+[^'"\n]*from\s+['"]([^'"\n]+)['"]/g;
  const re2 = /import\(\s*['"]([^'"\n]+)['"]\s*\)/g;
  const re3 = /require\(\s*['"]([^'"\n]+)['"]\s*\)/g;
  let m;
  while ((m = re1.exec(src))) specs.add(m[1]);
  while ((m = re2.exec(src))) specs.add(m[1]);
  while ((m = re3.exec(src))) specs.add(m[1]);
  return Array.from(specs);
}

function parseApiEndpoints(src) {
  const urls = new Set();
  const re = /[`'\"]\/api\/([a-zA-Z0-9_\-\/]+)(?=[`'\"\?])/g;
  let m;
  while ((m = re.exec(src))) urls.add(m[1]);
  return Array.from(urls);
}

function findApiFile(apiPath) {
  // Try exact match under pages/api
  const base = path.join(ROOT, 'pages', 'api', apiPath);
  const tryPaths = [];
  // If apiPath has segments, try file.ts at end
  tryPaths.push(base);
  for (const ext of exts) tryPaths.push(base + ext);
  // Also try when apiPath references a directory with index
  if (isDir(base)) {
    for (const idx of indexNames) tryPaths.push(path.join(base, idx));
  }
  // Resolve first that exists
  for (const p of tryPaths) if (isFile(p)) return p;
  return null;
}

function walk(startFiles) {
  const q = [...startFiles];
  const seen = new Set();
  const unresolved = new Set();
  while (q.length) {
    const file = q.shift();
    if (seen.has(file)) continue;
    if (!isFile(file)) continue;
    seen.add(file);
    const src = fs.readFileSync(file, 'utf8');
    // Track API endpoints
    for (const api of parseApiEndpoints(src)) {
      const apiFile = findApiFile(api);
      if (apiFile && !seen.has(apiFile)) q.push(apiFile);
    }
    // Follow imports
    for (const spec of parseImports(src)) {
      // Skip styles/assets
      if (spec.endsWith('.css') || spec.endsWith('.scss') || spec.startsWith('next/') || spec.startsWith('react')) continue;
      const target = resolveImport(file, spec);
      if (target) {
        if (!seen.has(target)) q.push(target);
      } else {
        // console.log('Unresolved', file, '->', spec);
        unresolved.add(spec);
      }
    }
  }
  return { seen, unresolved };
}

function listAllRepoFiles() {
  // Prefer ripgrep if available
  try {
    const { execSync } = require('child_process');
    const out = execSync('rg --files', { cwd: ROOT }).toString();
    return out.split('\n').filter(Boolean).map(p => path.join(ROOT, p));
  } catch {
    // Fallback: walk FS shallowly under common roots
    const roots = ['pages', 'components', 'lib', 'utils', 'types', 'data', 'public', 'app', 'scripts'];
    const files = [];
    const walkDir = (dir) => {
      if (!isDir(dir)) return;
      for (const e of fs.readdirSync(dir)) {
        const p = path.join(dir, e);
        try {
          const st = fs.statSync(p);
          if (st.isDirectory()) walkDir(p);
          else files.push(p);
        } catch {}
      }
    };
    roots.forEach(r => walkDir(path.join(ROOT, r)));
    return files;
  }
}

(function main() {
  const args = process.argv.slice(2);
  const seeds = args.length ? args : ['pages/index.tsx'];
  const startFiles = seeds.map((p) => path.isAbsolute(p) ? p : path.join(ROOT, p));
  const { seen, unresolved } = walk(startFiles);
  const keep = Array.from(seen).sort();
  const all = listAllRepoFiles();
  const ignoreGlobs = [
    '/.next/', '/node_modules/', '/.git/', '/.vercel/', '/dist/', '/build/', '/coverage/', '/.turbo/', '/.cache/'
  ];
  const isIgnored = (p) => ignoreGlobs.some(g => p.includes(g.replace(/\//g, path.sep)));
  const quarantine = all.filter(p => !isIgnored(p) && !seen.has(p)).sort();

  console.log('=== KEEP (reachable from pages/index.tsx) ===');
  keep.forEach(p => console.log(path.relative(ROOT, p)));
  if (unresolved.size) {
    console.log('\n=== Unresolved specifiers (likely node_modules or path aliases) ===');
    Array.from(unresolved).sort().forEach(s => console.log(s));
  }
  console.log('\n=== QUARANTINE CANDIDATES (not reachable from homepage thread) ===');
  quarantine.forEach(p => console.log(path.relative(ROOT, p)));
})();
