'use client';

import { useState, useEffect } from 'react';
import {
  Bot, Zap, CheckCircle2,
  Edit3, Trash2, PlusCircle, BookOpen, ShieldCheck,
} from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

interface Agent {
  id: string;
  name: string;
  target_category: string;
  model: string;
  temperature: number;
  language: string;
  prompt: string;
}

const CATEGORIES = ['All', 'Economy', 'Politics', 'International', 'Crime', 'Health', 'Sport'];
const TONES = ['Neutral journalistic', 'Institutional', 'Analytical', 'Cautious', 'Dynamic', 'SEO-oriented'];
const GUIDELINES = [
  'Always reference the original source in the generated text.',
  'Do not add information not present or verifiable from the source.',
  'Avoid sensationalistic tones in Crime and Health sections.',
  'Always generate: title, kicker, summary, body, tags and SEO metadata.',
  'WordPress publishing only occurs after human editorial approval.',
];

export default function AgentPage() {
  const { t } = useLanguage();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('All');
  const [tone, setTone] = useState(TONES[0]);
  const [temperature, setTemperature] = useState(0.7);
  const [language, setLanguage] = useState('English');
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    apiGet<Agent[]>('/agents')
      .then(setAgents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setEditing(null);
    setName('');
    setCategory('All');
    setTone(TONES[0]);
    setTemperature(0.7);
    setLanguage('English');
    setPrompt('');
  };

  const handleEdit = (agent: Agent) => {
    setEditing(agent);
    setName(agent.name);
    setCategory(agent.target_category);
    setTemperature(agent.temperature);
    setLanguage(agent.language || 'English');
    setPrompt(agent.prompt);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      target_category: category,
      model: 'Claude Haiku',
      temperature,
      language,
      prompt: prompt.trim(),
    };
    try {
      if (editing) {
        const updated = await apiPut<Agent>(`/agents/${editing.id}`, payload);
        setAgents(prev => prev.map(a => a.id === editing.id ? updated : a));
      } else {
        const created = await apiPost<Agent>('/agents', payload);
        setAgents(prev => [...prev, created]);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      resetForm();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiDelete(`/agents/${id}`);
      setAgents(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-[#f1f5f9]">

      <div className="px-8 pt-8 pb-4">
        <h1 className="text-3xl font-serif font-bold text-[#1e293b]">{t('agente', 'titolo')}</h1>
        <p className="text-[#64748b] text-base mt-0.5">{t('agente', 'sottotitolo')}</p>
      </div>

      <div className="px-8 pt-6 pb-12 grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left: form */}
        <div className="xl:col-span-1 flex flex-col gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <PlusCircle className="w-3.5 h-3.5" />
                {editing ? `${t('agente', 'modifica')}: ${editing.name}` : t('agente', 'nuovoProfilo')}
              </span>
              {editing && (
                <button onClick={resetForm} className="text-[11px] text-gray-400 hover:text-gray-600 font-medium">
                  {t('agente', 'annulla')}
                </button>
              )}
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">{t('agente', 'nomeProfilo')}</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder={t('agente', 'nomePlaceholder')}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-[#4f46e5] focus:bg-white transition-all" />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">{t('agente', 'sezioneTarget')}</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setCategory(c)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${category === c ? 'bg-[#4f46e5] text-white border-[#4f46e5]' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-[#4f46e5]'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">{t('agente', 'tonoEditoriale')}</label>
                  <select value={tone} onChange={e => setTone(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none focus:border-[#4f46e5] cursor-pointer appearance-none">
                    {TONES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Output Language</label>
                  <select value={language} onChange={e => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none focus:border-[#4f46e5] cursor-pointer appearance-none">
                    <option value="English">English</option>
                    <option value="Italian">Italian</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{t('agente', 'creativita')}</label>
                  <span className="text-xs font-bold text-[#4f46e5]">{temperature.toFixed(1)}</span>
                </div>
                <input type="range" min={0} max={1} step={0.1} value={temperature}
                  onChange={e => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-[#4f46e5]" />
                <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                  <span>{t('agente', 'conservativo')}</span><span>{t('agente', 'bilanciato')}</span><span>{t('agente', 'creativo')}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">{t('agente', 'promptEditoriale')}</label>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4}
                  placeholder={t('agente', 'promptPlaceholder')}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none focus:border-[#4f46e5] focus:bg-white transition-all resize-none" />
              </div>


              {saved && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />{t('agente', 'salvato')}
                </div>
              )}
              <button onClick={handleSave} disabled={!name.trim()}
                className="w-full py-2.5 bg-[#1e1b4b] hover:bg-[#312e81] text-white font-bold text-sm rounded-xl transition-colors shadow-sm disabled:opacity-50">
                {t('agente', 'salva')}
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />{t('agente', 'lineeGuida')}
              </span>
            </div>
            <div className="p-5 space-y-2.5">
              {GUIDELINES.map((g, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#4f46e5] mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-600 leading-snug">{g}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: agent list */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#1e293b]">{t('agente', 'profiliAttivi')}</h2>
            <span className="text-xs text-gray-400 font-medium">{agents.length} {t('agente', 'profiliConfigurati')}</span>
          </div>

          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : agents.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-400 text-sm">
              No agents yet. Create your first AI editorial agent.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.map(agent => (
                <div key={agent.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#eef2ff] flex items-center justify-center text-[#4f46e5] shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-bold text-[#1e293b]">{agent.name}</h3>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide bg-emerald-50 text-emerald-700 border-emerald-200">
                          Active
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mb-1">
                        <span className="font-semibold text-gray-700">Section:</span> {agent.target_category}
                      </p>
                      <p className="text-[11px] text-gray-500 mb-2">
                        <span className="font-semibold text-gray-700">Temp:</span> {agent.temperature} · <span className="font-semibold text-gray-700">Lang:</span> {agent.language || 'English'} · <span className="font-semibold text-gray-700">Model:</span> {agent.model}
                      </p>
                      {agent.prompt && (
                        <p className="text-[10px] text-gray-400 line-clamp-2">{agent.prompt}</p>
                      )}
                    </div>
                  </div>
                  <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/60 flex items-center gap-2">
                    <button onClick={() => handleEdit(agent)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-[#4f46e5] hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors">
                      <Edit3 className="w-3 h-3" />{t('agente', 'modifica')}
                    </button>
                    <button onClick={() => handleDelete(agent.id)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors ml-auto">
                      <Trash2 className="w-3 h-3" />Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
