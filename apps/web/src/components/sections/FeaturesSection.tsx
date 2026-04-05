import { FEATURES } from '../landing-data';
import { Reveal } from '../Reveal';

export function FeaturesSection() {
  return (
    <section id="features" className="relative z-10 border-t border-white/5 py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-end mb-12 sm:mb-16">
          <Reveal>
            <div className="font-mono text-xs tracking-widest uppercase mb-4" style={{ color: '#1A6EFF' }}>
              What's included
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none">
              Everything an agent needs to operate on Solana
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-base leading-relaxed" style={{ color: '#5A6880' }}>
              Vault, signer, RPC client, WebSocket bridge, Chrome extension, and MCP server.
            </p>
          </Reveal>
        </div>
        <Reveal delay={0.1}>
          <div className="grid md:grid-cols-3 gap-px rounded-2xl overflow-hidden border border-white/8" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {FEATURES.map((f) => (
              <div key={f.title} className="p-8" style={{ background: '#0B1220' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-5 border" style={{ background: 'rgba(26,110,255,0.1)', borderColor: 'rgba(26,110,255,0.2)' }}>
                  {f.icon}
                </div>
                <h4 className="font-bold text-base mb-2 tracking-tight">{f.title}</h4>
                <p className="text-sm leading-relaxed" style={{ color: '#5A6880' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
