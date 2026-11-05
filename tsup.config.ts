import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      'extension': 'src/extension/index.ts',
      'hook-forwarder': 'src/forwarder/hook-forwarder.ts',
      'daemon': 'src/daemon/index.ts',
    },
    format: ['cjs'],
    target: 'node20',
    platform: 'node',
    outDir: 'dist',
    clean: true,
    minify: false,
    sourcemap: false,
    bundle: true,
    splitting: false,
    noExternal: ['zod'],
    outExtension() {
      return {
        js: '.cjs',
      };
    },
    external: ['vscode', 'better-sqlite3'],
  },
]);
