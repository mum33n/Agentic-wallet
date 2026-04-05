import { Logo } from './Logo';

export function FooterSection() {
  return (
    <footer className="relative z-10 border-t border-white/5 px-6 md:px-12 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-2.5">
        <Logo size={22} />
        <span className="font-bold text-sm" style={{ color: '#5A6880' }}>
          Execra
        </span>
      </div>
      <div className="flex gap-6">
        <a href="https://github.com/mum33n/Agentic-wallet" className="text-xs no-underline" style={{ color: '#5A6880' }}>
          GitHub
        </a>
        <a href="https://github.com/mum33n/Agentic-wallet/blob/main/README.md" className="text-xs no-underline" style={{ color: '#5A6880' }}>
          README
        </a>
        <a href="https://github.com/mum33n/Agentic-wallet/blob/main/SKILLS.md" className="text-xs no-underline" style={{ color: '#5A6880' }}>
          SKILLS.md
        </a>
        <a href="https://x.com/execraxyz" className="text-xs no-underline" style={{ color: '#5A6880' }}>
          X
        </a>
      </div>
      <div className="font-mono text-xs" style={{ color: '#3D5068' }}>
        Built for the agentic era
      </div>
    </footer>
  );
}
