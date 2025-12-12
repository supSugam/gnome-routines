const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');

async function build() {
  console.log('Cleaning dist...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }

  console.log('Compiling with tsc...');
  try {
    execSync('npx tsc -p tsconfig.build.json' + (isWatch ? ' --watch' : ''), {
      stdio: 'inherit',
    });
  } catch (e) {
    if (!isWatch) {
      console.error('TypeScript compilation failed.');
      process.exit(1);
    }
  }

  if (!isWatch) {
    postBuild();
  }
}

function postBuild() {
  console.log('Copying assets...');

  // Copy metadata.json
  if (fs.existsSync('metadata.json')) {
    fs.copyFileSync('metadata.json', 'dist/metadata.json');
  }

  // Copy documentation and license
  ['LICENSE', 'CHANGELOG.md', 'README.md'].forEach((file) => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join('dist', file));
    }
  });

  // Copy schemas
  if (fs.existsSync('schemas')) {
    const schemasDir = path.join('dist', 'schemas');
    if (!fs.existsSync(schemasDir)) {
      fs.mkdirSync(schemasDir, { recursive: true });
    }

    const schemaFile = 'org.gnome.shell.extensions.gnome-routines.gschema.xml';
    if (fs.existsSync(path.join('schemas', schemaFile))) {
      fs.copyFileSync(
        path.join('schemas', schemaFile),
        path.join(schemasDir, schemaFile)
      );

      try {
        execSync(`glib-compile-schemas ${schemasDir}`);
        console.log('Schemas compiled.');
      } catch (e) {
        console.warn(
          'Failed to compile schemas (glib-compile-schemas might be missing):',
          e.message
        );
      }
    }
  }

  console.log('Build complete.');
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
