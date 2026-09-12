import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import express, { Router } from 'express';

export const BUNDLES_OUT_DIR = path.resolve(__dirname, '../../bundles');

// Ensure a manifest exists even before `npm run build:bundles` has been run once, so the
// server doesn't 404 the whole /bundles namespace on a fresh checkout.
if (!existsSync(BUNDLES_OUT_DIR)) {
  mkdirSync(BUNDLES_OUT_DIR, { recursive: true });
}
const manifestPath = path.join(BUNDLES_OUT_DIR, 'manifest.json');
if (!existsSync(manifestPath)) {
  writeFileSync(manifestPath, JSON.stringify({ configs: {}, validators: {} }, null, 2));
}

export const bundlesRouter = Router();

bundlesRouter.use(
  express.static(BUNDLES_OUT_DIR, {
    setHeaders(res, filePath) {
      if (filePath.endsWith('manifest.json')) {
        // The manifest itself must revalidate — it's the thing that tells clients which
        // hashed URLs are current.
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }),
);
