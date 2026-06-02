export interface Testata {
  id: string;
  nome: string;
  url: string;
  tipo: string;
  stato: 'attivo' | 'inattivo';
  categoria?: string;
  filtroCitta?: string;
}

const STORAGE_KEY = 'newsai_testate_v2'; // Changed key to force new defaults

const defaultTestate: Testata[] = [
  // News Nazionali e Generali
  { id: '1', nome: 'ANSA - Top News', url: 'https://www.ansa.it/sito/notizie/topnews/topnews_rss.xml', tipo: 'RSS', stato: 'attivo', categoria: 'News Nazionali' },
  { id: '2', nome: 'Corriere della Sera', url: 'http://xml2.corriereobjects.it/rss/homepage.xml', tipo: 'RSS', stato: 'attivo', categoria: 'News Nazionali' },
  { id: '3', nome: 'La Repubblica', url: 'https://www.repubblica.it/rss/homepage/rss2.0.xml', tipo: 'RSS', stato: 'attivo', categoria: 'News Nazionali' },
  { id: '4', nome: 'La Stampa', url: 'https://www.lastampa.it/rss/homepage', tipo: 'RSS', stato: 'attivo', categoria: 'News Nazionali' },
  { id: '5', nome: 'Il Messaggero', url: 'https://www.ilmessaggero.it/rss/home.xml', tipo: 'RSS', stato: 'attivo', categoria: 'News Nazionali' },
  { id: '6', nome: 'Open', url: 'https://www.open.online/feed/', tipo: 'RSS', stato: 'attivo', categoria: 'News Nazionali' },
  { id: '7', nome: 'Il Fatto Quotidiano', url: 'https://www.ilfattoquotidiano.it/feed/', tipo: 'RSS', stato: 'attivo', categoria: 'News Nazionali' },
  
  // Economia
  { id: '8', nome: 'Il Sole 24 Ore', url: 'https://www.ilsole24ore.com/rss/primapagina.xml', tipo: 'RSS', stato: 'attivo', categoria: 'Economia' },
  { id: '9', nome: 'Milano Finanza', url: 'https://www.milanofinanza.it/rss/homepage.xml', tipo: 'RSS', stato: 'attivo', categoria: 'Economia' },
  
  // Tecnologia
  { id: '10', nome: 'Wired Italia', url: 'https://www.wired.it/feed/rss', tipo: 'RSS', stato: 'attivo', categoria: 'Tecnologia' },
  { id: '11', nome: 'Punto Informatico', url: 'https://www.punto-informatico.it/feed/', tipo: 'RSS', stato: 'attivo', categoria: 'Tecnologia' },
  { id: '12', nome: 'HDblog', url: 'https://feeds.feedburner.com/HDBlog', tipo: 'RSS', stato: 'attivo', categoria: 'Tecnologia' },
  
  // Esteri
  { id: '13', nome: 'ANSA - Mondo', url: 'https://www.ansa.it/sito/notizie/mondo/mondo_rss.xml', tipo: 'RSS', stato: 'attivo', categoria: 'Esteri' },
];

export function getTestate(): Testata[] {
  if (typeof window === 'undefined') return defaultTestate;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return defaultTestate;
    }
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultTestate));
  return defaultTestate;
}

export function saveTestate(testate: Testata[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(testate));
}

// === AGENTI AI STORAGE ===

export interface Agente {
  id: string;
  nome: string;
  categoriaTarget: string; // "Tutte", "Economia", "Sport", ecc.
  modello: string;
  temperatura: number;
  prompt: string;
}

const AGENTS_STORAGE_KEY = 'newsai_agenti_v1';

const defaultAgents: Agente[] = [
  {
    id: '1',
    nome: 'Standard Editor',
    categoriaTarget: 'All',
    modello: 'Claude Haiku',
    temperatura: 0.7,
    prompt: 'You are an expert journalist. Rewrite the provided news maintaining a professional and impartial tone, never altering facts or adding personal opinions. Always generate a strong title, a concise kicker, and text formatted in paragraphs.'
  },
  {
    id: '2',
    nome: 'Financial Expert',
    categoriaTarget: 'Economy',
    modello: 'Claude Haiku',
    temperatura: 0.4,
    prompt: 'You are a financial analyst. Use technical but clear language. Highlight numbers, percentages and market movements. Avoid sensationalism. Always cite specific data and provide context for market changes.'
  }
];

