const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/gnome/extension.ts', 'src/ui/prefs.ts'],
  bundle: true,
  outdir: 'dist',
  entryNames: '[name]', // Output directly to dist/extension.js and dist/prefs.js
  format: 'esm',
  target: 'esnext', // GJS supports modern JS
  platform: 'neutral', // GJS is not Node.js
  external: ['gi://*', 'resource://*', 'gettext', 'system', 'cairo'], // GNOME imports
  loader: { '.ts': 'ts' },
  keepNames: true, // Preserve class names for GObject/GJS
  plugins: [],
};

async function build() {
  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await esbuild.build(buildOptions);
    console.log('Build complete.');
    
    // Fix export for GJS
    const extensionJsPath = path.join('dist', 'extension.js');
    let content = fs.readFileSync(extensionJsPath, 'utf8');
    
    // Replace "export { GnomeRoutinesExt as default };" or similar with "export default GnomeRoutinesExt;"
    // We use a broader regex to catch var declarations if esbuild separates them
    if (content.includes('export {') && content.includes('as default')) {
         content = content.replace(/export\s*{\s*([A-Za-z0-9_]+)\s+as\s+default\s*};?/g, 'export default $1;');
    }
    
    fs.writeFileSync(extensionJsPath, content);

    // Copy metadata.json to dist
    fs.copyFileSync('metadata.json', 'dist/metadata.json');
    
    // Copy schemas if they exist
    if (fs.existsSync('schemas')) {
        const schemasDir = path.join('dist', 'schemas');
        if (!fs.existsSync(schemasDir)) {
            fs.mkdirSync(schemasDir, { recursive: true });
        }
        
        // Copy schema file
        const schemaFile = 'org.gnome.shell.extensions.gnome-routines.gschema.xml';
        fs.copyFileSync(path.join('schemas', schemaFile), path.join(schemasDir, schemaFile));
        
        // Compile schemas
        try {
            const { execSync } = require('child_process');
            execSync(`glib-compile-schemas ${schemasDir}`);
            console.log('Schemas compiled.');
        } catch (e) {
            console.warn('Failed to compile schemas (glib-compile-schemas might be missing):', e.message);
        }
    }
  }
}

build().catch(() => process.exit(1));
