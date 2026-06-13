const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

async function build() {
  const files = {
    'index.html': fs.readFileSync('index.html', 'utf-8'),
    'styles.css': fs.readFileSync('styles.css', 'utf-8'),
    'app.js': fs.readFileSync('app.js', 'utf-8'),
    'locales.js': fs.readFileSync('locales.js', 'utf-8'),
    'mtb_256px.png': fs.readFileSync('logo/mtb_256px.png').toString('base64'),
  };

  fs.writeFileSync('embeds.js', `module.exports = ${JSON.stringify(files)};`);

  await esbuild.build({
    entryPoints: ['server.js'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: 'server.bundle.js',
    write: true,
    format: 'cjs',
    external: [],
  });

  fs.unlinkSync('embeds.js');

  let code = fs.readFileSync('server.bundle.js', 'utf-8');

  code = code.replace(
    /(?:var|const|let)\s+MIME_MAP\s*=\s*\{[^}]*\};/g,
    `var MIME_MAP = ${JSON.stringify({ '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.png': 'image/png' })};`);

  fs.writeFileSync('server.bundle.js', code);
  console.log(`Bundled: ${(code.length / 1024 / 1024).toFixed(1)} MB`);
}

build().catch(err => { console.error(err); process.exit(1); });
