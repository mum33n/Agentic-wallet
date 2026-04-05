import { useEffect, useState } from 'react';
import './App.css';
import { FooterSection } from './components/FooterSection';
import { NavBar } from './components/NavBar';
import { ArchitectureSection } from './components/sections/ArchitectureSection';
import { ExtensionSection } from './components/sections/ExtensionSection';
import { FeaturesSection } from './components/sections/FeaturesSection';
import { HeroSection } from './components/sections/HeroSection';
import { IntegrationsSection } from './components/sections/IntegrationsSection';
import { McpSection } from './components/sections/McpSection';
import { PackagesSection } from './components/sections/PackagesSection';
import { ProblemSection } from './components/sections/ProblemSection';
import { QuickStartSection } from './components/sections/QuickStartSection';
import { RoadmapSection } from './components/sections/RoadmapSection';

export default function App() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen text-slate-100" style={{ background: '#060A12' }}>
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-20"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
        }}
      />

      <NavBar scrolled={scrolled} />
      <HeroSection />
      <ProblemSection />
      <ArchitectureSection />
      <FeaturesSection />
      <IntegrationsSection />
      <PackagesSection />
      <McpSection />
      <ExtensionSection />
      <QuickStartSection />
      <RoadmapSection />
      <FooterSection />
    </div>
  );
}
