const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bytenode = require('bytenode');

/**
 * Compiles main.js and preload.js into V8 bytecode (.jsc)
 * Creates a minimal plain loader that registers bytenode and runs the bytecode.
 */
function compileBytecode(appDir) {
  const mainJsPath = path.join(appDir, 'main.js');
  const mainJscPath = path.join(appDir, 'main.jsc');
  const preloadJsPath = path.join(appDir, 'preload.js');
  const preloadJscPath = path.join(appDir, 'preload.jsc');

  console.log('Compiling main.js to V8 bytecode...');
  bytenode.compileFile({
    filename: mainJsPath,
    output: mainJscPath,
    electron: true
  });

  console.log('Compiling preload.js to V8 bytecode...');
  bytenode.compileFile({
    filename: preloadJsPath,
    output: preloadJscPath,
    electron: true
  });

  // Calculate hashes for integrity manifest
  const mainHash = crypto.createHash('sha256').update(fs.readFileSync(mainJscPath)).digest('hex');
  const preloadHash = crypto.createHash('sha256').update(fs.readFileSync(preloadJscPath)).digest('hex');

  const manifest = {
    compiledAt: new Date().toISOString(),
    files: {
      'main.jsc': mainHash,
      'preload.jsc': preloadHash,
    }
  };

  fs.writeFileSync(path.join(appDir, 'integrity-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Integrity manifest generated with V8 bytecode hashes.');

  // Replace main.js with minimal bootstrap loader
  const bootstrapLoader = `const bytenode = require('bytenode');
require('./main.jsc');
`;
  fs.writeFileSync(mainJsPath, bootstrapLoader, 'utf8');
  console.log('V8 Bytecode compilation and loader swap completed.');
}

if (require.main === module) {
  compileBytecode(path.resolve(__dirname));
}

module.exports = { compileBytecode };
