import { Reveal } from '../Reveal';

export function ProblemSection() {
  return (
    <section className="relative z-10 border-t border-white/5 py-16 sm:py-24 px-4 sm:px-6">
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
              <h3 className="text-xl font-bold tracking-tight mb-3">
                Built for clicks and confirmations
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#5A6880' }}>
                Human wallets assume popups and approvals. Agents need a wallet that can
                operate in code without a browser prompt.
              </p>
            </div>
            <div className="p-10" style={{ background: '#0B1220' }}>
              <h3 className="text-xl font-bold tracking-tight mb-3">
                Built for code and autonomy
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#5A6880' }}>
                Execra gives named accounts, programmatic signing, and simulation-first
                safety checks before any transaction is sent.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
