export interface RewriteConfig {
  articleText: string;
  testataNome: string;
  agenteId?: string;
  agentePrompt?: string;
  lunghezza: string;
  lingua: string;
  mantieniTitolo: boolean;
  mode?: 'rewrite' | 'brief';
  briefText?: string;
  tipoArticolo?: string;
}

export function buildSystemPrompt(config: RewriteConfig) {
  const titleInstruction = config.mantieniTitolo
    ? 'The TITLE must be strictly the original one.'
    : 'Generate a strong, original TITLE appropriate to the publication\'s tone.';

  const basePrompt = config.agentePrompt || 'You are an expert journalist. Maintain a professional and impartial tone.';

  const taskInstruction = config.mode === 'brief'
    ? `Your task is to GENERATE FROM SCRATCH a ${config.tipoArticolo || 'article'} based on the user's brief/prompt. Be creative, persuasive or informative as requested, while always maintaining high quality and a genuine journalistic publication style.`
    : `Your task is to REWRITE the provided news maintaining a professional and impartial tone, never altering facts or adding personal opinions.`;

  return `You are the AI editorial engine for ${config.testataNome}.

${basePrompt}

${taskInstruction}

TARGET LENGTH: ${config.lunghezza}
OUTPUT LANGUAGE: ${config.lingua}


FUNDAMENTAL RULES:
- Do not invent facts, data, names or figures not present in the original
- Do not add opinions or editorial comments not present in the original
- Keep all relevant facts from the original article
- Completely rewrite sentence structure — do not copy entire sentences

REQUIRED OUTPUT FORMAT (Use exactly these prefixes):
TITLE: ${titleInstruction}
KICKER: (Generate a brief summary or launch phrase, max 15 words)
BODY:
(Insert the rewritten article text here, SEO-optimized, formatted in paragraphs)
SEO TAGS: (Generate 4-5 comma-separated tags for SEO optimization)
CITY: (Indicate the reference city if present, otherwise write "National" or "International")
SECTION: (Indicate the editorial section: e.g. Economy, Politics, Crime, International, Sport, Health, Corporate)`;
}
