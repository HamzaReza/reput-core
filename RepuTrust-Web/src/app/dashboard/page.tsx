'use client';

import Header from '@/components/common/Header';

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <Header />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 mt-16">
        <div className="max-w-6xl mx-auto">
          <h1 className="neon-text text-4xl font-bold mb-8">Dashboard</h1>

          {/* Score Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-[#4ECDC4] to-[#2BABA0] rounded-xl p-8 text-black shadow-2xl hover:shadow-[0_0_30px_rgba(78,205,196,0.3)] transition-all duration-300">
              <h2 className="text-lg font-semibold mb-4 opacity-80">Reputation Score</h2>
              <p className="text-6xl font-bold">87</p>
              <p className="mt-4 opacity-70">Out of 100</p>
            </div>

            <div className="glass glow-border rounded-xl p-8">
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-foreground)' }}>Profile Completion</h2>
              <div className="w-full rounded-full h-2 mb-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                <div className="h-2 rounded-full transition-all duration-300" style={{ width: '75%', backgroundColor: '#00E676', boxShadow: '0 0 10px rgba(0, 230, 118, 0.5)' }}></div>
              </div>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>75% Complete</p>
            </div>

            <div className="glass glow-border rounded-xl p-8">
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-foreground)' }}>Verified Documents</h2>
              <p className="text-5xl font-bold" style={{ color: '#4ECDC4' }}>3</p>
              <p className="mt-4" style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>LinkedIn, ID, Certificate</p>
            </div>
          </div>

          {/* Activity Section */}
          <div className="glass glow-border rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-foreground)' }}>Recent Activity</h2>
            <p style={{ color: 'var(--color-muted)' }}>Your activity will appear here</p>
          </div>
        </div>
      </main>
    </div>
  );
}
