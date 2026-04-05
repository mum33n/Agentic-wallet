import { PACKAGES } from '../landing-data';
import { Reveal } from '../Reveal';

export function PackagesSection() {
  return (
    <section id="packages" className="relative z-10 border-t border-white/5 py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="font-mono text-xs tracking-widest uppercase mb-4" style={{ color: '#1A6EFF' }}>
            npm packages
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3">@execra/*</h2>
          <p className="text-base mb-12" style={{ color: '#5A6880' }}>
            Install only what you need.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="grid md:grid-cols-3 gap-4">
            {PACKAGES.map((p) => (
              <div key={p.name} className="rounded-2xl p-7 border border-white/8" style={{ background: '#0B1220' }}>
                <div className="font-mono text-sm mb-3">
                  <span style={{ color: '#5A6880' }}>@execra/</span>
                  <span style={{ color: '#4D9DFF' }}>{p.name}</span>
                </div>
                <p className="text-sm leading-relaxed mb-5" style={{ color: '#5A6880' }}>{p.desc}</p>
                <div className="font-mono text-xs px-3 py-2.5 rounded-lg border border-white/8" style={{ background: '#080E1A', color: '#8899AA' }}>
                  {p.cmd}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
