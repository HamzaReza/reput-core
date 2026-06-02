'use client';

import { useState, useEffect } from 'react';
import { Save, Clock, ShieldAlert, Power, CheckCircle2, Loader2 } from 'lucide-react';
import { apiGet, apiPut } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

interface RulesConfig {
  autopilot: boolean;
  urgent_mode: boolean;
  rss_frequency: string;
  source_rotation: number;
  smart_tags: string;
  requires_manual_approval: boolean;
  sensitive_word_filter: boolean;
}

const DEFAULT: RulesConfig = {
  autopilot: true,
  urgent_mode: false,
  rss_frequency: 'Every 15 minutes',
  source_rotation: 3,
  smart_tags: 'Politics, Economy, Crime, Health, Sport, Trump, Iran, War, AI, Tech',
  requires_manual_approval: true,
  sensitive_word_filter: true,
};

export default function RulesPage() {
  const { t } = useLanguage();
  const [config, setConfig] = useState<RulesConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiGet<RulesConfig>('/config/rules')
      .then(data => setConfig({ ...DEFAULT, ...data }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const update = (patch: Partial<RulesConfig>) =>
    setConfig(prev => ({ ...prev, ...patch }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPut('/config/rules', config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

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
        <h1 className="text-3xl font-serif font-bold text-[#1e293b] mb-1">{t('regole', 'titolo')}</h1>
        <p className="text-[#64748b] text-base">{t('regole', 'sottotitolo')}</p>
      </div>

      <div className="px-8 pb-12 flex flex-col gap-6">

        {/* Autopilot */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Power className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1e293b]">{t('regole', 'autopilotaTitolo')}</h2>
              <p className="text-sm text-gray-500">{t('regole', 'autopilotaDesc')}</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer"
              checked={config.autopilot}
              onChange={e => update({ autopilot: e.target.checked })} />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        {/* Urgent mode */}
        <div className="bg-red-50 rounded-2xl shadow-sm border border-red-100 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-900">{t('regole', 'urgenteTitolo')}</h2>
              <p className="text-sm text-red-700">{t('regole', 'urgenteDesc')}</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer"
              checked={config.urgent_mode}
              onChange={e => update({ urgent_mode: e.target.checked })} />
            <div className="w-14 h-7 bg-red-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-600"></div>
          </label>
        </div>

        {/* Frequency */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-[#1e293b] mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#4f46e5]" />{t('regole', 'frequenzaTitolo')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">{t('regole', 'controlloFeed')}</label>
              <select value={config.rss_frequency}
                onChange={e => update({ rss_frequency: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#4f46e5]">
                <option value="Every 10 minutes">{t('regole', 'frequenza10')}</option>
                <option value="Every 15 minutes">{t('regole', 'frequenza15')}</option>
                <option value="Every 30 minutes">{t('regole', 'frequenza30')}</option>
                <option value="Every hour">{t('regole', 'frequenzaOra')}</option>
                <option value="Daily">{t('regole', 'frequenzaGiorno')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">{t('regole', 'rotazioneFonti')}</label>
              <input type="number" min={1} max={20}
                value={config.source_rotation}
                onChange={e => update({ source_rotation: Number(e.target.value) })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#4f46e5]" />
              <p className="text-xs text-gray-500">{t('regole', 'rotazioneDesc')}</p>
            </div>
          </div>
        </div>

        {/* Smart tags */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-[#1e293b] mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#4f46e5]" />{t('regole', 'tagTitolo')}
          </h2>
          <p className="text-sm text-gray-500 mb-4">{t('regole', 'tagDesc')}</p>
          <input type="text" value={config.smart_tags}
            onChange={e => update({ smart_tags: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#4f46e5]" />
        </div>

        {/* Safety rules */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-[#1e293b] mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />{t('regole', 'sicurezzaTitolo')}
          </h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl hover:bg-gray-50">
              <input type="checkbox"
                checked={config.requires_manual_approval}
                onChange={e => update({ requires_manual_approval: e.target.checked })}
                className="w-5 h-5 text-[#4f46e5] rounded" />
              <div>
                <div className="font-semibold text-gray-800 text-sm">{t('regole', 'approvazioneLabel')}</div>
                <div className="text-xs text-gray-500">{t('regole', 'approvazioneDesc')}</div>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl hover:bg-gray-50">
              <input type="checkbox"
                checked={config.sensitive_word_filter}
                onChange={e => update({ sensitive_word_filter: e.target.checked })}
                className="w-5 h-5 text-[#4f46e5] rounded" />
              <div>
                <div className="font-semibold text-gray-800 text-sm">{t('regole', 'filtroLabel')}</div>
                <div className="text-xs text-gray-500">{t('regole', 'filtroDesc')}</div>
              </div>
            </label>
          </div>
        </div>

        {saved && (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" />{t('regole', 'salvato')}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-[#1e1b4b] hover:bg-[#312e81] text-white font-medium rounded-xl transition-colors disabled:opacity-60">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {t('regole', 'salva')}
          </button>
        </div>
      </div>
    </div>
  );
}
