'use client';

import { useState, useEffect } from 'react';
import { Globe, Plug, Link as LinkIcon, Save, RefreshCw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { saveWPConfig } from '@/lib/storage';
import { apiFetch, apiGet, apiPut } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

interface WPConfig {
  site_url: string;
  username: string;
  app_password: string;
  default_category: string;
  default_status: 'draft' | 'publish';
}

const EMPTY: WPConfig = {
  site_url: '',
  username: '',
  app_password: '',
  default_category: 'News',
  default_status: 'draft',
};

type TestStatus = null | 'testing' | 'ok' | 'error';

export default function WordPressPage() {
  const { t } = useLanguage();
  const [cfg, setCfg] = useState<WPConfig>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>(null);
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    apiGet<WPConfig>('/config/wordpress')
      .then(data => {
        setCfg(data);
        // Cache to localStorage so RewriteWorkspace/ArticleOutput can read credentials
        syncToLocalStorage(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const syncToLocalStorage = (data: WPConfig) => {
    saveWPConfig({
      siteUrl: data.site_url,
      username: data.username,
      appPassword: data.app_password,
      defaultCategory: data.default_category,
      defaultStatus: data.default_status,
    });
  };

  const update = (patch: Partial<WPConfig>) => {
    setTestStatus(null);
    setCfg(prev => ({ ...prev, ...patch }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await apiPut<WPConfig>('/config/wordpress', cfg);
      setCfg(updated);
      syncToLocalStorage(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTestStatus('testing');
    setTestMessage('');
    try {
      const res = await apiFetch('/wordpress/test', {
        method: 'POST',
        body: JSON.stringify({ siteUrl: cfg.site_url, username: cfg.username, appPassword: cfg.app_password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestStatus('ok');
        setTestMessage(`Connected as ${data.displayName}`);
      } else {
        setTestStatus('error');
        setTestMessage(data.detail || data.error || 'Connection failed');
      }
    } catch {
      setTestStatus('error');
      setTestMessage('Network error — check the site URL');
    }
  };

  const isConfigured = !!cfg.site_url && !!cfg.username && !!cfg.app_password;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f1f5f9] max-w-4xl mx-auto">
      <div className="px-8 py-8">
        <h1 className="text-3xl font-serif font-bold text-[#1e293b] mb-1">WordPress</h1>
        <p className="text-[#64748b] text-base">{t('wordpress', 'sottotitolo')}</p>
      </div>

      <div className="px-8 pb-12 flex flex-col gap-6">

        {/* Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isConfigured ? 'bg-emerald-100' : 'bg-amber-100'}`}>
              <Plug className={`w-6 h-6 ${isConfigured ? 'text-emerald-600' : 'text-amber-600'}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1e293b]">{t('wordpress', 'statoConnessione')}</h2>
              <p className="text-sm text-gray-500">{t('wordpress', 'statoDesc')}</p>
            </div>
          </div>
          <div className={`px-4 py-1.5 border rounded-lg text-sm font-bold uppercase tracking-wider ${
            isConfigured ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {isConfigured ? t('wordpress', 'configurato') : t('wordpress', 'disconnesso')}
          </div>
        </div>

        {/* Credentials */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-[#1e293b] mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#4f46e5]" />{t('wordpress', 'credenziali')}
          </h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('wordpress', 'urlSito')}</label>
              <div className="relative">
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="url" placeholder="https://yoursite.com"
                  value={cfg.site_url}
                  onChange={e => update({ site_url: e.target.value })}
                  className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#4f46e5] transition-all" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('wordpress', 'nomeUtente')}</label>
                <input type="text" placeholder="admin"
                  value={cfg.username}
                  onChange={e => update({ username: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#4f46e5] transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Application Password</label>
                <input type="password" placeholder="xxxx xxxx xxxx xxxx"
                  value={cfg.app_password}
                  onChange={e => update({ app_password: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#4f46e5] transition-all" />
              </div>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
              <span className="font-bold">{t('wordpress', 'nota')}</span> {t('wordpress', 'notaDesc')}
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-[#1e293b] mb-4">{t('wordpress', 'opzioniPubblicazione')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('wordpress', 'categoriaPredefinita')}</label>
              <input type="text"
                value={cfg.default_category}
                onChange={e => update({ default_category: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#4f46e5] transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('wordpress', 'statoPredefinito')}</label>
              <select value={cfg.default_status}
                onChange={e => update({ default_status: e.target.value as 'draft' | 'publish' })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#4f46e5]">
                <option value="draft">{t('wordpress', 'bozza')}</option>
                <option value="publish">{t('wordpress', 'pubblicato')}</option>
              </select>
            </div>
          </div>
        </div>

        {testStatus === 'ok' && (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" />{testMessage}
          </div>
        )}
        {testStatus === 'error' && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold">
            <XCircle className="w-4 h-4" />{testMessage}
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" />{t('wordpress', 'salvato')}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button onClick={handleTest}
            disabled={!isConfigured || testStatus === 'testing'}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium rounded-xl transition-colors disabled:opacity-50">
            {testStatus === 'testing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {t('wordpress', 'testConnessione')}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-[#1e1b4b] hover:bg-[#312e81] text-white font-medium rounded-xl transition-colors disabled:opacity-60">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {t('wordpress', 'salva')}
          </button>
        </div>
      </div>
    </div>
  );
}
