import { useState } from 'react';
import { Copy, RefreshCw, Check, Loader2, Sparkles, Send, MapPin, Tag, FolderOpen, ExternalLink, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { getWPConfig } from '@/lib/storage';

interface ArticleOutputProps {
  content: string;
  isStreaming: boolean;
  onRewrite: () => void;
  hasStarted: boolean;
  mode?: 'rewrite' | 'brief';
}

export function ArticleOutput({ content, isStreaming, onRewrite, hasStarted }: ArticleOutputProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ ok: true; url: string } | { ok: false; error: string } | null>(null);

  // Parse English output format
  let title = '';
  let kicker = '';
  let body = content;
  let tags = '';
  let city = '';
  let section = '';

  const titleMatch   = content.match(/TITLE:\s*([\s\S]*?)(?=\nKICKER:|\nBODY:|$)/);
  const kickerMatch  = content.match(/KICKER:\s*([\s\S]*?)(?=\nBODY:|$)/);
  const bodyMatch    = content.match(/BODY:\s*([\s\S]*?)(?=\nSEO TAGS:|\nCITY:|\nSECTION:|$)/);
  const tagsMatch    = content.match(/SEO TAGS:\s*([\s\S]*?)(?=\nCITY:|\nSECTION:|$)/);
  const cityMatch    = content.match(/CITY:\s*([\s\S]*?)(?=\nSECTION:|$)/);
  const sectionMatch = content.match(/SECTION:\s*([\s\S]*?)(?=$)/);

  if (titleMatch)   title   = titleMatch[1].trim();
  if (kickerMatch)  kicker  = kickerMatch[1].trim();
  if (bodyMatch)    body    = bodyMatch[1].trim();
  if (tagsMatch)    tags    = tagsMatch[1].trim();
  if (cityMatch)    city    = cityMatch[1].trim();
  if (sectionMatch) section = sectionMatch[1].trim();

  // Fallback if still streaming (partial output)
  if (!titleMatch && !kickerMatch && !bodyMatch && content.length > 0) {
    if (content.includes('TITLE:')) {
      title = content.split('\n')[0].replace('TITLE:', '').trim();
      body = '';
    } else {
      body = content;
    }
  }

  const wordCount = body.split(/\s+/).filter(w => w.length > 0).length;

  const handleCopy = () => {
    navigator.clipboard.writeText(`TITLE: ${title}\nKICKER: ${kicker}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
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
          excerpt: kicker,
          tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          category: section || cfg.defaultCategory,
          status: cfg.defaultStatus,
          slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPublishResult({ ok: true, url: data.postUrl });
      } else {
        setPublishResult({ ok: false, error: data.error || 'Publish failed' });
      }
    } catch {
      setPublishResult({ ok: false, error: 'Network error' });
    } finally {
      setPublishing(false);
    }
  };

  if (!hasStarted) {
    return (
      <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-gray-300" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">{t('articleOutput', 'prontoGenerare')}</h3>
        <p className="text-sm text-gray-500 max-w-sm">
          {t('articleOutput', 'incollaTesto')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
          {isStreaming ? (
            <>
              <Loader2 className="w-4 h-4 text-[#4f46e5] animate-spin" />
              <span className="text-[#4f46e5]">{t('articleOutput', 'stesuraCorso')}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-[#4f46e5]" />
              {t('articleOutput', 'bozzaArticolo')}
            </>
          )}
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            disabled={isStreaming || !content}
            className="p-1.5 text-gray-500 hover:text-black rounded-md hover:bg-white border border-transparent hover:border-gray-200 transition-all disabled:opacity-50"
            title={t('articleOutput', 'copiaBozza')}
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={onRewrite}
            disabled={isStreaming}
            className="p-1.5 text-gray-500 hover:text-[#4f46e5] rounded-md hover:bg-white border border-transparent hover:border-gray-200 transition-all disabled:opacity-50"
            title="Regenerate with same parameters"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto relative bg-[#f8fafc]">
        <div className="max-w-2xl mx-auto bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">

          {(title || isStreaming) && (
            <div className="w-full h-48 bg-gray-200 relative overflow-hidden">
              <img src="https://picsum.photos/800/400?news" alt="Cover" className="w-full h-full object-cover opacity-90" />
              <div className="absolute top-3 left-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">
                Suggested Image
              </div>
            </div>
          )}

          <div className="p-6 md:p-8">
            <div className="mb-6 border-b border-gray-100 pb-6">
              {kicker && (
                <p className="text-[#4f46e5] font-semibold text-sm md:text-base uppercase tracking-wide mb-3">
                  {kicker}
                </p>
              )}
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 leading-tight">
                {title || (isStreaming ? '' : 'Untitled')}
              </h1>
            </div>

            <div className="prose prose-sm md:prose-base prose-neutral max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
              {body}
              {isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-[#4f46e5] animate-pulse-slow align-middle"></span>
              )}
            </div>

            {(!isStreaming && content.length > 0) && (
              <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                {section && (
                  <div className="flex items-center gap-2 text-sm">
                    <FolderOpen className="w-4 h-4 text-[#4f46e5]" />
                    <span className="text-gray-500">{t('articleOutput', 'sezione')}:</span>
                    <span className="font-semibold text-gray-800">{section}</span>
                  </div>
                )}
                {city && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <span className="text-gray-500">{t('articleOutput', 'citta')}:</span>
                    <span className="font-semibold text-gray-800">{city}</span>
                  </div>
                )}
                {tags && (
                  <div className="flex items-start gap-2 text-sm md:col-span-3 mt-2">
                    <Tag className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <div className="flex flex-wrap gap-2">
                      {tags.split(',').map((tag, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {!isStreaming && content && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex flex-col gap-2">
          {publishResult && (
            publishResult.ok ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <Check className="w-3.5 h-3.5 shrink-0" />
                Published!
                <a href={publishResult.url} target="_blank" rel="noopener noreferrer"
                  className="ml-1 underline flex items-center gap-1 hover:text-emerald-900">
                  View post <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {publishResult.error}
              </div>
            )
          )}
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500 font-medium">
              <span className="mr-4">Status: <span className="text-amber-600">Draft — pending review</span></span>
              <span>Length: {wordCount} words</span>
            </div>
            <button
              onClick={handleSend}
              disabled={publishing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors bg-[#1e1b4b] hover:bg-[#312e81] text-white shadow-sm disabled:opacity-60"
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {t('articleOutput', 'pubblicaWp')}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
