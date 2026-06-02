'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Globe, ExternalLink, CalendarDays, Loader2 } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

interface PublishedArticle {
  id: string;
  title: string;
  source_name: string;
  published_at: string;
  category: string;
  word_count: number;
  original_url: string;
}

export default function PublishedPage() {
  const { t, lang } = useLanguage();
  const [items, setItems] = useState<PublishedArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<PublishedArticle[]>('/published')
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'it-IT', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      }).format(new Date(iso));
    } catch { return iso; }
  };

  return (
    <div className="flex flex-col h-full bg-[#f1f5f9] max-w-5xl mx-auto">
      <div className="px-8 py-8">
        <h1 className="text-3xl font-serif font-bold text-[#1e293b] mb-1">{t('pubblicati', 'titolo')}</h1>
        <p className="text-[#64748b] text-base">{t('pubblicati', 'sottotitolo')}</p>
      </div>

      <div className="px-8 pb-12 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold">
                    <th className="px-6 py-4">{t('pubblicati', 'articolo')}</th>
                    <th className="px-6 py-4">{t('pubblicati', 'dataOra')}</th>
                    <th className="px-6 py-4">{t('pubblicati', 'categoria')}</th>
                    <th className="px-6 py-4">{t('pubblicati', 'stato')}</th>
                    <th className="px-6 py-4 text-right">{t('pubblicati', 'azioni')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-gray-400 text-sm">
                        <p className="font-medium text-gray-500 mb-1">{t('pubblicati', 'nessunoTitolo')}</p>
                        <p>{t('pubblicati', 'nessunoDesc')}</p>
                      </td>
                    </tr>
                  ) : (
                    items.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-[#1e293b] text-sm mb-1">{item.title}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1.5">
                            <Globe className="w-3 h-3" />
                            {t('pubblicati', 'da')} {item.source_name} ({item.word_count} {t('pubblicati', 'parole')})
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <CalendarDays className="w-4 h-4 text-gray-400" />
                            {formatDate(item.published_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 bg-[#eef2ff] text-[#4f46e5] text-xs font-bold rounded-md">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                            <CheckCircle2 className="w-4 h-4" />
                            {t('pubblicati', 'pubblicato')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <a href={item.original_url} target="_blank" rel="noopener noreferrer"
                            className="text-gray-400 hover:text-[#4f46e5] transition-colors p-2 rounded-md hover:bg-[#eef2ff] inline-block">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
