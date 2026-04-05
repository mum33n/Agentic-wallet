import { useState } from 'react';
import { CODE, TABS, type TokenType } from '../landing-data';
import { Reveal } from '../Reveal';

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

export function IntegrationsSection() {
  const [tab, setTab] = useState(0);

  return (
    <section id="integrations" className="relative z-10 border-t border-white/5 py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="font-mono text-xs tracking-widest uppercase mb-4" style={{ color: '#1A6EFF' }}>
            Integration surfaces
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none mb-10 sm:mb-12">
            Three ways to connect
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="flex gap-px rounded-t-xl overflow-hidden border border-b-0 border-white/8" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {TABS.map((t, i) => (
              <button
                key={t}
                onClick={() => setTab(i)}
                className="flex-1 px-3 py-4 text-xs sm:text-sm font-mono text-left transition-all border-none cursor-pointer"
                style={{
                  background: tab === i ? '#101828' : '#0B1220',
                  color: tab === i ? '#4D9DFF' : '#5A6880',
                  borderBottom: tab === i ? '2px solid #1A6EFF' : '2px solid transparent',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 border border-white/8 rounded-b-xl overflow-hidden">
            <div className="p-6 sm:p-10 border-r border-white/8" style={{ background: '#0B1220' }}>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-3">
                {['AgentWallet SDK', 'WebSocket JSON-RPC', 'MCP for Claude'][tab]}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#5A6880' }}>
                {[
                  'Import directly into any TypeScript or Node.js project.',
                  'Connect over WebSocket and send JSON-RPC from any language.',
                  'Add Execra as MCP and use natural language for wallet operations.',
                ][tab]}
              </p>
            </div>

            <div style={{ background: '#080E1A' }}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
                  ))}
                </div>
                <span className="font-mono text-xs" style={{ color: '#5A6880' }}>
                  {CODE[tab].lang}
                </span>
              </div>
              <div className="w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
                <pre
                  className="p-6 text-xs leading-loose m-0 whitespace-pre min-w-[42rem]"
                  style={{ fontFamily: "'Fira Code', 'Courier New', monospace" }}
                >
                  {CODE[tab].code.map((token, i) => (
                    <CodeToken key={i} {...token} />
                  ))}
                </pre>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
