import { Reveal } from '../Reveal';

const DEMO_EMBED_URL =
  'https://drive.google.com/file/d/1yW9gADqz5iEkl94zw05CwIIFfHkUIE_y/preview';

export function ArchitectureSection() {
  return (
    <section id="architecture" className="relative z-10 border-t border-white/5 py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="font-mono text-xs tracking-widest uppercase mb-4" style={{ color: '#1A6EFF' }}>
            Demo & Docs
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none mb-10 sm:mb-12">
            See Execra in action
          </h2>
        </Reveal>
        <Reveal delay={0.05}>
          <div
            className="mt-6 rounded-2xl border border-white/8 p-5 flex flex-wrap items-center gap-3"
            style={{ background: '#0B1220' }}
          >
            <span className="font-mono text-xs uppercase tracking-widest" style={{ color: '#5A6880' }}>
              Resources
            </span>
            <a
              href="https://drive.google.com/file/d/1yW9gADqz5iEkl94zw05CwIIFfHkUIE_y/view?usp=drive_link"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border border-white/15 no-underline"
              style={{ color: '#D8E5F2' }}
            >
              Watch Demo
            </a>
            <a
              href="https://github.com/mum33n/Agentic-wallet/blob/main/SKILLS.md"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border border-white/15 no-underline"
              style={{ color: '#D8E5F2' }}
            >
              SKILLS.md
            </a>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div
            className="mt-4 rounded-2xl border border-white/8 overflow-hidden"
            style={{ background: '#0B1220' }}
          >
            <div className="px-5 py-3 border-b border-white/8">
              <span
                className="font-mono text-xs uppercase tracking-widest"
                style={{ color: '#5A6880' }}
              >
                Product Demo
              </span>
            </div>
            <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
              <iframe
                src={DEMO_EMBED_URL}
                title="Execra Demo Video"
                className="absolute top-0 left-0 w-full h-full border-0"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
