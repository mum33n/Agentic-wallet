import { Logo } from './Logo';

const NAV_ITEMS: Array<[string, string]> = [
  ['Features', '#features'],
  ['Architecture', '#architecture'],
  ['Integrations', '#integrations'],
  ['Quick Start', '#quickstart'],
  ['Roadmap', '#roadmap'],
];

export function NavBar({ scrolled }: { scrolled: boolean }) {
  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 md:px-12 h-14 sm:h-16 transition-all duration-300 ${scrolled ? 'border-b border-white/5' : ''}`}
      style={{
        background: scrolled ? 'rgba(6,10,18,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
      }}
    >
      <a href="#" className="flex items-center gap-2 no-underline">
        <Logo size={26} />
        <span
          className="font-bold text-base sm:text-lg tracking-tight text-white"
          style={{ fontFamily: 'system-ui' }}
        >
          Execra
        </span>
      </a>
      <div className="hidden md:flex items-center gap-8">
        {NAV_ITEMS.map(([label, href]) => (
          <a
            key={label}
            href={href}
            className="text-sm text-slate-400 hover:text-white transition-colors no-underline"
          >
            {label}
          </a>
        ))}
      </div>
      <a
        href="https://github.com/mum33n/Agentic-wallet"
        className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg transition-all no-underline"
        style={{ background: '#1A6EFF' }}
      >
        GitHub
      </a>
    </nav>
  );
}
