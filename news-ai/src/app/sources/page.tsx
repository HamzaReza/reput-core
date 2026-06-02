'use client';

import { useState, useEffect } from 'react';
import { Newspaper, Globe, MapPin, Trash2 } from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

interface Source {
  id: string;
  name: string;
  url: string;
  type: string;
  state: string;
  category?: string;
  city_filter?: string;
}

export default function SourcesPage() {
  const { t } = useLanguage();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState('National News');
  const [newCity, setNewCity] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<Source[]>('/sources')
      .then(setSources)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    setSaving(true);
    try {
      const created = await apiPost<Source>('/sources', {
        name: newName.trim(),
        url: newUrl.trim(),
        type: 'RSS',
        state: 'active',
        category: newCategory.trim() || 'National News',
        city_filter: newCity.trim() || null,
      });
      setSources(prev => [...prev, created]);
      setNewName('');
      setNewUrl('');
      setNewCity('');
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiDelete(`/sources/${id}`);
      setSources(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      console.error(err);
    }
  };

  const grouped = sources.reduce((acc, s) => {
    const cat = s.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {} as Record<string, Source[]>);

  return (
    <div className="flex flex-col h-full bg-[#f1f5f9] max-w-5xl mx-auto">
      <div className="px-8 py-8">
        <h1 className="text-3xl font-serif font-bold text-[#1e293b] mb-1">{t('testate', 'titolo')}</h1>
        <p className="text-[#64748b] text-base">
          {sources.length} {t('testate', 'attive')} {sources.length} {t('testate', 'totali')}
        </p>
      </div>

      <div className="px-8 pb-12 flex-1 flex flex-col gap-8">

        {/* Add form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:w-[600px]">
          <h2 className="text-lg font-bold text-[#1e293b] mb-6">{t('testate', 'nuovaTestata')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('testate', 'nomeTestata')}</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] transition-all"
                placeholder="Il Messaggero"
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('testate', 'urlFeed')}</label>
              <input
                type="url"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] transition-all text-gray-500"
                placeholder="https://www.ilmessaggero.it/rss..."
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('testate', 'categoriaEditoriale')}</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#4f46e5] transition-all text-gray-500"
                  placeholder="National News"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('testate', 'filtroCitta')}</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#4f46e5] transition-all text-gray-500"
                  placeholder={t('testate', 'placeholderCitta')}
                  value={newCity}
                  onChange={e => setNewCity(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleAdd}
                disabled={!newName.trim() || !newUrl.trim() || saving}
                className="px-6 py-2.5 bg-[#1e1b4b] hover:bg-[#312e81] text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? '...' : t('testate', 'aggiungi')}
              </button>
              <button
                onClick={() => { setNewName(''); setNewUrl(''); }}
                className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                {t('testate', 'annulla')}
              </button>
            </div>
          </div>
        </div>

        {/* Source list */}
        {loading ? (
          <p className="text-sm text-gray-400 px-1">Loading...</p>
        ) : (
          <div className="md:w-[600px] space-y-8">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <div className="flex items-center gap-3 mb-4 px-1">
                  <MapPin className="w-4 h-4 text-red-700" />
                  <h3 className="text-sm font-bold tracking-widest text-gray-500 uppercase">{cat}</h3>
                  <span className="text-sm font-bold text-gray-400">{items.length}</span>
                </div>
                <div className="space-y-3">
                  {items.map(source => (
                    <div key={source.id} className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-[#eef2ff] transition-colors">
                          <Newspaper className="w-5 h-5 text-gray-400 group-hover:text-[#4f46e5]" />
                        </div>
                        <div>
                          <h4 className="font-bold text-[#1e293b] text-base">{source.name}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Globe className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-sm text-gray-500">
                              {source.url.replace('https://', '').replace('http://', '').split('/')[0]}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {source.city_filter && (
                          <div className="flex items-center gap-1 bg-red-50 text-red-600 px-2 py-1 text-[10px] font-bold rounded uppercase">
                            <MapPin className="w-3 h-3" />{source.city_filter}
                          </div>
                        )}
                        <div className="bg-[#ecfdf5] text-[#059669] px-2.5 py-1 text-xs font-bold rounded-md">
                          {source.type}
                        </div>
                        <button
                          onClick={() => handleDelete(source.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {sources.length === 0 && !loading && (
              <p className="text-sm text-gray-400 px-1">No sources yet. Add your first RSS feed above.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
