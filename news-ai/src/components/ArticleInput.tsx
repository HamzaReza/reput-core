import { useState, useEffect } from 'react';
import { Link as LinkIcon, FileText, Loader2, Search } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

interface ArticleInputProps {
  text: string;
  onChange: (text: string) => void;
  isLoading: boolean;
  initialUrl?: string;
}

export function ArticleInput({ text, onChange, isLoading, initialUrl }: ArticleInputProps) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'text' | 'url'>(initialUrl ? 'url' : 'text');
  const [url, setUrl] = useState(initialUrl || '');
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  const handleFetch = async (urlToFetch: string) => {
    if (!urlToFetch) return;
    setIsFetching(true);
    setError('');
    
    try {
      const res = await apiFetch('/fetch-article', {
        method: 'POST',
        body: JSON.stringify({ url: urlToFetch }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Errore durante il recupero');
      }
      
      onChange(data.text);
      setMode('text');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (initialUrl && !text) {
      handleFetch(initialUrl);
    }
  }, [initialUrl]);


  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <h2 className="font-semibold text-sm text-[var(--color-text)] flex items-center gap-2">
          <FileText className="w-4 h-4 text-[var(--color-primary)]" />
          {t('articleInput', 'testoOriginale')}
        </h2>
        <div className="flex bg-white rounded-md border border-[var(--color-border)] p-0.5">
          <button
            onClick={() => setMode('text')}
            className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
              mode === 'text' 
                ? 'bg-[var(--color-surface-hover)] text-black shadow-sm' 
                : 'text-[var(--color-text-muted)] hover:text-black'
            }`}
          >
            {t('articleInput', 'testo')}
          </button>
          <button
            onClick={() => setMode('url')}
            className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
              mode === 'url' 
                ? 'bg-[var(--color-surface-hover)] text-black shadow-sm' 
                : 'text-[var(--color-text-muted)] hover:text-black'
            }`}
          >
            {t('articleInput', 'url')}
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col">
        {mode === 'text' ? (
          <textarea
            className="flex-1 w-full resize-none outline-none text-sm leading-relaxed text-[var(--color-text)] placeholder-[var(--color-text-muted)] bg-transparent"
            placeholder={t('articleInput', 'placeholder')}
            value={text}
            onChange={(e) => onChange(e.target.value)}
            disabled={isLoading}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="text-sm text-[var(--color-text-muted)]">
              {t('articleInput', 'inserisciUrl')}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                <input
                  type="url"
                  className="w-full pl-9 pr-4 py-2 text-sm border border-[var(--color-border)] rounded-md outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all bg-[var(--color-surface)]"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetch(url)}
                  disabled={isFetching || isLoading}
                />
              </div>
              <button
                onClick={() => handleFetch(url)}
                disabled={!url || isFetching || isLoading}
                className="px-4 py-2 bg-[var(--color-text)] text-white text-sm font-medium rounded-md hover:bg-black disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {t('articleInput', 'estrai')}
              </button>
            </div>
            {error && (
              <div className="text-xs text-[var(--color-primary)] bg-[#fee2e2] p-3 rounded-md border border-[#fca5a5]">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
      
      {mode === 'text' && (
        <div className="px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)] flex justify-between">
          <span>{text.length} {t('articleInput', 'caratteri')}</span>
          <span>{text.split(/\s+/).filter(w => w.length > 0).length} {t('articleInput', 'parole')}</span>
        </div>
      )}
    </div>
  );
}
