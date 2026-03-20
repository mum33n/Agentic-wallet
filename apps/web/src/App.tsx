import React, { useState, useEffect, useRef } from 'react';

const Logo = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <defs>
      <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4D9DFF" />
        <stop offset="100%" stopColor="#1A6EFF" />
      </linearGradient>
    </defs>
    <path
      d="M15 15 C15 15 15 85 15 85 Q15 88 18 88 L75 88 L75 72 L32 72 L32 58 L65 58 L65 42 L32 42 L32 28 L75 28 L75 12 L18 12 Q15 12 15 15Z"
      fill="url(#lg)"
    />
    <path
      d="M58 42 L82 50 L58 58 L64 52 L48 52 L48 48 L64 48Z"
      fill="white"
      opacity="0.95"
    />
  </svg>
);

type TokenType = 'kw' | 'fn' | 'str' | 'cm' | 'num' | 'tx';

const TABS = [
  '@execra/sdk · SDK',
  'WebSocket · Any language',
  'MCP · Claude AI',
];

const CODE: { lang: string; code: { t: TokenType; v: string }[] }[] = [
  {
    lang: 'TypeScript',
    code: [
      { t: 'kw', v: 'import' },
      { t: 'tx', v: ' { AgentWallet } ' },
      { t: 'kw', v: 'from' },
      { t: 'str', v: " '@execra/sdk'\n\n" },
      { t: 'cm', v: '// Finds or creates account by name\n' },
      { t: 'kw', v: 'const ' },
      { t: 'tx', v: 'wallet = ' },
      { t: 'kw', v: 'await ' },
      { t: 'fn', v: 'AgentWallet.connect' },
      { t: 'tx', v: '(' },
      { t: 'str', v: "'Trading Bot'" },
      { t: 'tx', v: ')\n\n' },
      { t: 'cm', v: '// Read\n' },
      { t: 'kw', v: 'const ' },
      { t: 'tx', v: 'balance = ' },
      { t: 'kw', v: 'await ' },
      { t: 'tx', v: 'wallet.' },
      { t: 'fn', v: 'getBalance' },
      { t: 'tx', v: '()\n' },
      { t: 'kw', v: 'const ' },
      { t: 'tx', v: 'txs     = ' },
      { t: 'kw', v: 'await ' },
      { t: 'tx', v: 'wallet.' },
      { t: 'fn', v: 'getRecentTransactions' },
      { t: 'tx', v: '(' },
      { t: 'num', v: '10' },
      { t: 'tx', v: ')\n\n' },
      { t: 'cm', v: '// Sign + send (simulates first)\n' },
      { t: 'kw', v: 'const ' },
      { t: 'tx', v: '{ signature, explorerUrl } =\n  ' },
      { t: 'kw', v: 'await ' },
      { t: 'tx', v: 'wallet.' },
      { t: 'fn', v: 'signAndSendTransaction' },
      { t: 'tx', v: '(tx)\n\n' },
      { t: 'cm', v: '// Prove ownership\n' },
      { t: 'kw', v: 'const ' },
      { t: 'tx', v: 'sig = wallet.' },
      { t: 'fn', v: 'signMessage' },
      { t: 'tx', v: '(' },
      { t: 'str', v: "'authenticate'" },
      { t: 'tx', v: ')' },
    ],
  },
  {
    lang: 'Python',
    code: [
      { t: 'kw', v: 'import' },
      { t: 'tx', v: ' websocket, json, base64\n\n' },
      { t: 'tx', v: 'ws = websocket.' },
      { t: 'fn', v: 'create_connection' },
      { t: 'tx', v: '(\n  ' },
      { t: 'str', v: '"ws://localhost:3000/ws/agent"' },
      { t: 'tx', v: '\n)\n\n' },
      { t: 'cm', v: '# Sign and send transaction\n' },
      { t: 'tx', v: 'ws.' },
      { t: 'fn', v: 'send' },
      { t: 'tx', v: '(json.' },
      { t: 'fn', v: 'dumps' },
      { t: 'tx', v: '({\n' },
      { t: 'str', v: '  "id"' },
      { t: 'tx', v: ':          ' },
      { t: 'num', v: '1' },
      { t: 'tx', v: ',\n' },
      { t: 'str', v: '  "jsonrpc"' },
      { t: 'tx', v: ':     ' },
      { t: 'str', v: '"2.0"' },
      { t: 'tx', v: ',\n' },
      { t: 'str', v: '  "method"' },
      { t: 'tx', v: ':      ' },
      { t: 'str', v: '"solana_signAndSendTransaction"' },
      { t: 'tx', v: ',\n' },
      { t: 'str', v: '  "params"' },
      { t: 'tx', v: ':      { ' },
      { t: 'str', v: '"transaction"' },
      { t: 'tx', v: ': tx_b64 },\n' },
      { t: 'str', v: '  "accountName"' },
      { t: 'tx', v: ': ' },
      { t: 'str', v: '"Python Bot"' },
      { t: 'cm', v: '  # ← routes to keypair\n' },
      { t: 'tx', v: '}))\n\n' },
      { t: 'tx', v: 'result = json.' },
      { t: 'fn', v: 'loads' },
      { t: 'tx', v: '(ws.' },
      { t: 'fn', v: 'recv' },
      { t: 'tx', v: '())\n' },
      { t: 'fn', v: 'print' },
      { t: 'tx', v: '(result[' },
      { t: 'str', v: '"result"' },
      { t: 'tx', v: '][' },
      { t: 'str', v: '"signature"' },
      { t: 'tx', v: '])' },
    ],
  },
  {
    lang: 'JSON config',
    code: [
      { t: 'tx', v: '{\n  ' },
      { t: 'str', v: '"mcpServers"' },
      { t: 'tx', v: ': {\n    ' },
      { t: 'str', v: '"execra"' },
      { t: 'tx', v: ': {\n' },
      { t: 'tx', v: '      ' },
      { t: 'str', v: '"command"' },
      { t: 'tx', v: ': ' },
      { t: 'str', v: '"node"' },
      { t: 'tx', v: ',\n' },
      { t: 'tx', v: '      ' },
      { t: 'str', v: '"args"' },
      { t: 'tx', v: ': [' },
      { t: 'str', v: '"dist/mcp-server.js"' },
      { t: 'tx', v: '],\n' },
      { t: 'tx', v: '      ' },
      { t: 'str', v: '"env"' },
      { t: 'tx', v: ': {\n        ' },
      { t: 'str', v: '"WALLET_PASSWORD"' },
      { t: 'tx', v: ': ' },
      { t: 'str', v: '"your-password"' },
      { t: 'tx', v: '\n      }\n    }\n  }\n}\n\n' },
      { t: 'cm', v: '// Then just ask Claude:\n' },
      { t: 'cm', v: '// "Check my Trading Bot balance"\n' },
      { t: 'cm', v: '// "Send 0.1 SOL from Trader to Reporter"\n' },
      { t: 'cm', v: '// "Airdrop 1 SOL to DCA Bot"' },
    ],
  },
];

