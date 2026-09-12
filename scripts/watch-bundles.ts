import chokidar from 'chokidar';
import { buildBundles } from './bundle-lib';

const WATCH_PATHS = ['src/carriers/**/routeConfigs/**/*.ts', 'src/validators/**/*.ts'];

let building = false;
let rebuildQueued = false;

async function rebuild(reason: string): Promise<void> {
  if (building) {
    rebuildQueued = true;
    return;
  }
  building = true;
  try {
    console.log(`[bundles] rebuilding (${reason})...`);
    const manifest = await buildBundles();
    console.log('[bundles] rebuilt:', JSON.stringify(manifest));
  } catch (err) {
    console.error('[bundles] build failed:', err);
  } finally {
    building = false;
    if (rebuildQueued) {
      rebuildQueued = false;
      void rebuild('queued change');
    }
  }
}

void rebuild('initial build');

const watcher = chokidar.watch(WATCH_PATHS, { ignoreInitial: true });
watcher.on('add', (file) => void rebuild(`added ${file}`));
watcher.on('change', (file) => void rebuild(`changed ${file}`));
watcher.on('unlink', (file) => void rebuild(`removed ${file}`));

console.log('[bundles] watching for config/validator changes...');
