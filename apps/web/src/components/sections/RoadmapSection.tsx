import { ROADMAP } from '../landing-data';
import { Reveal } from '../Reveal';

type RoadmapStatus = 'done' | 'in_progress' | 'planned';

function getStatusMeta(status: RoadmapStatus) {
  if (status === 'done') {
    return {
      label: 'Done',
      chipBg: 'rgba(26,110,255,0.12)',
      chipColor: '#4D9DFF',
      icon: '✓',
      iconBg: 'rgba(26,110,255,0.16)',
      iconColor: '#4D9DFF',
    };
  }

  if (status === 'in_progress') {
    return {
      label: 'In Progress',
      chipBg: 'rgba(245, 158, 11, 0.16)',
      chipColor: '#FBBF24',
      icon: '⟳',
      iconBg: 'rgba(245, 158, 11, 0.16)',
      iconColor: '#FBBF24',
    };
  }

  return {
    label: 'Planned',
    chipBg: 'rgba(148, 163, 184, 0.16)',
    chipColor: '#94A3B8',
    icon: '•',
    iconBg: 'rgba(148, 163, 184, 0.12)',
    iconColor: '#94A3B8',
  };
}

export function RoadmapSection() {
  return (
    <section id="roadmap" className="relative z-10 border-t border-white/5 py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="font-mono text-xs tracking-widest uppercase mb-4" style={{ color: '#1A6EFF' }}>
            Roadmap
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-10 sm:mb-12">What's next</h2>
        </Reveal>
        <div className="flex flex-col gap-px">
          {ROADMAP.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.05}>
              {(() => {
                const status = getStatusMeta(item.status as RoadmapStatus);
                return (
              <div
                className="flex items-start gap-4 px-4 sm:px-6 py-4 sm:py-5 border border-white/8"
                style={{
                  background: item.status === 'done' ? 'rgba(26,110,255,0.04)' : '#0B1220',
                  opacity: 1,
                  borderRadius: i === 0 ? '12px 12px 0 0' : i === ROADMAP.length - 1 ? '0 0 12px 12px' : '0',
                  marginBottom: i < ROADMAP.length - 1 ? '-1px' : 0,
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center mt-0.5 shrink-0 text-sm font-bold"
                  style={{ background: status.iconBg, color: status.iconColor }}
                >
                  {status.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <div className="font-semibold text-sm" style={{ color: '#E8EDF5' }}>
                      {item.title}
                    </div>
                    <span
                      className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: status.chipBg, color: status.chipColor }}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: '#8EA0B4' }}>
                    {item.desc}
                  </p>
                </div>
              </div>
                );
              })()}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
