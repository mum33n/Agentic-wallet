import { useState } from 'react';

const CONTRACT_ADDRESS = '2seLDzr6bp1AC85fvfpEgRcSnQuqd75AVaPWDC6UBAGS';
const BAGS_LINK =
  'https://bags.fm/2seLDzr6bp1AC85fvfpEgRcSnQuqd75AVaPWDC6UBAGS';
const STREAMFLOW_LOCK_LINK =
  'https://app.streamflow.finance/contract/solana/mainnet/Hei4YNQ5idtjrrS7pktUQrP8A9nCxWyUDo55SmjQsSqK';

export function HeroSection() {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    await navigator.clipboard.writeText(CONTRACT_ADDRESS);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-20 sm:pt-24 pb-16 sm:pb-20 overflow-hidden">
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

      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-mono mb-6 sm:mb-8 border"
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
        Bags Hackathon Submission · Solana
      </div>

      <h1
        className="font-black leading-[0.95] tracking-tight mb-5 sm:mb-6 relative z-10"
        style={{ fontSize: 'clamp(40px, 14vw, 96px)', animation: 'fadeUp 0.5s 0.08s ease both' }}
      >
        Infrastructure for
        <br />
        the coming wave
        <br />
        of{' '}
        <span
          style={{
            background: 'linear-gradient(135deg, #4D9DFF 0%, #1A6EFF 60%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          autonomous agents
        </span>
        .
      </h1>

      <p
        className="max-w-[36rem] text-base sm:text-lg leading-relaxed mb-8 sm:mb-10 relative z-10 px-1"
        style={{ color: '#5A6880', animation: 'fadeUp 0.5s 0.16s ease both' }}
      >
        Consumer wallets were built for manual clicks. Execra is built for bots:
        named accounts, simulation-first signing, and native agent integrations.
      </p>

      <div
        className="relative z-10 mb-6 sm:mb-8 w-full max-w-3xl rounded-xl border border-white/10 px-3 sm:px-4 py-3 text-left"
        style={{ background: 'rgba(8,14,26,0.92)' }}
      >
        <span className="font-mono text-xs uppercase tracking-widest" style={{ color: '#4D9DFF' }}>
          One-line thesis
        </span>
        <p className="mt-2 text-sm sm:text-base leading-relaxed break-words" style={{ color: '#D8E5F2' }}>
          As autonomous agents become persistent on-chain users, the winning wallet
          layer will be programmable, always-on, and purpose-built for machine
          execution. Execra is that layer for Solana.
        </p>
      </div>

      <div className="flex gap-2 sm:gap-3 flex-wrap justify-center relative z-10 w-full sm:w-auto">
        <a
          href={BAGS_LINK}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 sm:px-6 py-3 rounded-xl font-semibold text-white text-sm transition-all no-underline"
          style={{ background: '#1A6EFF' }}
        >
          Trade on Bags
        </a>
        <a
          href="https://github.com/mum33n/Agentic-wallet"
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 sm:px-6 py-3 rounded-xl font-medium text-slate-200 text-sm border border-white/10 no-underline transition-all"
        >
          Read docs
        </a>
      </div>

      <div
        className="relative z-10 mt-8 w-full max-w-4xl rounded-2xl border border-white/10 p-4 sm:p-5"
        style={{ background: 'rgba(8,14,26,0.92)' }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-left min-w-0">
            <div
              className="font-mono text-xs uppercase tracking-widest mb-2"
              style={{ color: '#4D9DFF' }}
            >
              Contract Address (CA)
            </div>
            <code
              className="block font-mono text-xs sm:text-sm break-all"
              style={{ color: '#D8E5F2' }}
            >
              {CONTRACT_ADDRESS}
            </code>
            <a
              href={STREAMFLOW_LOCK_LINK}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center mt-3 px-2.5 py-1 rounded-md text-xs font-semibold no-underline border border-emerald-400/30"
              style={{
                color: '#34D399',
                background: 'rgba(16, 185, 129, 0.12)',
              }}
            >
              Dev Token Locked (Streamflow)
            </a>
          </div>
          <div className="flex items-center gap-2 flex-wrap md:justify-end">
            <button
              type="button"
              onClick={onCopy}
              className="px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold border border-white/15 text-white w-full sm:w-auto"
              style={{ background: copied ? '#166534' : '#1A6EFF' }}
            >
              {copied ? 'Copied' : 'Copy CA'}
            </button>
            <a
              href={`https://solscan.io/token/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-lg text-xs sm:text-sm font-medium border border-white/15 no-underline w-full sm:w-auto text-center"
              style={{ color: '#D8E5F2' }}
            >
              Solscan
            </a>
            <a
              href={BAGS_LINK}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-lg text-xs sm:text-sm font-medium border border-white/15 no-underline w-full sm:w-auto text-center"
              style={{ color: '#D8E5F2' }}
            >
              Bags
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
