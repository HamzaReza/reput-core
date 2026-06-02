'use client';

import { useState, useEffect, useMemo } from 'react';
import { AIDraft, DraftStatus, PriorityReason } from '@/lib/mockDrafts';
import { RewriteWorkspace } from '@/components/RewriteWorkspace';
import {
  Loader2, RefreshCw, Eye, ExternalLink, Calendar, Newspaper,
  Zap, FolderOpen, Globe, Search, SlidersHorizontal,
  Trash2, ChevronDown, Clock, CheckCircle2, Tag, MapPin
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { apiFetch, apiGet, apiPost, apiDelete, dbDraftToAIDraft, aiDraftToDb } from '@/lib/api';

interface Source {
  id: string;
  name: string;
  url: string;
  state: string;
  category?: string;
}

interface Agent {
  id: string;
  name: string;
  target_category: string;
  language: string;
  temperature: number;
  prompt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<DraftStatus, string> = {
  'AI Draft':         'bg-blue-50   text-blue-700   border-blue-200',
  'Pending Approval': 'bg-amber-50  text-amber-700  border-amber-200',
  'Approved':         'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Published':        'bg-gray-100  text-gray-500   border-gray-200',
};

function StatusBadge({ status }: { status: DraftStatus }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

const REASON_STYLE: Record<PriorityReason, string> = {
  'Breaking news':        'bg-red-50    text-red-600',
  'Authoritative source': 'bg-indigo-50 text-indigo-600',
  'Strategic keyword':    'bg-violet-50 text-violet-600',
  'Priority category':    'bg-amber-50  text-amber-700',
  'Trending topic':       'bg-pink-50   text-pink-600',
  'High traffic':         'bg-emerald-50 text-emerald-700',
};

function scoreColor(s: number) {
  return s >= 90 ? 'text-red-500' : s >= 80 ? 'text-orange-500' : s >= 70 ? 'text-amber-500' : 'text-gray-400';
}
function accentStripe(score: number, isBreaking: boolean) {
  if (isBreaking || score >= 90) return 'bg-red-400';
  if (score >= 80) return 'bg-orange-300';
  return 'bg-gray-200';
}

function formatDate(ds?: string) {
  if (!ds) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(ds));
  } catch { return ds; }
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function QueuePage() {
  const { t } = useLanguage();
  const [sources, setSources] = useState<Source[]>([]);
  const [drafts, setDrafts] = useState<AIDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AIDraft | null>(null);
  const [lastFetch, setLastFetch] = useState('');
  const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number } | null>(null);

  const [search,       setSearch]       = useState('');
  const [filterCat,    setFilterCat]    = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy,       setSortBy]       = useState('Priority');

  const CATS    = ['All', 'Politics', 'Economy', 'International', 'Crime', 'Sport', 'Health', 'News'];
  const STATUSES: DraftStatus[] = ['AI Draft', 'Pending Approval', 'Approved', 'Published'];
  const SORTS   = ['Priority', 'Most recent', 'Source'];
  const sortLabels: Record<string, string> = {
    'Priority':    t('coda', 'sortPriorita'),
    'Most recent': t('coda', 'sortRecenti'),
    'Source':      t('coda', 'sortFonte'),
  };

  // On mount: load sources from DB, show existing drafts, then auto-fetch RSS
  useEffect(() => {
    apiGet<Source[]>('/sources')
      .then(srcs => {
        const active = srcs.filter(s => s.state === 'active');
        setSources(active);
        fetchDrafts(active); // auto-trigger RSS fetch on page load, same as before
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDrafts = async (activeSources: Source[]) => {
    setIsLoading(true);
    setError('');
    setProcessingProgress(null);

    // Load existing drafts + agents from DB in parallel, show drafts immediately
    let existing: AIDraft[] = [];
    let agents: Agent[] = [];
    try {
      const [dbDrafts, dbAgents] = await Promise.all([
        apiGet<Record<string, any>[]>('/drafts'),
        apiGet<Agent[]>('/agents'),
      ]);
      existing = dbDrafts.map(dbDraftToAIDraft);
      agents = dbAgents;
      setDrafts(existing);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
      return;
    }
    setIsLoading(false); // list is visible now — processing banner takes over from here

    // Pick the best agent for a given category
    const pickAgent = (sourceCategory?: string): Agent | null => {
      if (agents.length === 0) return null;
      if (sourceCategory) {
        const match = agents.find(a =>
          a.target_category.toLowerCase() === sourceCategory.toLowerCase()
        );
        if (match) return match;
      }
      return agents.find(a => a.target_category === 'All') || agents[0];
    };

    // 1. Parse RSS for all active sources in parallel (3 articles per source)
    const sources = activeSources;
    const rawItems: { title: string; link: string; pubDate: string; contentSnippet: string; sourceName: string; sourceCategory?: string }[] = [];

    await Promise.allSettled(
      sources.map(async (source) => {
        try {
          const res = await apiFetch('/parse-rss', {
            method: 'POST',
            body: JSON.stringify({ url: source.url }),
          });
          if (!res.ok) return;
          const data = await res.json();
          (data.items || []).slice(0, 3).forEach((item: any) => {
            rawItems.push({ ...item, sourceName: source.name, sourceCategory: source.category });
          });
        } catch { /* skip */ }
      })
    );

    // 2. Deduplicate against existing DB drafts
    const existingUrls = new Set(existing.map(d => d.originalUrl));
    const newItems = rawItems.filter(item => !existingUrls.has(item.link));

    // 3. Process ALL new items — each draft appears in the list the moment it's ready
    if (newItems.length > 0) {
      setProcessingProgress({ current: 0, total: newItems.length });

      for (let i = 0; i < newItems.length; i++) {
        const item = newItems[i];
        try {
          const agent = pickAgent(item.sourceCategory);
          const res = await apiFetch('/process-article', {
            method: 'POST',
            body: JSON.stringify({
              url: item.link,
              sourceName: item.sourceName,
              originalTitle: item.title,
              snippet: item.contentSnippet,
              agentePrompt: agent?.prompt || undefined,
              lingua: agent?.language || 'English',
              lunghezza: 'Medium (250-350 words)',
            }),
          });
          if (res.ok) {
            const { draft } = await res.json();
            if (draft) {
              const saved = await apiPost<Record<string, any>>('/drafts', aiDraftToDb(draft));
              setDrafts(prev => [dbDraftToAIDraft(saved), ...prev]); // show immediately
            }
          }
        } catch { /* skip */ }
        setProcessingProgress({ current: i + 1, total: newItems.length });
      }
    }

    setLastFetch(new Date().toISOString());
    setProcessingProgress(null);
  };

  // ── Approve / Delete ──────────────────────────────────────────────────────
  const handleApprove = async (draft: AIDraft) => {
    try {
      await apiPost(`/drafts/${draft.id}/approve`, {});
      setDrafts(prev => prev.filter(d => d.id !== draft.id));
      setSelected(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleDelete = async (draftId: string) => {
    try {
      await apiDelete(`/drafts/${draftId}`);
      setDrafts(prev => prev.filter(d => d.id !== draftId));
      if (selected?.id === draftId) setSelected(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  // ── Derived state ──────────────────────────────────────────────────────────
  const queueSummary = useMemo(() => ({
    inCoda: drafts.length,
    inApprovazione: drafts.filter(d => d.status === 'Pending Approval').length,
    fontiMonitorate: sources.length,
    ultimoAggiornamento: lastFetch ? formatDate(lastFetch) : '—',
  }), [drafts, sources, lastFetch]);

  const filtered = useMemo(() => {
    let r = [...drafts];
    if (search) r = r.filter(d =>
      d.generatedTitle.toLowerCase().includes(search.toLowerCase()) ||
      d.generatedSubtitle.toLowerCase().includes(search.toLowerCase())
    );
    if (filterCat    !== 'All') r = r.filter(d => d.generatedCategory === filterCat);
    if (filterStatus !== 'All') r = r.filter(d => d.status === filterStatus);
    if (sortBy === 'Most recent') r.sort((a, b) => new Date(b.originalPublishedAt || 0).getTime() - new Date(a.originalPublishedAt || 0).getTime());
    else if (sortBy === 'Source') r.sort((a, b) => a.originalSource.localeCompare(b.originalSource));
    else r.sort((a, b) => b.priorityScore - a.priorityScore);
    return r;
  }, [drafts, search, filterCat, filterStatus, sortBy]);

  return (
    <>
      {selected && (
        <RewriteWorkspace
          article={selected}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onDelete={handleDelete}
        />
      )}

      <div className="flex flex-col min-h-full bg-[#f1f5f9]">

        {/* Header */}
        <div className="px-8 pt-8 pb-2 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold text-[#1e293b]">{t('coda', 'titoloPagina')}</h1>
            <p className="text-[#64748b] text-base mt-0.5">{t('coda', 'sottotitolo')}</p>
          </div>
          <button onClick={() => fetchDrafts(sources)} disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {t('coda', 'aggiorna')}
          </button>
        </div>

        {/* Summary strip */}
        <div className="px-8 pt-4">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="font-bold text-[#1e293b]">{queueSummary.inCoda} <span className="font-normal text-gray-500">{t('coda', 'summaryBozze')}</span></span>
            <span className="text-gray-200">·</span>
            <span className="font-bold text-amber-600">{queueSummary.inApprovazione} <span className="font-normal text-gray-500">{t('coda', 'summaryApprovazione')}</span></span>
            <span className="text-gray-200">·</span>
            <span className="font-bold text-[#1e293b]">{queueSummary.fontiMonitorate} <span className="font-normal text-gray-500">{t('coda', 'summaryFonti')}</span></span>
            <span className="text-gray-200">·</span>
            <span className="flex items-center gap-1 text-gray-400">
              <Clock className="w-3.5 h-3.5" />
              {t('coda', 'ultimoAggiornamento')} <span className="font-semibold text-gray-700 ml-1">{queueSummary.ultimoAggiornamento}</span>
            </span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-8 pt-3">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-4 py-2.5 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" placeholder={t('coda', 'cerca')}
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#4f46e5] focus:bg-white transition-all" />
            </div>
            {[
              { value: filterCat,    opts: CATS,                   set: setFilterCat,    labels: (o: string) => o },
              { value: filterStatus, opts: ['All', ...STATUSES],   set: setFilterStatus, labels: (o: string) => o },
            ].map((f, i) => (
              <div key={i} className="relative">
                <select value={f.value} onChange={e => f.set(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 outline-none focus:border-[#4f46e5] cursor-pointer">
                  {f.opts.map(o => <option key={o} value={o}>{f.labels(o)}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>
            ))}
            <div className="relative">
              <SlidersHorizontal className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="appearance-none pl-7 pr-7 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 outline-none focus:border-[#4f46e5] cursor-pointer">
                {SORTS.map(s => <option key={s} value={s}>{sortLabels[s]}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>
            <span className="text-xs text-gray-400 font-medium ml-auto">{filtered.length} {t('coda', 'bozze')}</span>
          </div>
        </div>

        {/* Draft list */}
        <div className="px-8 pb-12 pt-3 flex-1">
          {error && <div className="mb-4 bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm">{error}</div>}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm">{t('coda', 'caricamento')}</p>
            </div>
          ) : processingProgress && (
            <div className="mb-4 bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{t('coda', 'elaborazioneAI')} {processingProgress.current}/{processingProgress.total} {t('coda', 'recuperoRiscrittura')}</span>
            </div>
          )}

          {!isLoading && filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100">
              <Newspaper className="w-10 h-10 mb-3 text-gray-300" />
              <p className="font-medium text-gray-500 text-sm">{t('coda', 'nessunaBozza')}</p>
              <p className="text-xs mt-1 text-gray-400">{t('coda', 'cambiaFiltri')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((draft) => (
                <article key={draft.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all group flex overflow-hidden">

                  <div className={`w-[3px] shrink-0 ${accentStripe(draft.priorityScore, draft.isBreaking)}`} />

                  <div className="flex-1 px-4 py-3 min-w-0 flex gap-3">
                    <div className="shrink-0 w-20 h-16 rounded-lg overflow-hidden border border-gray-100 bg-gray-100 flex items-center justify-center self-start mt-0.5">
                      {draft.coverImageUrl
                        ? <img src={draft.coverImageUrl} alt="" className="w-full h-full object-cover" />
                        : <span className="text-[9px] text-gray-400 font-medium text-center leading-tight px-1">{t('coda', 'nessunaImg')}</span>
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[11px] font-semibold rounded">
                          <Globe className="w-2.5 h-2.5" />{t('coda', 'da')} {draft.originalSource}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Calendar className="w-2.5 h-2.5" />{formatDate(draft.originalPublishedAt)}
                        </span>
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#eef2ff] text-[#4f46e5] text-[11px] font-bold rounded">
                          <FolderOpen className="w-2.5 h-2.5" />{draft.generatedCategory}
                        </span>
                        <StatusBadge status={draft.status} />
                        {draft.generatedCity && draft.generatedCity !== 'National' && (
                          <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            <MapPin className="w-2.5 h-2.5 text-red-400" />{draft.generatedCity}
                          </span>
                        )}
                        {draft.isBreaking && (
                          <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-wide rounded">Breaking</span>
                        )}
                      </div>

                      <p className="text-[10px] font-bold text-[#4f46e5] uppercase tracking-wider mb-1">{draft.generatedKicker}</p>
                      <h3 className="text-[15px] font-bold text-[#1e293b] leading-snug mb-1 group-hover:text-[#4f46e5] transition-colors line-clamp-2">
                        {draft.generatedTitle}
                      </h3>
                      <p className="text-[11.5px] font-medium text-gray-500 leading-snug mb-2 line-clamp-2">{draft.generatedSubtitle}</p>
                      <p className="text-[11px] text-gray-400 line-clamp-1 mb-2 leading-relaxed">{draft.generatedBodyPreview}</p>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('coda', 'motivoPriorita')}</span>
                        {draft.priorityReasons.map(r => (
                          <span key={r} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${REASON_STYLE[r as PriorityReason] || 'bg-gray-100 text-gray-500'}`}>{r}</span>
                        ))}
                        <span className="ml-2 text-gray-200">·</span>
                        {draft.generatedTags.slice(0, 2).map(tag => (
                          <span key={tag} className="flex items-center gap-0.5 text-[10px] text-gray-400 font-medium">
                            <Tag className="w-2.5 h-2.5" />{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2 px-4 py-3 border-l border-gray-100 bg-gray-50/60 min-w-[140px]">
                    <div className="text-center mb-0.5">
                      <div className={`text-xl font-black flex items-center justify-center gap-0.5 ${scoreColor(draft.priorityScore)}`}>
                        <Zap className="w-3.5 h-3.5" />{draft.priorityScore}
                      </div>
                      <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{t('coda', 'prioritaLabel')}</div>
                    </div>

                    <button onClick={() => setSelected(draft)}
                      className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-[#1e1b4b] hover:bg-[#312e81] text-white text-[11px] font-bold rounded-lg transition-colors">
                      <Eye className="w-3 h-3" />{t('coda', 'revisiona')}
                    </button>

                    <a href={draft.originalUrl} target="_blank" rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-[11px] font-bold rounded-lg transition-colors">
                      <ExternalLink className="w-3 h-3" />{t('coda', 'originale')}
                    </a>

                    <div className="flex gap-1.5 w-full">
                      <button onClick={() => handleApprove(draft)} title="Approve"
                        className="flex-1 flex items-center justify-center py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg border border-emerald-100 transition-colors text-[10px] font-bold gap-0.5">
                        <CheckCircle2 className="w-3 h-3" />{t('coda', 'approva')}
                      </button>
                      <button onClick={() => handleDelete(draft.id)} title="Delete"
                        className="flex-1 flex items-center justify-center py-1.5 bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 rounded-lg border border-red-100 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
