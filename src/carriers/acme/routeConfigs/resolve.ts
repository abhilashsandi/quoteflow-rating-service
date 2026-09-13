// The Base -> Portal -> State resolver is carrier-agnostic — shared with every other carrier's
// routeConfigs/index.ts (see ../../shared/route-config-kit.ts). Re-exported here so this
// directory's existing import (`from './resolve'`) doesn't need to change.
export { resolveRouteConfig } from '../../shared/route-config-kit';
