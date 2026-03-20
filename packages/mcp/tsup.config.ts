import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts', 'src/**/*.tsx'],
  format: ['esm'], // output ESM — required by ink
  target: 'node18',
  platform: 'node',
  bundle: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: false,
  shims: true, // adds __dirname/__filename shims for ESM
  banner: {
    js: '#!/usr/bin/env node', // shebang on both entry points
  },
  // dts: true,
  outExtension: () => ({ js: '.js' }),
  external: [
    '@execra/core',
    '@solana/web3.js',
    'zod',
    '@modelcontextprotocol/sdk',
    '@execra/sdk',
  ],
});