const FEATURES = [
  {
    icon: '🔑',
    title: 'HD Wallet Vault',
    desc: 'BIP-39 mnemonic + BIP-44 derivation. AES-256-GCM encrypted. Compatible with Phantom, Backpack, and Solflare.',
  },
  {
    icon: '⚡',
    title: 'AgentWallet SDK',
    desc: "One-line connect by name. Creates the account if it doesn't exist. Direct vault access or via daemon.",
  },
  {
    icon: '🔌',
    title: 'WebSocket Bridge',
    desc: 'External agents in Python, Rust, Go connect over JSON-RPC. Route to any account by name per-request.',
  },
  {
    icon: '🤖',
    title: 'MCP Server',
    desc: 'Claude AI operates the wallet directly. Natural language → tool calls → signed transactions.',
  },
  {
    icon: '🌐',
    title: 'Chrome Extension',
    desc: 'Registers window.solana via Manifest V3. Works with Jupiter, Magic Eden, any dApp immediately.',
  },
  {
    icon: '🛡️',
    title: 'Pre-flight Simulation',
    desc: 'Every signAndSend simulates on Solana RPC first. Failed simulations never cost a lamport.',
  },
];

const MCP_TOOLS = [
  ['list_accounts', 'All accounts with addresses'],
  ['create_account', 'Derive a named account'],
  ['get_balance', 'SOL balance by account name'],
  ['transfer_sol', 'Send SOL with simulation'],
  ['request_airdrop', 'Devnet funding'],
  ['simulate_transaction', 'Preview without signing'],
  ['sign_message', 'Prove account ownership'],
  ['get_recent_transactions', 'Transaction history'],
];

