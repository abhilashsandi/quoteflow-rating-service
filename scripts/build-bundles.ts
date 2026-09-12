import { buildBundles } from './bundle-lib';

buildBundles()
  .then((manifest) => {
    console.log('Bundles built:', JSON.stringify(manifest, null, 2));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
