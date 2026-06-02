'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArticleInput } from '@/components/ArticleInput';
import { ConfigPanel } from '@/components/ConfigPanel';
import { ArticleOutput } from '@/components/ArticleOutput';
import { RewriteConfig } from '@/lib/prompts';
import { apiFetch, getToken } from '@/lib/api';
import { getAgenti, Agente, getTestate, getDrafts, getPublished, getWPConfig } from '@/lib/storage';
import { Send, AlertCircle, ListTodo, Clock, CheckCircle2, Radio, Wifi, Info, RefreshCw, PenLine } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

const STATIC_STATUS = {
  errori: 0,
};

function KpiCard({
  label, value, sub, icon, accent,
}: {
  label: string; value: string | number; sub: string;
  icon: React.ReactNode; accent?: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ?? 'bg-gray-100'}`}>
          {icon}
        </div>
      </div>
      <div className={`text-3xl font-black tracking-tight ${accent ? 'text-[#1e293b]' : 'text-[#1e293b]'}`}>{value}</div>
      <div className="text-xs text-gray-400 font-medium">{sub}</div>
    </div>
  );
}

function Dashboard() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get('url') || '';
  const initialSource = searchParams.get('source') || 'Affari Italiani';

  const [agenti, setAgenti] = useState<Agente[]>([]);
  const [fontiAttive, setFontiAttive] = useState({ attive: 0, totali: 0 });
  const [kpi, setKpi] = useState({ inCoda: 0, daApprovare: 0, pubblicatiOggi: 0 });
  const [wpConnected, setWpConnected] = useState(false);

  useEffect(() => {
    setAgenti(getAgenti());
    const all = getTestate();
    setFontiAttive({ attive: all.filter(t => t.stato === 'attivo').length, totali: all.length });

    const drafts = getDrafts();
    const published = getPublished();
    const todayStr = new Date().toDateString();
    setKpi({
      inCoda: drafts.length,
      daApprovare: drafts.filter(d => d.status === 'Pending Approval').length,
      pubblicatiOggi: published.filter(p => new Date(p.dataPubblicazione).toDateString() === todayStr).length,
    });

    const wpCfg = getWPConfig();
    setWpConnected(!!wpCfg.siteUrl && !!wpCfg.username && !!wpCfg.appPassword);
  }, []);

  const [editMode, setEditMode] = useState<'rewrite' | 'brief'>('rewrite');
  const [briefText, setBriefText] = useState('');
  const [tipoArticolo, setTipoArticolo] = useState('Articolo Sponsored');

  const [config, setConfig] = useState<RewriteConfig>({
    articleText: '',
    testataNome: initialSource,
    agenteId: '1',
    lunghezza: 'Media (250-350 parole)',
    lingua: 'Italiano',
    mantieniTitolo: false,
  });

  const [outputContent, setOutputContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState('');
  const [initialUrlToFetch] = useState(initialUrl);

  const updateConfig = (updates: Partial<RewriteConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleRewrite = async () => {
    if (editMode === 'brief' && !briefText.trim()) {
      setError(t('dashboard', 'inserisciBriefError'));
      return;
    }
    if (editMode === 'rewrite' && !config.articleText.trim()) {
      setError(t('dashboard', 'inserisciTestoError'));
      return;
    }
    if (!config.testataNome.trim()) {
      setError(t('dashboard', 'inserisciTestataError'));
      return;
    }

    setError('');
    setIsStreaming(true);
    setHasStarted(true);
    setOutputContent('');

    try {
      const selectedAgente = agenti.find(a => a.id === config.agenteId) || agenti[0];
      const payload = { 
        ...config, 
        mode: editMode,
        briefText: editMode === 'brief' ? briefText : undefined,
        tipoArticolo: editMode === 'brief' ? tipoArticolo : undefined,
        agentePrompt: selectedAgente?.prompt 
      };

      const response = await apiFetch('/rewrite', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server connection error');
      }

      if (!response.body) {
        throw new Error('No content returned from server');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'content_block_delta' && data.delta?.text) {
                setOutputContent((prev) => prev + data.delta.text);
              }
            } catch (e) { /* ignore parse errors */ }
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#f1f5f9]">
      {/* ── Page header ── */}
      <div className="px-8 pt-8 pb-2">
        <h1 className="text-3xl font-serif font-bold text-[#1e293b]">Dashboard</h1>
        <p className="text-[#64748b] text-base mt-0.5">{t('dashboard', 'sottotitolo')}</p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="px-8 pt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={t('dashboard', 'bozzeInCoda')}
          value={kpi.inCoda}
          sub={t('dashboard', 'generateDaFonti')}
          accent="bg-indigo-50"
          icon={<ListTodo className="w-4 h-4 text-indigo-500" />}
        />
        <KpiCard
          label={t('dashboard', 'inApprovazione')}
          value={kpi.daApprovare}
          sub={t('dashboard', 'attesaDirettore')}
          accent="bg-amber-50"
          icon={<Clock className="w-4 h-4 text-amber-500" />}
        />
        <KpiCard
          label={t('dashboard', 'pubblicazioniOggi')}
          value={kpi.pubblicatiOggi}
          sub={t('dashboard', 'distribuiteWordpress')}
          accent="bg-emerald-50"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        />
        <KpiCard
          label={t('dashboard', 'fontiAttive')}
          value={fontiAttive.totali > 0 ? `${fontiAttive.attive}/${fontiAttive.totali}` : '—'}
          sub={t('dashboard', 'rssOperativi')}
          accent="bg-sky-50"
          icon={<Wifi className="w-4 h-4 text-sky-500" />}
        />
      </div>

      {/* ── Sistema Status Bar ── */}
      <div className="px-8 pt-4">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4 flex flex-wrap items-center gap-x-8 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('dashboard', 'statoSistema')}</span>
          </div>

          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Radio className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-400">{t('dashboard', 'ultimaScansione')}</span>
            <span className="font-semibold text-gray-700">{t('dashboard', 'staticUltimaScansione')}</span>
          </div>

          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-400">{t('dashboard', 'prossima')}</span>
            <span className="font-semibold text-gray-700">{t('dashboard', 'staticProssima')}</span>
          </div>

          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Info className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-400">{t('dashboard', 'modalita')}</span>
            <span className="font-semibold text-gray-700">{t('dashboard', 'staticModalita')}</span>
          </div>

          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-gray-400">{t('dashboard', 'errori')}</span>
            <span className={`font-bold ${STATIC_STATUS.errori > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
              {STATIC_STATUS.errori}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-sm ml-auto">
            <span className="relative flex h-2 w-2">
              <span className={`relative inline-flex rounded-full h-2 w-2 ${wpConnected ? 'bg-emerald-500' : 'bg-red-400'}`}></span>
            </span>
            <span className="text-gray-500 font-medium">WordPress:</span>
            <span className={`font-bold ${wpConnected ? 'text-emerald-600' : 'text-red-500'}`}>
              {wpConnected ? t('dashboard', 'wpConfigurato') : t('dashboard', 'wpNonConnesso')}
            </span>
          </div>
        </div>
      </div>

      {/* ── Manual Rewriting Area ── */}
      <div className="flex-1 p-4 md:px-8 md:pb-8 pt-6 flex flex-col">
        {/* Header & Toggle */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">{t('dashboard', 'generazioneManuale')}</span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium">{t('dashboard', 'creaBozza')}</p>
          </div>

          <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => { setEditMode('rewrite'); setError(''); setOutputContent(''); setHasStarted(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                editMode === 'rewrite'
                  ? 'bg-[#4f46e5] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              {t('dashboard', 'daTestoUrl')}
            </button>
            <button
              onClick={() => { setEditMode('brief'); setError(''); setOutputContent(''); setHasStarted(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                editMode === 'brief'
                  ? 'bg-[#4f46e5] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <PenLine className="w-4 h-4" />
              {t('dashboard', 'daBrief')}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0" style={{ minHeight: '600px' }}>
          {/* Left Column: Input & Config */}
          <div className="lg:col-span-5 flex flex-col gap-6 min-h-0">
            {/* Input Section (grows) */}
            {editMode === 'rewrite' ? (
              <div className="flex-1 min-h-0">
                <ArticleInput 
                  text={config.articleText} 
                  onChange={(text) => updateConfig({ articleText: text })} 
                  isLoading={isStreaming}
                  initialUrl={initialUrlToFetch}
                />
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col gap-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex items-center gap-3 shrink-0">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{t('dashboard', 'tipoContenuto')}</label>
                  <select
                    value={tipoArticolo}
                    onChange={(e) => setTipoArticolo(e.target.value)}
                    disabled={isStreaming}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#4f46e5] bg-white"
                  >
                    <option value="Articolo Sponsored">{t('dashboard', 'tipoSponsored')}</option>
                    <option value="Comunicato Stampa">{t('dashboard', 'tipoComunicato')}</option>
                    <option value="Recensione Prodotto">{t('dashboard', 'tipoRecensione')}</option>
                    <option value="Approfondimento Tematico">{t('dashboard', 'tipoApprofondimento')}</option>
                    <option value="News Aziendale">{t('dashboard', 'tipoNewsAziendale')}</option>
                    <option value="Intervista">{t('dashboard', 'tipoIntervista')}</option>
                  </select>
                </div>

                <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
                    <h2 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
                      <PenLine className="w-4 h-4 text-[#4f46e5]" />
                      {t('dashboard', 'briefEditoriale')}
                    </h2>
                  </div>
                  <textarea
                    className="flex-1 w-full resize-none outline-none text-sm leading-relaxed text-gray-800 placeholder-gray-400 p-4"
                    placeholder={t('dashboard', 'placeholderBrief')}
                    value={briefText}
                    onChange={(e) => setBriefText(e.target.value)}
                    disabled={isStreaming}
                  />
                </div>
              </div>
            )}
            
            {/* Config Section (fixed height approx) */}
            <div className="h-[380px] shrink-0">
              <ConfigPanel 
                config={config} 
                onChange={updateConfig} 
                disabled={isStreaming}
                agenti={agenti}
              />
            </div>

            {/* Action Button */}
            <button
              onClick={handleRewrite}
              disabled={isStreaming || (editMode === 'rewrite' ? !config.articleText.trim() : !briefText.trim())}
              className="w-full py-3.5 px-4 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            >
              {editMode === 'brief' ? <PenLine className="w-5 h-5" /> : <Send className="w-5 h-5" />}
              {isStreaming 
                ? t('dashboard', 'elaborazione') 
                : (editMode === 'brief' ? t('dashboard', 'generaDaBrief') : t('dashboard', 'generaBozzaAI'))}
            </button>
          </div>

          {/* Right Column: Output */}
          <div className="lg:col-span-7 min-h-0">
            <ArticleOutput 
              content={outputContent} 
              isStreaming={isStreaming} 
              onRewrite={handleRewrite}
              hasStarted={hasStarted}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Loading dashboard...</div>}>
      <Dashboard />
    </Suspense>
  );
}