export function getAgenti(): Agente[] {
  if (typeof window === 'undefined') return defaultAgents;
  
  const stored = localStorage.getItem(AGENTS_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return defaultAgents;
    }
  }
  
  localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(defaultAgents));
  return defaultAgents;
}

export function saveAgenti(agenti: Agente[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agenti));
}

// === DRAFTS STORAGE ===

import type { AIDraft } from './mockDrafts';

const DRAFTS_KEY = 'newsai_drafts_v1';

export function getDrafts(): AIDraft[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]'); }
  catch { return []; }
}

export function saveDrafts(drafts: AIDraft[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

// === PUBLISHED STORAGE ===

export interface PublishedArticle {
  id: string;
  titolo: string;
  fonteOriginale: string;
  dataPubblicazione: string;
  categoria: string;
  parole: number;
  originalUrl: string;
}

const PUBLISHED_KEY = 'newsai_published_v1';

export function getPublished(): PublishedArticle[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(PUBLISHED_KEY) || '[]'); }
  catch { return []; }
}

export function savePublished(items: PublishedArticle[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PUBLISHED_KEY, JSON.stringify(items));
}

// === REGOLE STORAGE ===

export interface RegoleConfig {
  autopilota: boolean;
  modalitaUrgente: boolean;
  frequenzaRSS: string;
  rotazioneFonti: number;
  smartTags: string;
  richiedeApprovazioneManuale: boolean;
  filtroParoleSensibili: boolean;
}

const REGOLE_KEY = 'newsai_regole_v1';

const DEFAULT_REGOLE: RegoleConfig = {
  autopilota: true,
  modalitaUrgente: false,
  frequenzaRSS: 'Ogni 15 minuti',
  rotazioneFonti: 3,
  smartTags: 'Politics, Economy, Crime, Health, Sport, Trump, Iran, War, AI, Tech',
  richiedeApprovazioneManuale: true,
  filtroParoleSensibili: true,
};

export function getRegole(): RegoleConfig {
  if (typeof window === 'undefined') return DEFAULT_REGOLE;
  try {
    const stored = localStorage.getItem(REGOLE_KEY);
    return stored ? { ...DEFAULT_REGOLE, ...JSON.parse(stored) } : DEFAULT_REGOLE;
  } catch { return DEFAULT_REGOLE; }
}

export function saveRegole(cfg: RegoleConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REGOLE_KEY, JSON.stringify(cfg));
}

// === WORDPRESS STORAGE ===

export interface WPConfig {
  siteUrl: string;
  username: string;
  appPassword: string;
  defaultCategory: string;
  defaultStatus: 'draft' | 'publish';
}

const WP_KEY = 'newsai_wordpress_v1';

const EMPTY_WP: WPConfig = {
  siteUrl: '',
  username: '',
  appPassword: '',
  defaultCategory: 'News',
  defaultStatus: 'draft',
};

export function getWPConfig(): WPConfig {
  if (typeof window === 'undefined') return EMPTY_WP;
  try {
    const stored = localStorage.getItem(WP_KEY);
    return stored ? { ...EMPTY_WP, ...JSON.parse(stored) } : EMPTY_WP;
  } catch { return EMPTY_WP; }
}

export function saveWPConfig(cfg: WPConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WP_KEY, JSON.stringify(cfg));
}

// === AGENT PROFILES STORAGE ===

const AGENT_PROFILES_KEY = 'newsai_agent_profiles_v1';

export function getAgentProfiles<T>(): T[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(AGENT_PROFILES_KEY) || '[]'); }
  catch { return []; }
}

export function saveAgentProfiles<T>(profiles: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AGENT_PROFILES_KEY, JSON.stringify(profiles));
}

