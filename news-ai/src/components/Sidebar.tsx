'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  List,
  FileCheck,
  Newspaper,
  Sliders,
  Bot,
  Globe,
  LogOut,
  Radio
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

export function Sidebar() {
  const pathname = usePathname();
  const { t, lang, setLang } = useLanguage();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Extract JWT token from URL if GINA redirected here with ?token=
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem('reput_token', urlToken);
      // Strip the token from the URL without adding a history entry
      params.delete('token');
      const clean = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
      window.history.replaceState({}, '', clean);
    }

    // Read user display name from stored user object
    try {
      const raw = localStorage.getItem('reput_user');
      if (raw) {
        const u = JSON.parse(raw);
        setUserName(u.name || u.email || '');
      }
    } catch {}
  }, []);

  const isNavActive = (path: string) => pathname === path;

  const NavItem = ({ href, icon: Icon, label, isActive }: { href: string, icon: any, label: string, isActive: boolean }) => (
    <Link 
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive 
          ? 'bg-[#eef2ff] text-[#4f46e5]' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon className={`w-5 h-5 ${isActive ? 'text-[#4f46e5]' : 'text-gray-500'}`} />
      {label}
    </Link>
  );

  return (
    <aside className="w-64 bg-[#f8fafc] border-r border-gray-200 flex flex-col h-full">
      {/* Header / Logo */}
      <div className="p-6">
        <div className="flex flex-col mb-6">
          <img src="/ealixir-logo.png" alt="Ealixir Logo" className="w-32 mb-3 object-contain" />
          <div>
            <h1 className="font-bold text-[#1e293b] text-[15px] leading-tight">GINA Newsroom</h1>
            <p className="text-[9px] font-bold text-gray-500 tracking-wider uppercase mt-0.5">AI Editorial Automation</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="bg-[#ecfdf5] border border-[#d1fae5] rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#10b981]" />
            <span className="text-sm font-medium text-[#065f46]">{t('sidebar', 'monitoraggio')}</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
        
        {/* REDAZIONE */}
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-3">{t('sidebar', 'redazione')}</h2>
          <nav className="space-y-1">
            <NavItem href="/" icon={LayoutDashboard} label={t('sidebar', 'dashboard')} isActive={isNavActive('/')} />
            <NavItem href="/queue" icon={List} label={t('sidebar', 'coda')} isActive={isNavActive('/queue')} />
            <NavItem href="/published" icon={FileCheck} label={t('sidebar', 'pubblicati')} isActive={isNavActive('/published')} />
          </nav>
        </div>

        {/* CONFIGURAZIONE */}
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-3">{t('sidebar', 'configurazione')}</h2>
          <nav className="space-y-1">
            <NavItem href="/sources" icon={Newspaper} label={t('sidebar', 'testate')} isActive={isNavActive('/sources')} />
            <NavItem href="/rules" icon={Sliders} label={t('sidebar', 'regole')} isActive={isNavActive('/rules')} />
            <NavItem href="/agent" icon={Bot} label={t('sidebar', 'agenti')} isActive={isNavActive('/agent')} />
            <NavItem href="/wordpress" icon={Globe} label={t('sidebar', 'wordpress')} isActive={isNavActive('/wordpress')} />
          </nav>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        {userName && (
          <p className="text-xs font-semibold text-gray-500 truncate px-2 mb-3">{userName}</p>
        )}
        <div className="mb-3 px-2">
          <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Language</label>
          <select
            value={lang}
            onChange={e => setLang(e.target.value as 'it' | 'en')}
            className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-[#4f46e5]"
          >
            <option value="it">Italiano</option>
            <option value="en">English</option>
          </select>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('reput_token');
            localStorage.removeItem('reput_user');
            // Clear the proxy-set cookie so the auth gate blocks future visits
            document.cookie = 'reput_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
            const ginaUrl = process.env.NEXT_PUBLIC_GINA_URL || 'http://localhost:3000';
            window.location.href = `${ginaUrl}/login`;
          }}
          className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          {t('sidebar', 'esci')}
        </button>
      </div>
    </aside>
  );
}
