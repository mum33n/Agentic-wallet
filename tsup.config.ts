import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "mcp-server": "src/client/mcp.ts",
    demo: "src/agents/demo.ts",
  },
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
  external: [
    "@solana/web3.js",
    "@walletconnect/sign-client",
    "@walletconnect/utils",
    "@modelcontextprotocol/sdk",
    "ink",
    "react",
    "ws",
    "tweetnacl",
    "ed25519-hd-key",
    "bip39",
    "bs58",
    "chalk",
    "zod",
  ],
  esbuildOptions(options) {
    options.jsx = "transform";
    options.jsxFactory = "React.createElement";
    options.jsxFragment = "React.Fragment";
  },
});
