'use client';

const features = [
  {
    title: 'Deep Web Scraping',
    description: 'Scans thousands of sources — news sites, forums, review platforms, social media, and blogs — for any mention of your name or keywords.',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    title: 'Negative Link Detection',
    description: 'AI-powered sentiment analysis identifies harmful, defamatory, or damaging content and surfaces it with a clear risk rating.',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
  {
    title: 'Keyword Monitoring',
    description: 'Combine your name with custom keywords — company, role, location — to ensure comprehensive and targeted coverage.',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>
    ),
  },
  {
    title: 'Risk Scoring',
    description: 'Every result is assigned a severity level — Critical, High, or Medium — so you know exactly what to address first.',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    title: 'Detailed Reports',
    description: 'Export a full PDF report of all discovered links, their risk levels, source domains, and recommended next steps.',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: 'Removal Assistance',
    description: 'Our team helps you file takedown and de-indexing requests for defamatory or harmful content found during your scan.',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
  },
];

export default function Features() {
  return (
    <section style={{ padding: '6rem 1.5rem' }}>
      <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.02em', color: 'var(--color-foreground)' }}>
            How It Works
          </h2>
          <p style={{ fontSize: '1.0625rem', color: 'var(--color-muted)', maxWidth: '32rem', margin: '0 auto', lineHeight: 1.7 }}>
            Everything you need to find, assess, and eliminate negative content about you online.
          </p>
        </div>

        {/* Feature Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(18rem, 100%), 1fr))', gap: '1.5rem' }}>
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature }: { feature: typeof features[0] }) {
  return (
    <div
      className="glass glow-border feature-card"
      style={{ padding: '1.75rem', borderRadius: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.875rem', transition: 'all 0.3s ease' }}
    >
      {/* Icon */}
      <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: 'rgba(68, 121, 218, 0.1)', color: 'var(--color-primary)', border: '1px solid rgba(68, 121, 218, 0.22)' }}>
        {feature.icon}
      </div>

      {/* Text */}
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.375rem', color: 'var(--color-foreground)' }}>
          {feature.title}
        </h3>
        <p style={{ fontSize: '0.875rem', lineHeight: 1.65, color: 'var(--color-muted)' }}>
          {feature.description}
        </p>
      </div>

      <style jsx>{`
        .feature-card:hover {
          background: rgba(68, 121, 218, 0.04);
        }
      `}</style>
    </div>
  );
}
