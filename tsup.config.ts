import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      'hook-forwarder': 'src/forwarder/hook-forwarder.ts',
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
    outExtension() {
      return {
        js: '.cjs',
      };
    },
  },
]);

