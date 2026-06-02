export type DraftStatus = 'AI Draft' | 'Pending Approval' | 'Approved' | 'Published';
export type PriorityReason = 'Breaking news' | 'Authoritative source' | 'Strategic keyword' | 'Priority category' | 'Trending topic' | 'High traffic';
export type ImageStatus = 'Selected' | 'Not selected' | 'To verify' | 'License required';
export type ImageSource = 'Unsplash' | 'Getty' | 'iStock' | 'Bing Image' | 'Manual';

export interface AlternativeImage {
  thumbnailUrl: string;
  source: ImageSource;
  license: string;
  attribution: string;
  relevanceScore: number;
}

export interface AIDraft {
  id: string;
  // ── Original source ───────────────────────────────────────────────────────
  originalSource: string;
  originalUrl: string;
  originalTitle: string;
  originalExcerpt: string;
  originalPublishedAt: string;
  // ── AI generated content ──────────────────────────────────────────────────
  generatedKicker: string;
  generatedTitle: string;
  generatedSubtitle: string;
  generatedBodyPreview: string;
  generatedBody: string;
  generatedSeoTitle: string;
  generatedMetaDescription: string;
  generatedSlug: string;
  generatedTags: string[];
  generatedCategory: string;
  generatedCity: string;
  // ── Cover image ───────────────────────────────────────────────────────────
  coverImageUrl: string;
  coverImageStatus: ImageStatus;
  coverImageSource: ImageSource;
  coverImageLicense: string;
  coverImageAttribution: string;
  imageSearchQuery: string;
  imageAltText: string;
  imageCaption: string;
  alternativeImages: AlternativeImage[];
  // ── Editorial metadata ────────────────────────────────────────────────────
  priorityScore: number;
  priorityReasons: PriorityReason[];
  status: DraftStatus;
  isBreaking: boolean;
}

// ─── Deterministic enrichment table ──────────────────────────────────────────
const ENRICHMENT: Pick<AIDraft, 'priorityScore'|'priorityReasons'|'status'|'isBreaking'>[] = [
  { priorityScore: 94, isBreaking: true,  status: 'AI Draft',          priorityReasons: ['Breaking news','Authoritative source','Strategic keyword'] },
  { priorityScore: 89, isBreaking: false, status: 'AI Draft',          priorityReasons: ['Trending topic','Priority category'] },
  { priorityScore: 83, isBreaking: false, status: 'Pending Approval',  priorityReasons: ['Strategic keyword','High traffic'] },
  { priorityScore: 78, isBreaking: false, status: 'AI Draft',          priorityReasons: ['Authoritative source','Priority category'] },
  { priorityScore: 91, isBreaking: true,  status: 'AI Draft',          priorityReasons: ['Breaking news','Authoritative source'] },
  { priorityScore: 76, isBreaking: false, status: 'Pending Approval',  priorityReasons: ['Trending topic','Strategic keyword','Authoritative source'] },
  { priorityScore: 85, isBreaking: false, status: 'Approved',          priorityReasons: ['Priority category','High traffic'] },
  { priorityScore: 70, isBreaking: false, status: 'AI Draft',          priorityReasons: ['High traffic'] },
  { priorityScore: 68, isBreaking: false, status: 'AI Draft',          priorityReasons: ['Trending topic','Priority category'] },
  { priorityScore: 64, isBreaking: false, status: 'Pending Approval',  priorityReasons: ['Strategic keyword'] },
  { priorityScore: 61, isBreaking: false, status: 'Published',         priorityReasons: ['High traffic'] },
  { priorityScore: 88, isBreaking: false, status: 'AI Draft',          priorityReasons: ['Trending topic','Authoritative source','High traffic'] },
];

// ─── Image pool ───────────────────────────────────────────────────────────────
const IMAGE_POOL: Pick<AIDraft,'coverImageStatus'|'coverImageSource'|'coverImageLicense'|'coverImageAttribution'>[] = [
  { coverImageStatus:'Selected',        coverImageSource:'Unsplash', coverImageLicense:'Unsplash License (free)', coverImageAttribution:'Photo by Unsplash' },
  { coverImageStatus:'To verify',       coverImageSource:'Getty',    coverImageLicense:'Editorial license required', coverImageAttribution:'Getty Images' },
  { coverImageStatus:'Not selected',    coverImageSource:'Unsplash', coverImageLicense:'—',                          coverImageAttribution:'—' },
  { coverImageStatus:'License required',coverImageSource:'iStock',   coverImageLicense:'iStock Standard License',    coverImageAttribution:'iStock by Getty Images' },
];

// ─── Fallback body content ────────────────────────────────────────────────────
const FULL_BODY = `The story has drawn significant public attention in recent hours, with implications that extend well beyond the immediate scope of the original events. Competent authorities are monitoring the situation, while international observers question the possible short and medium-term repercussions.

According to reconstructions by major news agencies, events developed progressively over the past few days. The picture that emerges is one of a continuously evolving situation, requiring constant monitoring by all parties involved.

Analysts consulted by the editorial team highlight how this episode fits into a broader context, already marked by underlying tensions that had at least partially anticipated recent developments. "This is not an isolated case," said a sector expert, "but a signal to be interpreted in light of the current situation."

Institutional reactions were swift. Key figures involved released official statements, seeking to frame the matter constructively and reassure the public of institutions' capacity to manage the situation.

On the economic front, markets responded with some caution, with contained fluctuations that seem to reflect operator uncertainty. Sector experts believe the coming weeks will provide a clearer picture of the structural consequences.

Numerous questions remain open that the public awaits to be clarified in the coming hours. The editorial team will continue to follow developments, updating the public with verified and contextualised news.`;

