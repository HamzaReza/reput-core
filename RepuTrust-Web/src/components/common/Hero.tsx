'use client';

import Link from 'next/link';

export default function Hero() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: '8rem 1.5rem 6rem' }}>
      {/* Animated gradient blobs */}
      <div style={{ position: 'absolute', top: '5rem', right: '2.5rem', width: '20rem', height: '20rem', borderRadius: '50%', opacity: 0.15, filter: 'blur(80px)', background: 'radial-gradient(circle, #4ECDC4 0%, transparent 70%)', animation: 'float 6s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '2.5rem', left: '2.5rem', width: '20rem', height: '20rem', borderRadius: '50%', opacity: 0.1, filter: 'blur(80px)', background: 'radial-gradient(circle, #7FE8E0 0%, transparent 70%)', animation: 'float 8s ease-in-out infinite 1s', pointerEvents: 'none' }} />

      <div style={{ maxWidth: '52rem', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 10, padding: '4rem 0' }}>
        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0.375rem 1rem', borderRadius: '9999px', marginBottom: '2rem', fontSize: '0.8125rem', fontWeight: 500, backgroundColor: 'rgba(78, 205, 196, 0.1)', color: '#4ECDC4', border: '1px solid rgba(78, 205, 196, 0.3)' }}>
          Trusted Reputation Platform
        </div>

        {/* Headline */}
        <h1 className="neon-text" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
          Build Your Digital<br />Reputation
        </h1>

        {/* Subtext */}
        <p style={{ fontSize: '1.125rem', lineHeight: 1.7, marginBottom: '3rem', color: 'var(--color-muted)', maxWidth: '36rem', margin: '0 auto 3rem' }}>
          Secure identity verification, trust building, and reputation scoring for individuals and businesses.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', alignItems: 'center' }}>
          <Link
            href="/auth"
            className="glow-button"
            style={{ padding: '0.875rem 2rem', borderRadius: '0.625rem', fontWeight: 700, fontSize: '1rem', textDecoration: 'none', display: 'inline-block' }}
          >
            Get Started →
          </Link>
          <Link
            href="/quote"
            className="glass glow-border"
            style={{ padding: '0.875rem 2rem', borderRadius: '0.625rem', fontWeight: 700, fontSize: '1rem', color: 'var(--color-foreground)', textDecoration: 'none', display: 'inline-block' }}
          >
            Learn More
          </Link>
        </div>
      </div>
    </section>
  );
}
