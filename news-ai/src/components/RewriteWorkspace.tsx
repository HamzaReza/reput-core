'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { X, ExternalLink, RefreshCw, Scissors, Building2, Newspaper, Search,
  Save, Send, CheckCircle2, AlertCircle, Globe, Calendar, FolderOpen, Zap,
  FileText, Tag, Link2, ImageIcon, ShieldCheck, ArrowLeft, ChevronRight,
  Loader2, MapPin, Trash2, Images } from 'lucide-react';
import { AIDraft } from '@/lib/mockDrafts';
import { apiFetch } from '@/lib/api';
import { getWPConfig } from '@/lib/storage';

interface Props {
  article: AIDraft;
  onClose: () => void;
  onApprove?: (draft: AIDraft) => void;
  onDelete?: (draftId: string) => void;
}

type Tab = 'preview' | 'compare';

function scoreColor(s:number){return s>=90?'text-red-500':s>=80?'text-orange-500':s>=70?'text-amber-500':'text-gray-400';}

export function RewriteWorkspace({ article, onClose, onApprove, onDelete }: Props) {
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState<Tab>('preview');
  const [saved, setSaved] = useState<null|'saved'|'sent'|'approved'>(null);
  const [regen, setRegen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ ok: true; url: string; editUrl: string } | { ok: false; error: string } | null>(null);

  const CHECKS = [
    { label: t('workspace', 'check1Label'), value:'18%',        status: t('workspace', 'check1Status'), ok:true },
    { label: t('workspace', 'check2Label'), value:'Verificata', status: t('workspace', 'check2Status'), ok:true },
    { label: t('workspace', 'check3Label'), value:'Allineato',  status: t('workspace', 'check3Status'), ok:true },
    { label: t('workspace', 'check4Label'), value:'Sì',         status: t('workspace', 'check4Status'), ok:true },
  ];

  // ── Editable fields ──────────────────────────────────────────────────────
  const [kicker,   setKicker]   = useState(article.generatedKicker);
  const [title,    setTitle]    = useState(article.generatedTitle);
  const [subtitle, setSubtitle] = useState(article.generatedSubtitle);
  const [body,     setBody]     = useState(article.generatedBody);

  const isDirty = kicker !== article.generatedKicker ||
                  title   !== article.generatedTitle  ||
                  subtitle!== article.generatedSubtitle ||
                  body    !== article.generatedBody;

  const a = article;

  const formatDate = (ds?:string) => {
    if (!ds) return '—';
    try { return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'it-IT',{day:'2-digit',month:'long',hour:'2-digit',minute:'2-digit'}).format(new Date(ds)); }
    catch { return ds; }
  };

  const handleAction = (v:'saved'|'sent'|'approved') => {
    setSaved(v);
    setTimeout(()=>setSaved(null), 2500);
  };

  const handleRegen = () => { setRegen(true); setTimeout(()=>setRegen(false),1400); };

  const handlePublishToWP = async () => {
    const cfg = getWPConfig();
    if (!cfg.siteUrl || !cfg.username || !cfg.appPassword) {
      setPublishResult({ ok: false, error: 'WordPress not configured — go to /wordpress first' });
      return;
    }
    setPublishing(true);
    setPublishResult(null);
    try {
      const res = await apiFetch('/wordpress/publish', {
        method: 'POST',
        body: JSON.stringify({
          siteUrl: cfg.siteUrl,
          username: cfg.username,
          appPassword: cfg.appPassword,
          title,
          content: body,
          excerpt: subtitle || kicker,
          tags: a.generatedTags,
          category: a.generatedCategory || cfg.defaultCategory,
          status: cfg.defaultStatus,
          slug: a.generatedSlug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPublishResult({ ok: true, url: data.postUrl, editUrl: data.editUrl });
        onApprove?.(article);
      } else {
        setPublishResult({ ok: false, error: data.error || 'Publish failed' });
      }
    } catch {
      setPublishResult({ ok: false, error: 'Network error' });
    } finally {
      setPublishing(false);
    }
  };

  const wordCount = body.split(/\s+/).filter(Boolean).length;
  const origWords = a.originalExcerpt.split(/\s+/).filter(Boolean).length;

  const imageNote = () => {
    if (a.coverImageStatus === 'Not selected') return (
      <p className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
        {t('workspace', 'immagineNota1')}
      </p>
    );
    if (a.coverImageSource === 'Getty' || a.coverImageSource === 'iStock') return (
      <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        {t('workspace', 'immagineNota2')}
      </p>
    );
    return (
      <p className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
        {t('workspace', 'immagineNota3')}
      </p>
    );
  };

  const aiCommands = [
    {label: t('workspace', 'rigenera'),         icon:<RefreshCw className="w-3 h-3"/>, fn:handleRegen},
    {label: t('workspace', 'accorcia'),          icon:<Scissors className="w-3 h-3"/>, fn:()=>{}},
    {label: t('workspace', 'piuIstituzionale'),  icon:<Building2 className="w-3 h-3"/>, fn:()=>{}},
    {label: t('workspace', 'piuGiornalistico'),  icon:<Newspaper className="w-3 h-3"/>, fn:()=>{}},
    {label: t('workspace', 'ottimizzaSEO'),      icon:<Search className="w-3 h-3"/>, fn:()=>{}},
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f1f5f9] overflow-hidden">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm px-6 py-3 flex items-center gap-4 shrink-0">
        <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" />{t('workspace', 'codaArticoli')}
        </button>
        <ChevronRight className="w-4 h-4 text-gray-300" />
        <span className="text-xs font-bold text-[#4f46e5] bg-[#eef2ff] px-2 py-0.5 rounded uppercase tracking-wider">
          {t('workspace', 'anteprimaBozza')}
        </span>
        <span className="text-sm font-semibold text-gray-700 truncate flex-1">{a.generatedTitle}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1 text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
            <FolderOpen className="w-3 h-3"/>{a.generatedCategory}
          </span>
          <span className={`flex items-center gap-0.5 text-sm font-black ${scoreColor(a.priorityScore)}`}>
            <Zap className="w-3.5 h-3.5"/>{a.priorityScore}
          </span>
          {a.isBreaking && <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-black uppercase rounded">Breaking</span>}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
          <X className="w-5 h-5"/>
        </button>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 flex items-center gap-0">
        {([['preview', t('workspace', 'anteprimaArticolo')], ['compare', t('workspace', 'confrontoOriginale')]] as [Tab,string][]).map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${tab===key?'border-[#4f46e5] text-[#4f46e5]':'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-6 py-6">

          {/* AI toolbar */}
          <div className="flex items-center gap-2 flex-wrap mb-5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">{t('workspace', 'comandiAI')}</span>
            {aiCommands.map(btn=>(
              <button key={btn.label} onClick={btn.fn}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-[#4f46e5] hover:text-[#4f46e5] text-gray-600 text-xs font-semibold rounded-lg transition-colors shadow-sm">
                {regen&&btn.label===t('workspace','rigenera')?<Loader2 className="w-3 h-3 animate-spin"/>:btn.icon}
                {btn.label}
              </button>
            ))}
          </div>

          {tab === 'preview' ? (
            /* ═══════════════ PREVIEW TAB ═══════════════ */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Article preview — 2/3 width */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Cover image */}
                {a.coverImageUrl ? (
                  <div className="relative">
                    <img src={a.coverImageUrl} alt={a.imageAltText} className="w-full h-64 object-cover"/>
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-medium">
                      {a.coverImageSource} · {a.coverImageLicense}
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-48 bg-gray-100 flex flex-col items-center justify-center border-b border-gray-200">
                    <ImageIcon className="w-10 h-10 text-gray-300 mb-2"/>
                    <span className="text-sm text-gray-400 font-medium">{t('workspace', 'immagineNonSelezionata')}</span>
                  </div>
                )}

                <div className="p-7">
                  {/* Category + city + modified badge */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="px-2 py-0.5 bg-[#eef2ff] text-[#4f46e5] text-xs font-bold rounded uppercase tracking-wide">{a.generatedCategory}</span>
                    {a.generatedCity && a.generatedCity !== 'National' && (
                      <span className="flex items-center gap-1 text-xs text-gray-500"><MapPin className="w-3 h-3 text-red-400"/>{a.generatedCity}</span>
                    )}
                    {isDirty && (
                      <span className="ml-auto px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded uppercase tracking-wide">
                        {t('workspace', 'modificato')}
                      </span>
                    )}
                  </div>

                  {/* Kicker — editable */}
                  <input
                    value={kicker}
                    onChange={e => setKicker(e.target.value)}
                    className="w-full text-[11px] font-bold text-[#4f46e5] uppercase tracking-wider bg-transparent border-0 border-b border-transparent hover:border-indigo-200 focus:border-indigo-400 focus:outline-none pb-0.5 mb-2 transition-colors"
                    placeholder={t('workspace', 'placeholderKicker')}
                  />

                  {/* Headline — editable */}
                  <textarea
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    rows={2}
                    className="w-full text-2xl font-bold text-[#1e293b] leading-tight bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-gray-400 focus:outline-none resize-none pb-1 mb-2 transition-colors"
                    placeholder={t('workspace', 'placeholderTitolo')}
                  />

                  {/* Subtitle — editable */}
                  <textarea
                    value={subtitle}
                    onChange={e => setSubtitle(e.target.value)}
                    rows={2}
                    className="w-full text-sm font-medium text-gray-500 bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-gray-300 focus:outline-none resize-none pb-1 mb-4 transition-colors leading-snug"
                    placeholder={t('workspace', 'placeholderSottotitolo')}
                  />

                  {/* Byline */}
                  <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100 text-xs text-gray-400 flex-wrap">
                    <span className="font-semibold text-gray-600">{t('workspace', 'redazioneAI')}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/>{formatDate(a.originalPublishedAt)}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Globe className="w-3 h-3"/>{t('workspace', 'fonte')} {a.originalSource}</span>
                    <span>·</span>
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 font-bold rounded text-[10px] uppercase">{a.status}</span>
                  </div>

                  {/* Body — editable textarea */}
                  <div className="relative group">
                    <textarea
                      value={body}
                      onChange={e => setBody(e.target.value)}
                      className="w-full min-h-[340px] text-[15px] text-gray-700 leading-7 bg-transparent border border-transparent hover:border-gray-200 focus:border-indigo-300 focus:bg-indigo-50/20 focus:outline-none rounded-xl p-3 resize-y transition-colors font-normal"
                      placeholder={t('workspace', 'placeholderBody')}
                    />
                    <span className="absolute bottom-2 right-3 text-[10px] text-gray-300 font-medium group-focus-within:text-gray-400 transition-colors">
                      {wordCount} {t('workspace', 'parole')}
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 flex-wrap">
                    <Tag className="w-3.5 h-3.5 text-gray-400"/>
                    {a.generatedTags.map(tag=>(
                      <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right sidebar */}
              <div className="flex flex-col gap-4">

                {/* Approval actions */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5"/>{t('workspace', 'azioniEditoriali')}
                    </span>
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    {saved && (
                      <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4"/>
                        {saved==='saved' && t('workspace', 'bozzaSalvata')}
                        {saved==='sent' && t('workspace', 'inviataDirettore')}
                      </div>
                    )}
                    {publishResult && (
                      publishResult.ok ? (
                        <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex flex-col gap-1">
                          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4"/>{t('workspace', 'approvataWP')}</span>
                          <div className="flex gap-3 pl-5">
                            <a href={publishResult.url} target="_blank" rel="noopener noreferrer" className="underline flex items-center gap-1 hover:text-emerald-900">
                              View <ExternalLink className="w-3 h-3"/>
                            </a>
                            <a href={publishResult.editUrl} target="_blank" rel="noopener noreferrer" className="underline flex items-center gap-1 hover:text-emerald-900">
                              Edit <ExternalLink className="w-3 h-3"/>
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold flex items-start gap-1.5">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5"/>{publishResult.error}
                        </div>
                      )
                    )}
                    <button onClick={()=>handleAction('saved')} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-xl transition-colors">
                      <Save className="w-4 h-4"/>{t('workspace', 'salvaBozza')}
                    </button>
                    <button onClick={()=>handleAction('sent')} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1e1b4b] hover:bg-[#312e81] text-white font-semibold text-sm rounded-xl transition-colors shadow-sm">
                      <Send className="w-4 h-4"/>{t('workspace', 'inviaApprovazione')}
                    </button>
                    <button
                      onClick={handlePublishToWP}
                      disabled={publishing}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-700 font-semibold text-sm rounded-xl transition-colors disabled:opacity-60"
                    >
                      {publishing ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4"/>}
                      {publishing ? 'Publishing…' : t('workspace', 'approvaWP')}
                    </button>
                    <button onClick={() => { onDelete?.(article.id); onClose(); }} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-400 hover:text-red-600 hover:bg-red-50 font-medium text-sm rounded-xl transition-colors">
                      <Trash2 className="w-4 h-4"/>{t('workspace', 'eliminaDefinitivamente')}
                    </button>
                    <div className="pt-2 border-t border-gray-100 space-y-1 text-xs text-gray-400">
                      <div className="flex justify-between"><span>{t('workspace', 'paroleBozza')}</span><span className="font-semibold text-gray-700">{wordCount}</span></div>
                      <div className="flex justify-between"><span>{t('workspace', 'similarita')}</span><span className="font-semibold text-emerald-600">18%</span></div>
                      <div className="flex justify-between"><span>{t('workspace', 'fonte')}</span><span className="font-semibold text-gray-700">{a.originalSource}</span></div>
                    </div>
                  </div>
                </div>

                {/* Cover image panel */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5"/>{t('workspace', 'immagineCopertina')}
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                      {[
                        [t('workspace', 'stato'),       a.coverImageStatus],
                        [t('workspace', 'fonte'),        a.coverImageSource],
                        [t('workspace', 'licenza'),      a.coverImageLicense],
                        [t('workspace', 'attribuzione'), a.coverImageAttribution],
                      ].map(([k,v])=>(
                        <div key={k}><p className="text-[10px] font-bold text-gray-400 uppercase">{k}</p><p className="text-gray-700 font-medium truncate">{v}</p></div>
                      ))}
                    </div>
                    {[
                      [t('workspace', 'queryRicerca'), a.imageSearchQuery],
                      ['Alt text',                     a.imageAltText],
                      ['Caption',                      a.imageCaption],
                    ].map(([k,v])=>(
                      <div key={k}><p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">{k}</p><p className="text-xs text-gray-600 truncate">{v}</p></div>
                    ))}

                    {imageNote()}

                    {/* Alternative images */}
                    {a.alternativeImages?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">{t('workspace', 'alternative')}</p>
                        <div className="flex gap-2">
                          {a.alternativeImages.map((img,i)=>(
                            <div key={i} className="flex-1 group cursor-pointer">
                              <img src={img.thumbnailUrl} alt="" className="w-full h-12 object-cover rounded border border-gray-200 group-hover:border-[#4f46e5] transition-colors"/>
                              <p className="text-[9px] text-gray-400 mt-0.5 text-center">{img.source} · {img.relevanceScore}%</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button className="flex-1 text-[11px] font-semibold px-2 py-1.5 bg-[#eef2ff] text-[#4f46e5] rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1">
                        <Images className="w-3 h-3"/>{t('workspace', 'cercaAlternative')}
                      </button>
                      <button className="flex-1 text-[11px] font-semibold px-2 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">{t('workspace', 'cambia')}</button>
                    </div>
                  </div>
                </div>

                {/* SEO panel */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5"/>SEO & WordPress
                    </span>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {[
                      {icon:<FileText className="w-3 h-3"/>, label:'SEO Title',        value:a.generatedSeoTitle},
                      {icon:<FileText className="w-3 h-3"/>, label:'Meta Description', value:a.generatedMetaDescription},
                      {icon:<Link2   className="w-3 h-3"/>, label:'Slug',              value:a.generatedSlug},
                      {icon:<FolderOpen className="w-3 h-3"/>, label: t('workspace','categoriaWP'), value:a.generatedCategory},
                      {icon:<ImageIcon className="w-3 h-3"/>, label:'Featured Image',  value:a.coverImageStatus},
                      {icon:<FileText className="w-3 h-3"/>, label:'Image Alt',        value:a.imageAltText},
                      {icon:<FileText className="w-3 h-3"/>, label:'Caption',          value:a.imageCaption},
                    ].map(r=>(
                      <div key={r.label}>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-0.5">{r.icon}{r.label}</p>
                        <p className="text-xs text-gray-700 leading-snug truncate" title={r.value}>{r.value}</p>
                      </div>
                    ))}
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-1"><Tag className="w-3 h-3"/>Tags</p>
                      <div className="flex flex-wrap gap-1">{a.generatedTags.map(tag=><span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-semibold rounded">{tag}</span>)}</div>
                    </div>
                  </div>
                </div>

                {/* Quality checks */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5"/>{t('workspace', 'controlliEditoriali')}
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    {CHECKS.map(c=>(
                      <div key={c.label} className="flex items-start gap-2.5 p-2 bg-gray-50 rounded-xl border border-gray-100">
                        {c.ok?<CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5"/>:<AlertCircle className="w-4 h-4 text-red-500 mt-0.5"/>}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-700">{c.label}</p>
                          <p className="text-[11px] text-gray-500 leading-tight">{c.status}</p>
                        </div>
                        <span className={`text-xs font-black shrink-0 ${c.ok?'text-emerald-600':'text-red-500'}`}>{c.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* ═══════════════ COMPARE TAB ═══════════════ */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Original */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5"/>{t('workspace', 'articoloOriginale')}
                  </span>
                  <a href={a.originalUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-[#4f46e5] hover:underline font-medium">
                    <ExternalLink className="w-3 h-3"/>{t('workspace', 'apriOriginale')}
                  </a>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-gray-400"><Globe className="w-3 h-3"/>{a.originalSource}</span>
                    <span className="text-gray-200">·</span>
                    <span className="flex items-center gap-1 text-xs text-gray-400"><Calendar className="w-3 h-3"/>{formatDate(a.originalPublishedAt)}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t('workspace', 'titoloOriginale')}</p>
                    <h2 className="text-base font-bold text-[#1e293b] leading-snug">{a.originalTitle}</h2>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t('workspace', 'estrattoRSS')}</p>
                    {origWords < 80 && (
                      <div className="mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-[11px] font-bold text-amber-700">{t('workspace', 'contenutoRSSParziale')}</p>
                        <p className="text-[11px] text-amber-600 mt-0.5">{t('workspace', 'contenutoRSSDesc')}</p>
                      </div>
                    )}
                    <p className="text-sm text-gray-600 leading-relaxed">{a.originalExcerpt || t('workspace', 'contenutoNonDisponibile')}</p>
                  </div>
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                    <span>{origWords} {t('workspace', 'paroleEstratte')}</span>
                    <span className="text-[#4f46e5] font-semibold">{a.generatedCategory}</span>
                  </div>
                </div>
              </div>

              {/* AI Draft */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-[#eef2ff] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#4f46e5] uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5"/>{t('workspace', 'bozzaGenerata')}
                  </span>
                  <span className="text-[10px] text-[#4f46e5] font-semibold bg-white px-2 py-0.5 rounded-full">{wordCount} {t('workspace', 'parole')}</span>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t('workspace', 'kicker')}</p>
                    <p className="text-xs font-semibold text-[#4f46e5] uppercase tracking-wide">{kicker}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t('workspace', 'titoloGenerato')}</p>
                    <h2 className="text-base font-bold text-[#1e293b] leading-snug">{title}</h2>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">{t('workspace', 'sommario')}</p>
                    <p className="text-sm text-gray-500 leading-snug">{subtitle}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t('workspace', 'testo')}</p>
                    <div className="text-sm text-gray-700 leading-relaxed space-y-3 max-h-72 overflow-y-auto pr-1">
                      {body.split('\n\n').filter(Boolean).map((p,i)=><p key={i}>{p}</p>)}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-1">
                    {a.generatedTags.map(tag=>(
                      <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-semibold rounded">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
