import { RewriteConfig } from '@/lib/prompts';
import { Agente } from '@/lib/storage';
import { Settings2 } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

interface ConfigPanelProps {
  config: RewriteConfig;
  onChange: (config: Partial<RewriteConfig>) => void;
  disabled: boolean;
  agenti: Agente[];
  mode?: 'rewrite' | 'brief';
}

export function ConfigPanel({ config, onChange, disabled, agenti, mode = 'rewrite' }: ConfigPanelProps) {
  const { t } = useLanguage();
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-[#4f46e5]" />
          {t('configPanel', 'configEditoriale')}
        </h2>
      </div>

      <div className="p-4 flex flex-col gap-5 overflow-y-auto flex-1">
        
        {/* Testata */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('configPanel', 'testata')}</label>
          <input
            type="text"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] transition-all"
            value={config.testataNome}
            onChange={(e) => onChange({ testataNome: e.target.value })}
            placeholder="Es. Il Post, La Repubblica..."
            disabled={disabled}
          />
        </div>

        {/* Profilo editoriale */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('configPanel', 'profilo')}</label>
          <select
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] transition-all bg-white"
            value={config.agenteId}
            onChange={(e) => onChange({ agenteId: e.target.value })}
            disabled={disabled}
          >
            {agenti.map(a => (
              <option key={a.id} value={a.id}>{a.nome} ({a.categoriaTarget})</option>
            ))}
          </select>
        </div>

        {/* Lunghezza */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('configPanel', 'lunghezza')}</label>
          <select
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] transition-all bg-white"
            value={config.lunghezza}
            onChange={(e) => onChange({ lunghezza: e.target.value })}
            disabled={disabled}
          >
            <option value="Breve (100-150 parole)">{t('configPanel', 'lunghezze.breve' as any)}</option>
            <option value="Media (250-350 parole)">{t('configPanel', 'lunghezze.media' as any)}</option>
            <option value="Lunga (500+ parole)">{t('configPanel', 'lunghezze.lunga' as any)}</option>
          </select>
        </div>

        {/* Lingua */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('configPanel', 'linguaOutput')}</label>
          <select
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] transition-all bg-white"
            value={config.lingua}
            onChange={(e) => onChange({ lingua: e.target.value })}
            disabled={disabled}
          >
            <option value="Italiano">{t('configPanel', 'lingue.it' as any)}</option>
            <option value="Inglese">{t('configPanel', 'lingue.en' as any)}</option>
            <option value="Spagnolo">{t('configPanel', 'lingue.es' as any)}</option>
          </select>
        </div>

        {/* Mantieni Titolo */}
        <div className="mt-2 pt-4 border-t border-gray-200">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 text-[#4f46e5] rounded border-gray-200 focus:ring-[#4f46e5]"
              checked={config.mantieniTitolo}
              onChange={(e) => onChange({ mantieniTitolo: e.target.checked })}
              disabled={disabled}
            />
            <span className="text-sm font-medium text-gray-800">
              {t('configPanel', 'mantieniTitolo')}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