const PACKAGES = [
  {
    name: 'wallet',
    desc: 'AgentWallet SDK. Connect, sign, send, simulate. Works standalone or with the daemon.',
    cmd: 'npm install @execra/sdk',
  },
  {
    name: 'mcp',
    desc: 'MCP server for Claude Desktop and Claude Code. All wallet tools exposed natively.',
    cmd: 'npm install @execra/mcp',
  },
  {
    name: 'daemon',
    desc: 'Full wallet daemon — vault, WebSocket bridge, WalletConnect v2, CLI dashboard.',
    cmd: 'npm install -g @execra/daemon',
  },
];

function CodeToken({ t, v }: { t: TokenType; v: string }) {
  const cls: Record<TokenType, string> = {
    kw: 'text-blue-400',
    fn: 'text-emerald-400',
    str: 'text-amber-300',
    cm: 'text-slate-500',
    num: 'text-orange-400',
    tx: 'text-slate-300',
  };
  return <span className={cls[t]}>{v}</span>;
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible] as const;
}

function Reveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(28px)',
        transition: `opacity 0.6s ${delay}s ease, transform 0.6s ${delay}s ease`,
      }}
    >
      {children}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className="min-h-screen text-slate-100"
      style={{ background: '#060A12', fontFamily: "'Inter', sans-serif" }}
    >
      {/* Noise overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      {/* NAV */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 transition-all duration-300 ${scrolled ? 'border-b border-white/5' : ''}`}
        style={{
          background: scrolled ? 'rgba(6,10,18,0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
        }}
      >
        <a href="#" className="flex items-center gap-2.5 no-underline">
          <Logo size={26} />
          <span
            className="font-bold text-lg tracking-tight text-white"
            style={{ fontFamily: 'system-ui' }}
          >
            Execra
          </span>
        </a>
        <div className="hidden md:flex items-center gap-8">
          {['Features', 'Integrations', 'Packages', 'MCP'].map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase()}`}
              className="text-sm text-slate-400 hover:text-white transition-colors no-underline"
            >
              {l}
            </a>
          ))}
        </div>
        <a
          href="https://github.com"
          className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg transition-all no-underline"
          style={{ background: '#1A6EFF' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#4D9DFF')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#1A6EFF')}
        >
          GitHub
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M1 6h10M6 1l5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-20 overflow-hidden">
        {/* Grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage:
              'radial-gradient(ellipse 80% 50% at 50% 0%, black 20%, transparent 100%)',
          }}
        />
        {/* Glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: -300,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 900,
            height: 900,
            background:
              'radial-gradient(ellipse, rgba(26,110,255,0.15) 0%, transparent 60%)',
          }}
        />

        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono mb-8 border"
          style={{
            background: 'rgba(26,110,255,0.1)',
            borderColor: 'rgba(26,110,255,0.3)',
            color: '#4D9DFF',
            animation: 'fadeUp 0.5s ease both',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#1A6EFF' }}
          />
          Solana · Autonomous Agents · MCP
        </div>

        {/* H1 */}
        <h1
          className="font-black leading-none tracking-tighter mb-6 relative z-10"
          style={{
            fontSize: 'clamp(52px, 9vw, 96px)',
            animation: 'fadeUp 0.5s 0.08s ease both',
          }}
        >
          The wallet built
          <br />
          for{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #4D9DFF 0%, #1A6EFF 60%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            agents,
          </span>
          <br />
          not humans.
        </h1>

        <p
          className="max-w-lg text-lg leading-relaxed mb-10 relative z-10"
          style={{ color: '#5A6880', animation: 'fadeUp 0.5s 0.16s ease both' }}
        >
          Existing wallets require clicks, popups, and approval flows. Execra
          gives autonomous AI agents a fully programmable Solana wallet — no
          browser, no human in the loop.
        </p>

        <div
          className="flex gap-3 flex-wrap justify-center relative z-10"
          style={{ animation: 'fadeUp 0.5s 0.24s ease both' }}
        >
          <a
            href="#integrations"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white text-sm transition-all no-underline"
            style={{ background: '#1A6EFF' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#4D9DFF';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow =
                '0 12px 40px rgba(26,110,255,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#1A6EFF';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Start building
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 7h12M7 1l6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
          <a
            href="https://github.com"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium text-slate-200 text-sm border border-white/10 no-underline transition-all"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            View on GitHub
          </a>
        </div>

        {/* Install bar */}
        <div
          className="mt-12 flex items-center rounded-xl overflow-hidden border border-white/8 relative z-10"
          style={{
            background: '#0D1625',
            animation: 'fadeUp 0.5s 0.32s ease both',
          }}
        >
          <div
            className="px-5 py-3.5 border-r border-white/8 font-mono text-xs"
            style={{ background: 'rgba(26,110,255,0.1)', color: '#4D9DFF' }}
          >
            npm
          </div>
          <div className="px-5 py-3.5 font-mono text-sm text-slate-200">
            install <span style={{ color: '#4D9DFF' }}>@execra/sdk</span>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="relative z-10 border-t border-white/5 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div
              className="font-mono text-xs tracking-widest uppercase mb-4"
              style={{ color: '#1A6EFF' }}
            >
              The Problem
            </div>
            <div
              className="grid md:grid-cols-2 gap-px rounded-2xl overflow-hidden border border-white/8"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <div className="p-10" style={{ background: '#0B1220' }}>
                <div
                  className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest mb-5"
                  style={{ color: '#FF5A5A' }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="7" fill="#FF5A5A" opacity="0.15" />
                    <path
                      d="M5 5l4 4M9 5l-4 4"
                      stroke="#FF5A5A"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  Human wallets
                </div>
                <h3 className="text-xl font-bold tracking-tight mb-3">
                  Built for clicks and confirmations
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: '#5A6880' }}
                >
                  Phantom, Backpack, MetaMask — every action requires a popup, a
                  browser, and a human to click approve. Agents get stuck at the
                  first transaction.
                </p>
              </div>
              <div className="p-10" style={{ background: '#0B1220' }}>
                <div
                  className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest mb-5"
                  style={{ color: '#3DDB82' }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="7" fill="#3DDB82" opacity="0.15" />
                    <path
                      d="M4 7l2.5 2.5L10 4.5"
                      stroke="#3DDB82"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Execra
                </div>
                <h3 className="text-xl font-bold tracking-tight mb-3">
                  Built for code and autonomy
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: '#5A6880' }}
                >
                  Named accounts, programmatic signing, simulation before every
                  transaction, MCP tools for Claude. Agents connect with one
                  line and operate indefinitely.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="relative z-10 border-t border-white/5 py-24 px-6"
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-end mb-16">
            <Reveal>
              <div
                className="font-mono text-xs tracking-widest uppercase mb-4"
                style={{ color: '#1A6EFF' }}
              >
                What's included
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-none">
                Everything an agent needs to operate on Solana
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p
                className="text-base leading-relaxed"
                style={{ color: '#5A6880' }}
              >
                A complete stack — vault, signer, RPC client, WebSocket bridge,
                Chrome extension, and MCP server. Use what you need.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div
              className="grid md:grid-cols-3 gap-px rounded-2xl overflow-hidden border border-white/8"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              {FEATURES.map((f, i) => (
                <div
                  key={i}
                  className="p-8 transition-colors cursor-default"
                  style={{ background: '#0B1220' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = '#101828')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = '#0B1220')
                  }
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-5 border"
                    style={{
                      background: 'rgba(26,110,255,0.1)',
                      borderColor: 'rgba(26,110,255,0.2)',
                    }}
                  >
                    {f.icon}
                  </div>
                  <h4 className="font-bold text-base mb-2 tracking-tight">
                    {f.title}
                  </h4>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: '#5A6880' }}
                  >
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section
        id="integrations"
        className="relative z-10 border-t border-white/5 py-24 px-6"
      >
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div
              className="font-mono text-xs tracking-widest uppercase mb-4"
              style={{ color: '#1A6EFF' }}
            >
              Integration surfaces
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-none mb-12">
              Three ways to connect
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            {/* Tabs */}
            <div
              className="flex gap-px rounded-t-xl overflow-hidden border border-b-0 border-white/8"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              {TABS.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setTab(i)}
                  className="flex-1 px-4 py-4 text-sm font-mono text-left transition-all border-none cursor-pointer"
                  style={{
                    background: tab === i ? '#101828' : '#0B1220',
                    color: tab === i ? '#4D9DFF' : '#5A6880',
                    borderBottom:
                      tab === i ? '2px solid #1A6EFF' : '2px solid transparent',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Panel */}
            <div className="grid md:grid-cols-2 border border-white/8 rounded-b-xl overflow-hidden">
              <div
                className="p-10 border-r border-white/8"
                style={{ background: '#0B1220' }}
              >
                <h3 className="text-2xl font-bold tracking-tight mb-3">
                  {
                    ['AgentWallet SDK', 'WebSocket JSON-RPC', 'MCP for Claude'][
                      tab
                    ]
                  }
                </h3>
                <p
                  className="text-sm leading-relaxed mb-6"
                  style={{ color: '#5A6880' }}
                >
                  {
                    [
                      'Import directly into any TypeScript or Node.js project. Connects to the vault with or without the daemon. Accounts are created on demand — just pass a name.',
                      'Connect to the daemon over WebSocket and send JSON-RPC messages. Works from any language. Include accountName in every request to route to the right keypair.',
                      'Add Execra as an MCP server in Claude Desktop. Claude can manage accounts, check balances, send SOL, and sign messages using natural language — no code needed.',
                    ][tab]
                  }
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    [
                      'TypeScript',
                      'Node.js',
                      'No daemon required',
                      'Auto account creation',
                    ],
                    ['Python', 'Rust', 'Go', 'Any language', 'JSON-RPC 2.0'],
                    ['Claude Desktop', 'Claude Code', 'Any MCP client'],
                  ][tab].map((p) => (
                    <span
                      key={p}
                      className="font-mono text-xs px-2.5 py-1 rounded border"
                      style={{
                        background: 'rgba(26,110,255,0.1)',
                        borderColor: 'rgba(26,110,255,0.2)',
                        color: '#4D9DFF',
                      }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ background: '#080E1A' }}>
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.12)' }}
                      />
                    ))}
                  </div>
                  <span
                    className="font-mono text-xs"
                    style={{ color: '#5A6880' }}
                  >
                    {CODE[tab].lang}
                  </span>
                </div>
                <pre
                  className="p-6 text-xs leading-loose overflow-x-auto m-0"
                  style={{
                    fontFamily: "'Fira Code', 'Courier New', monospace",
                  }}
                >
                  {CODE[tab].code.map((token, i) => (
                    <CodeToken key={i} {...token} />
                  ))}
                </pre>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* PACKAGES */}
      <section
        id="packages"
        className="relative z-10 border-t border-white/5 py-24 px-6"
      >
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div
              className="font-mono text-xs tracking-widest uppercase mb-4"
              style={{ color: '#1A6EFF' }}
            >
              npm packages
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-3">
              @execra/*
            </h2>
            <p className="text-base mb-12" style={{ color: '#5A6880' }}>
              Install only what you need. Each package is independently
              versioned and typed.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="grid md:grid-cols-3 gap-4">
              {PACKAGES.map((p, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-7 border border-white/8 transition-all cursor-pointer"
                  style={{ background: '#0B1220' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(26,110,255,0.4)';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      'rgba(255,255,255,0.08)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div className="font-mono text-sm mb-3">
                    <span style={{ color: '#5A6880' }}>@execra/</span>
                    <span style={{ color: '#4D9DFF' }}>{p.name}</span>
                  </div>
                  <p
                    className="text-sm leading-relaxed mb-5"
                    style={{ color: '#5A6880' }}
                  >
                    {p.desc}
                  </p>
                  <div
                    className="font-mono text-xs px-3 py-2.5 rounded-lg border border-white/8"
                    style={{ background: '#080E1A', color: '#8899AA' }}
                  >
                    {p.cmd}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* MCP */}
      <section
        id="mcp"
        className="relative z-10 border-t border-white/5 py-24 px-6"
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <Reveal>
              <div
                className="font-mono text-xs tracking-widest uppercase mb-4"
                style={{ color: '#1A6EFF' }}
              >
                Claude AI Integration
              </div>
              <h2 className="text-4xl font-black tracking-tight leading-tight mb-6">
                Claude becomes the agent brain
              </h2>
              <p
                className="text-sm leading-relaxed mb-6"
                style={{ color: '#5A6880' }}
              >
                Instead of writing agent loop code, run Execra as an MCP server.
                Claude decides when to call tools, in what order, with what
                parameters — based on natural language alone.
              </p>
              <div
                className="rounded-xl p-5 border border-white/8"
                style={{ background: '#0B1220' }}
              >
                <p className="text-sm italic mb-3 text-slate-300">
                  "Send 0.05 SOL from Trading Bot to Reporter, then show me the
                  transaction"
                </p>
                <p className="font-mono text-xs" style={{ color: '#5A6880' }}>
                  → <span style={{ color: '#4D9DFF' }}>get_balance</span> →{' '}
                  <span style={{ color: '#4D9DFF' }}>transfer_sol</span> →{' '}
                  <span style={{ color: '#4D9DFF' }}>
                    get_recent_transactions
                  </span>
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="flex flex-col gap-px">
                {MCP_TOOLS.map(([name, desc], i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-5 py-3.5 border border-white/8 transition-all cursor-default"
                    style={{
                      background: '#0B1220',
                      borderRadius:
                        i === 0
                          ? '12px 12px 0 0'
                          : i === MCP_TOOLS.length - 1
                            ? '0 0 12px 12px'
                            : '0',
                      marginBottom: i < MCP_TOOLS.length - 1 ? '-1px' : 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor =
                        'rgba(26,110,255,0.35)';
                      e.currentTarget.style.zIndex = '1';
                      e.currentTarget.style.position = 'relative';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor =
                        'rgba(255,255,255,0.08)';
                      e.currentTarget.style.zIndex = '0';
                    }}
                  >
                    <span
                      className="font-mono text-sm min-w-[180px]"
                      style={{ color: '#4D9DFF' }}
                    >
                      {name}
                    </span>
                    <span className="text-xs" style={{ color: '#5A6880' }}>
                      {desc}
                    </span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/5 px-6 md:px-12 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <Logo size={22} />
          <span className="font-bold text-sm" style={{ color: '#5A6880' }}>
            Execra
          </span>
        </div>
        <div className="flex gap-6">
          {['GitHub', 'Docs', 'npm', 'SKILLS.md'].map((l) => (
            <a
              key={l}
              href="#"
              className="text-xs no-underline transition-colors"
              style={{ color: '#5A6880' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#E8EDF5')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#5A6880')}
            >
              {l}
            </a>
          ))}
        </div>
        <div className="font-mono text-xs" style={{ color: '#3D5068' }}>
          Built for the agentic era
        </div>
      </footer>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: none; }
        }
        * { box-sizing: border-box; }
        a { color: inherit; }
      `}</style>
    </div>
  );
}