const PREVIEW_BODY = `The story has drawn significant public attention in recent hours, with implications that extend well beyond the immediate scope of the original events. Competent authorities are monitoring the situation, while international observers question the possible repercussions.`;

// ─── Section detection ─────────────────────────────────────────────────────────
const KEYWORD_SECTIONS: Record<string, string[]> = {
  Politics:     ['government','parliament','election','president','congress','senate','vote','policy'],
  Economy:      ['market','stock','gdp','inflation','rates','central bank','trade','finance'],
  International:['iran','war','russia','ukraine','israel','gaza','usa','china','nato','un'],
  Crime:        ['murder','arrest','police','accident','trial','court','investigation'],
  Sport:        ['champions league','football','tennis','basketball','olympics','transfer'],
  Health:       ['health','vaccine','hospital','doctor','medicine','pandemic','research'],
};

export function detectCategory(text: string): string {
  const lower = text.toLowerCase();
  for (const [cat, kws] of Object.entries(KEYWORD_SECTIONS)) {
    if (kws.some(kw => lower.includes(kw))) return cat;
  }
  return 'News';
}

const KICKERS = ['Analysis', 'Behind the scenes', 'In focus', 'Deep dive', 'Investigation', 'Context'];

const SUBTITLES: Record<string, string[]> = {
  Politics: [
    "Party reactions and future scenarios following the latest institutional announcement.",
    "A detailed analysis of the government's internal dynamics and possible effects on the parliamentary debate."
  ],
  Economy: [
    "Markets are watching recent macroeconomic developments closely as analysts outline forecasts for the next quarter.",
    "The impact of new financial directives on consumers and the strategies of large corporations."
  ],
  International: [
    "International tensions reach a new peak: the role of diplomacy and the moves of the key global actors.",
    "A focus on the humanitarian and geopolitical consequences of the ongoing crisis, between sanctions and mediation attempts."
  ],
  Crime: [
    "Details emerging from the latest investigations shed light on the dynamics of events. Investigators maintain strict confidentiality.",
    "The local community is shaken by recent events as law enforcement intensifies territorial controls."
  ],
  Sport: [
    "Tactical choices and on-field performances analysed in depth.",
    "Behind the scenes of the agreement and prospects for the next season, between fan expectations and club strategies."
  ],
  Health: [
    "New scientific community guidelines promise to revolutionise intervention protocols.",
    "Expert warnings and countermeasures adopted by institutions to contain associated risks."
  ],
  News: [
    "All the details of the story dominating front pages, explained step by step.",
    "A recap of key events from recent hours and public reactions on social networks."
  ]
};

// ─── Enrich raw RSS item → AIDraft ────────────────────────────────────────────
export function enrichToDraft(item: {
  title: string; link: string; pubDate: string;
  contentSnippet: string; sourceName: string;
}, idx: number): AIDraft {
  const mock  = ENRICHMENT[idx % ENRICHMENT.length];
  const img   = IMAGE_POOL[idx % IMAGE_POOL.length];
  const cat   = detectCategory(`${item.title} ${item.contentSnippet}`);
  const slug  = item.title.toLowerCase().replace(/[^a-z0-9]+/gi,'-').substring(0,55);
  const seed  = idx + 10;
  const hasImg = img.coverImageStatus !== 'Not selected';

  const altImages: AlternativeImage[] = [
    { thumbnailUrl:`https://picsum.photos/seed/${seed+1}/160/90`, source:'Unsplash', license:'Free',              attribution:'Unsplash',    relevanceScore:88 },
    { thumbnailUrl:`https://picsum.photos/seed/${seed+2}/160/90`, source:'Unsplash', license:'Free',              attribution:'Unsplash',    relevanceScore:74 },
    { thumbnailUrl:`https://picsum.photos/seed/${seed+3}/160/90`, source:'Getty',    license:'Editorial license', attribution:'Getty Images', relevanceScore:61 },
  ];

  const kicker = KICKERS[idx % KICKERS.length];
  const subtitleOpts = SUBTITLES[cat] || SUBTITLES['News'];
  const subtitle = subtitleOpts[idx % subtitleOpts.length];

  return {
    id: `draft-${idx}`,
    originalSource:      item.sourceName,
    originalUrl:         item.link,
    originalTitle:       item.title,
    originalExcerpt:     item.contentSnippet || '',
    originalPublishedAt: item.pubDate,
    generatedKicker:      kicker,
    generatedTitle:       `${item.title.split(':')[0].trim()}`,
    generatedSubtitle:    subtitle,
    generatedBodyPreview: PREVIEW_BODY,
    generatedBody:        FULL_BODY,
    generatedSeoTitle:    `${item.title.substring(0,52)}... | Editorial`,
    generatedMetaDescription: subtitle,
    generatedSlug:        slug,
    generatedTags:        [cat, item.sourceName.split(' ')[0], 'News', 'Analysis'],
    generatedCategory:    cat,
    generatedCity:        cat === 'Crime' ? 'Local' : cat === 'Sport' ? 'National' : 'National',
    coverImageUrl:        hasImg ? `https://picsum.photos/seed/${seed}/800/450` : '',
    coverImageStatus:     img.coverImageStatus,
    coverImageSource:     img.coverImageSource,
    coverImageLicense:    img.coverImageLicense,
    coverImageAttribution:img.coverImageAttribution,
    imageSearchQuery:     `${cat} ${item.title.split(' ').slice(0,3).join(' ')}`,
    imageAltText:         `Image related to article about ${cat}`,
    imageCaption:         `Cover photo — source: ${img.coverImageSource}`,
    alternativeImages:    altImages,
    ...mock,
  };
}

export const QUEUE_SUMMARY = {
  inCoda:              0,
  inApprovazione:      0,
  fontiMonitorate:     13,
  ultimoAggiornamento: '—',
};
