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
    <section style={{ padding: 'clamp(5rem, 12vw, 8rem) 1.25rem clamp(3rem, 8vw, 6rem)', backgroundColor: '#ffffff' }}>
      <div style={{ maxWidth: '52rem', margin: '0 auto', textAlign: 'center' }}>

        {/* Badge */}
        <div className="animate-fade-up" style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0.375rem 1rem',
          borderRadius: '9999px',
          marginBottom: '2rem',
          fontSize: '0.8125rem',
          fontWeight: 500,
          backgroundColor: 'rgba(68, 121, 218, 0.08)',
          color: 'var(--color-primary)',
          border: '1px solid rgba(68, 121, 218, 0.2)',
        }}>
          {isAuthed ? 'Your scan is ready' : 'AI-Powered Web Scanner'}
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up delay-100" style={{
          fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: '1.5rem',
          letterSpacing: '-0.02em',
          color: 'var(--color-foreground)',
        }}>
          {isAuthed && name
            ? <>Welcome back,<br />{name}</>
            : <>Discover What the<br /><span style={{ color: 'var(--color-primary)' }}>Web Says</span> About You</>}
        </h1>

        {/* Subtext */}
        <p className="animate-fade-up delay-200" style={{
          fontSize: '1.125rem',
          lineHeight: 1.7,
          color: 'var(--color-muted)',
          maxWidth: '36rem',
          margin: '0 auto 3rem',
        }}>
          {isAuthed
            ? 'View your latest ReputScore, check flagged links, or request a removal to protect your reputation.'
            : 'Enter your name and keywords — RepuTrust scans the entire web to surface negative content, harmful links, and reputation threats before they cause damage.'}
        </p>

        {/* CTA Buttons */}
        <div className="animate-fade-up delay-300" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', alignItems: 'center' }}>
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
                style={{
                  padding: '0.875rem 2rem',
                  borderRadius: '0.625rem',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: 'var(--color-foreground)',
                  textDecoration: 'none',
                  display: 'inline-block',
                  border: '1px solid var(--color-border)',
                  backgroundColor: '#ffffff',
                }}
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
                style={{
                  padding: '0.875rem 2rem',
                  borderRadius: '0.625rem',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: 'var(--color-foreground)',
                  textDecoration: 'none',
                  display: 'inline-block',
                  border: '1px solid var(--color-border)',
                  backgroundColor: '#ffffff',
                }}
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
