import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts", "src/**/*.tsx"],
  format: ["esm"], // output ESM — required by ink
  target: "node18",
  platform: "node",
  bundle: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: false,
  shims: true, // adds __dirname/__filename shims for ESM
  banner: {
    js: "#!/usr/bin/env node", // shebang on both entry points
  },
  // These are large native deps — don't bundle them, let node resolve them
  external: ["@execra/core", "@execra/sdk", "@solana/web3.js", "@modelcontextprotocol/sdk", "@solana/spl-token", "ink", "react", "ws", "chalk", "zod"],
  esbuildOptions(options) {
    options.jsx = "transform";
    options.jsxFactory = "React.createElement";
    options.jsxFragment = "React.Fragment";
  },
  outExtension: () => ({ js: ".js" }),
});
