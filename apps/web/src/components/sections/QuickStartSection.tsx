import { QUICK_START } from '../landing-data';
import { Reveal } from '../Reveal';

export function QuickStartSection() {
  return (
    <section id="quickstart" className="relative z-10 border-t border-white/5 py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="font-mono text-xs tracking-widest uppercase mb-4" style={{ color: '#1A6EFF' }}>
            Quick Start
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none mb-4">
            Launch Execra locally
          </h2>
        </Reveal>
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <Reveal delay={0.05}>
            <div className="rounded-2xl border border-white/8 p-6" style={{ background: '#0B1220' }}>
              <h3 className="text-base font-semibold mb-4">Terminal</h3>
              <div className="space-y-2">
                {QUICK_START.map((cmd) => (
                  <div
                    key={cmd}
                    className="rounded-lg border border-white/8 px-4 py-3 font-mono text-sm"
                    style={{ background: '#080E1A', color: '#D5E1EC' }}
                  >
                    {cmd}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-white/8 p-6" style={{ background: '#0B1220' }}>
              <h3 className="text-base font-semibold mb-4">Resources</h3>
              <div className="flex flex-col gap-3 text-sm">
                <a href="https://github.com/mum33n/Agentic-wallet" className="no-underline" style={{ color: '#4D9DFF' }}>
                  GitHub repository
                </a>
                <a href="https://github.com/mum33n/Agentic-wallet/blob/main/README.md" className="no-underline" style={{ color: '#4D9DFF' }}>
                  Project README
                </a>
                <a href="https://github.com/mum33n/Agentic-wallet/blob/main/SKILLS.md" className="no-underline" style={{ color: '#4D9DFF' }}>
                  Full SDK/MCP reference
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
