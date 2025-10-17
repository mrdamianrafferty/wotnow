#!/usr/bin/env node
/**
 * Ensures the minimal Next.js manifest files exist before the dev server boots.
 * Without them, first-hit API requests can throw ENOENT while Next.js is compiling.
 */
const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

const manifests = [
  {
    file: ['.next', 'build-manifest.json'],
    content: {
      polyfillFiles: [],
      devFiles: [],
      ampDevFiles: [],
      lowPriorityFiles: [],
      pages: {},
      ampFirstPages: []
    }
  },
  {
    file: ['.next', 'prerender-manifest.json'],
    content: {
      version: 4,
      routes: {},
      dynamicRoutes: {},
      preview: {
        previewModeId: 'placeholder',
        previewModeSigningKey: 'placeholder',
        previewModeEncryptionKey: 'placeholder'
      },
      notFoundRoutes: []
    }
  },
  {
    file: ['.next', 'routes-manifest.json'],
    content: {
      version: 5,
      pages404: true,
      basePath: '',
      redirects: [],
      rewrites: {
        beforeFiles: [],
        afterFiles: [],
        fallback: []
      },
      headers: [],
      dynamicRoutes: [],
      dataRoutes: [],
      staticRoutes: [],
      rscRoutes: [],
      catchAllMiddleware: []
    }
  }
];

async function ensureFile(manifest) {
  const filePath = path.join(rootDir, ...manifest.file);
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return;
  } catch {
    // File missing; fall through and create the stub.
  }

  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(filePath, JSON.stringify(manifest.content, null, 2), 'utf8');
}

(async () => {
  await Promise.all(manifests.map(ensureFile));
})().catch((error) => {
  console.error('[ensure-next-manifests] Failed to write manifests:', error);
  process.exit(1);
});
