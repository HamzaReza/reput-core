'use client';

import Header from '@/components/common/Header';

export default function AuthPage() {
  return (
    <div className="flex flex-col min-h-screen grid-bg" style={{ backgroundColor: 'var(--color-background)' }}>
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 pt-20">
        <div className="w-full max-w-md relative z-10">
          <div className="glass rounded-xl p-8">
            <h1 className="neon-text text-3xl font-bold mb-2 text-center">
              Sign In
            </h1>
            <p className="text-center mb-8" style={{ color: 'var(--color-muted)' }}>
              Enter your credentials to access your reputation profile
            </p>

            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-foreground)' }}>
                  Email or Username
                </label>
                <input
                  type="text"
                  className="auth-input w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 transition-all duration-300"
                  style={{
                    backgroundColor: 'rgba(13, 17, 23, 0.5)',
                    color: 'var(--color-foreground)',
                  }}
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-foreground)' }}>
                  Password
                </label>
                <input
                  type="password"
                  className="auth-input w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 transition-all duration-300"
                  style={{
                    backgroundColor: 'rgba(13, 17, 23, 0.5)',
                    color: 'var(--color-foreground)',
                  }}
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                className="glow-button w-full font-bold py-3 rounded-lg transition-all duration-300"
              >
                Sign In
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/10">
              <a
                href="#"
                className="flex items-center justify-center w-full px-4 py-2 border border-white/10 rounded-lg transition-all duration-300 hover:bg-white/5"
                style={{ color: 'var(--color-foreground)' }}
              >
                <span className="font-medium">Sign in with LinkedIn</span>
              </a>
            </div>

            <p className="text-center mt-6" style={{ color: 'var(--color-muted)' }}>
              Don't have an account?{' '}
              <a href="#" className="font-medium transition-colors duration-300 hover:text-[#4ECDC4]" style={{ color: '#4ECDC4' }}>
                Sign up
              </a>
            </p>
          </div>
        </div>
      </main>

      <style jsx>{`
        .auth-input {
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .auth-input:focus {
          border-color: #4ECDC4;
          box-shadow: 0 0 10px rgba(78, 205, 196, 0.3);
        }
      `}</style>
    </div>
  );
}
