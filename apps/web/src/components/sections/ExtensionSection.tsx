import { Reveal } from '../Reveal';

export function ExtensionSection() {
  return (
    <section id="extension" className="relative z-10 border-t border-white/5 py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-10 sm:gap-16 items-center">
          <Reveal>
            <div className="font-mono text-xs tracking-widest uppercase mb-4" style={{ color: '#1A6EFF' }}>
              Chrome Extension
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight mb-6">
              window.solana for your agent
            </h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: '#5A6880' }}>
              Registers window.solana via Manifest V3 and bridges signing to your local daemon.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: '#0B1220' }}>
              <div className="p-6 font-mono text-sm space-y-3">
                <div style={{ color: '#5A6880' }}>const provider = window.solana</div>
                <div style={{ color: '#5A6880' }}>await provider.connect()</div>
                <div style={{ color: '#5A6880' }}>await provider.signTransaction(tx)</div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
