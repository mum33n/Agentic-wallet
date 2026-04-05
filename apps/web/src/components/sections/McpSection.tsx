import { MCP_TOOLS } from '../landing-data';
import { Reveal } from '../Reveal';

export function McpSection() {
  return (
    <section id="mcp" className="relative z-10 border-t border-white/5 py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-10 sm:gap-16 items-start">
          <Reveal>
            <div className="font-mono text-xs tracking-widest uppercase mb-4" style={{ color: '#1A6EFF' }}>
              Claude AI Integration
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight mb-6">
              Claude becomes the agent brain
            </h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: '#5A6880' }}>
              Add Execra as an MCP server and let Claude orchestrate wallet operations.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="flex flex-col gap-px">
              {MCP_TOOLS.map(([name, desc], i) => (
                <div
                  key={name}
                  className="flex items-center gap-4 px-5 py-3.5 border border-white/8"
                  style={{
                    background: '#0B1220',
                    borderRadius:
                      i === 0 ? '12px 12px 0 0' : i === MCP_TOOLS.length - 1 ? '0 0 12px 12px' : '0',
                    marginBottom: i < MCP_TOOLS.length - 1 ? '-1px' : 0,
                  }}
                >
                  <span className="font-mono text-sm min-w-[180px]" style={{ color: '#4D9DFF' }}>{name}</span>
                  <span className="text-xs" style={{ color: '#5A6880' }}>{desc}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
