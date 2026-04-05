'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Hero() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [name, setName] = useState("");

  const checkAuth = () => {
    try {
      if (localStorage.getItem("reput_authed") === "true") {
        setIsAuthed(true);
        const n = localStorage.getItem("reput_name");
        if (n) setName(n.split(" ")[0]);
      } else {
        setIsAuthed(false);
        setName("");
      }
    } catch {}
  };

  useEffect(() => {
    checkAuth();
    window.addEventListener("reput-auth-change", checkAuth);
    return () => window.removeEventListener("reput-auth-change", checkAuth);
  }, []);

  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: '8rem 1.5rem 6rem' }}>
      {/* Animated gradient blobs */}
      <div style={{ position: 'absolute', top: '5rem', right: '2.5rem', width: '20rem', height: '20rem', borderRadius: '50%', opacity: 0.15, filter: 'blur(80px)', background: 'radial-gradient(circle, #4ECDC4 0%, transparent 70%)', animation: 'float 6s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '2.5rem', left: '2.5rem', width: '20rem', height: '20rem', borderRadius: '50%', opacity: 0.1, filter: 'blur(80px)', background: 'radial-gradient(circle, #7FE8E0 0%, transparent 70%)', animation: 'float 8s ease-in-out infinite 1s', pointerEvents: 'none' }} />

      <div style={{ maxWidth: '52rem', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 10, padding: '4rem 0' }}>
        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0.375rem 1rem', borderRadius: '9999px', marginBottom: '2rem', fontSize: '0.8125rem', fontWeight: 500, backgroundColor: 'rgba(78, 205, 196, 0.1)', color: '#4ECDC4', border: '1px solid rgba(78, 205, 196, 0.3)' }}>
          {isAuthed ? 'Your scan is ready' : 'AI-Powered Web Scanner'}
        </div>

        {/* Headline */}
        <h1 className="neon-text" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
          {isAuthed && name
            ? <>Welcome back,<br />{name}</>
            : <>Discover What the<br />Web Says About You</>}
        </h1>

        {/* Subtext */}
        <p style={{ fontSize: '1.125rem', lineHeight: 1.7, marginBottom: '3rem', color: 'var(--color-muted)', maxWidth: '36rem', margin: '0 auto 3rem' }}>
          {isAuthed
            ? 'View your latest ReputScore, check flagged links, or request a removal to protect your reputation.'
            : 'Enter your name and keywords — RepuTrust scans the entire web to surface negative content, harmful links, and reputation threats before they cause damage.'}
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', alignItems: 'center' }}>
          {isAuthed ? (
            <>
              <Link
                href="/dashboard"
                className="glow-button"
                style={{ padding: '0.875rem 2rem', borderRadius: '0.625rem', fontWeight: 700, fontSize: '1rem', textDecoration: 'none', display: 'inline-block' }}
              >
                View My ReputScore →
              </Link>
              <Link
                href="/quote/request"
                className="glass glow-border"
                style={{ padding: '0.875rem 2rem', borderRadius: '0.625rem', fontWeight: 700, fontSize: '1rem', color: 'var(--color-foreground)', textDecoration: 'none', display: 'inline-block' }}
              >
                Request Removal
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/auth"
                className="glow-button"
                style={{ padding: '0.875rem 2rem', borderRadius: '0.625rem', fontWeight: 700, fontSize: '1rem', textDecoration: 'none', display: 'inline-block' }}
              >
                Start Scanning Free →
              </Link>
              <Link
                href="/quote"
                className="glass glow-border"
                style={{ padding: '0.875rem 2rem', borderRadius: '0.625rem', fontWeight: 700, fontSize: '1rem', color: 'var(--color-foreground)', textDecoration: 'none', display: 'inline-block' }}
              >
                View Removal Plans
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
