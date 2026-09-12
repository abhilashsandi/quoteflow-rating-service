import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const ROOT = path.resolve(__dirname, '..');
export const BUNDLES_OUT_DIR = path.join(ROOT, 'bundles');

interface BundleManifest {
  configs: Record<string, string>;
  validators: string | null;
}

async function bundleEntry(entryFile: string, outSubdir: string): Promise<string | undefined> {
  if (!existsSync(entryFile)) return undefined;

  const outdir = path.join(BUNDLES_OUT_DIR, outSubdir);
  const result = await build({
    entryPoints: [entryFile],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    outdir,
    entryNames: '[name]-[hash]',
    metafile: true,
    write: true,
    logLevel: 'silent',
  });

  const jsOutput = Object.keys(result.metafile.outputs).find((file) => file.endsWith('.js'));
  if (!jsOutput) return undefined;

  const relativeToOut = path.relative(BUNDLES_OUT_DIR, path.resolve(ROOT, jsOutput));
  return `/bundles/${relativeToOut.split(path.sep).join('/')}`;
}

/**
 * Compiles the Acme config bundle (Pattern 1) and the shared validators bundle (Pattern 2)
 * into content-hashed ESM chunks, then writes manifest.json indexing both. Content hashing
 * (esbuild's `[hash]` entry-name token) means a stale cached URL simply 404s instead of
 * silently serving old logic — staleness becomes impossible, not just unlikely.
 */
export async function buildBundles(): Promise<BundleManifest> {
  rmSync(BUNDLES_OUT_DIR, { recursive: true, force: true });
  mkdirSync(BUNDLES_OUT_DIR, { recursive: true });

  const acmeConfigUrl = await bundleEntry(
    path.join(ROOT, 'src/carriers/acme/routeConfigs/index.ts'),
    'configs/acme',
  );
  const validatorsUrl = await bundleEntry(path.join(ROOT, 'src/validators/index.ts'), 'validators');

  const manifest: BundleManifest = {
    configs: acmeConfigUrl ? { acme: acmeConfigUrl } : {},
    validators: validatorsUrl ?? null,
  };

  writeFileSync(path.join(BUNDLES_OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}
