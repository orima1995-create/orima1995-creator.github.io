import { historyContent } from './history-content';

export type HistoryCatalogEntry = {
  id: string;
  group: 'milestone' | 'owner' | 'research';
  era: '1910s' | '1940s' | '1950s' | '1960s' | 'electronic';
  sort: number;
  meta: string;
  name: string;
  hook: string;
  cardSummary: string;
  cardStatus: string;
  featured: boolean;
  href?: string;
  hrefKind?: 'site' | 'external';
};

type HistoryCatalogSourceEntry = Omit<HistoryCatalogEntry, 'era'>;

const chapterCards = [
  ['1910s', historyContent.era1910s.cards],
  ['1940s', historyContent.era1940s.cards],
  ['1950s', historyContent.era1950s.cards],
  ['1960s', historyContent.era1960s.cards],
  ['electronic', historyContent.electronic.cards]
] as const;

export const historyCatalog: HistoryCatalogEntry[] = chapterCards.flatMap(([era, cards]) =>
  (cards as unknown as HistoryCatalogSourceEntry[]).map((entry) => ({ ...entry, era }))
);

export const historyCatalogByGroup = {
  milestones: historyCatalog.filter((entry) => entry.group === 'milestone').sort((a, b) => a.sort - b.sort),
  owners: historyCatalog.filter((entry) => entry.group === 'owner').sort((a, b) => a.sort - b.sort),
  research: historyCatalog.filter((entry) => entry.group === 'research').sort((a, b) => a.sort - b.sort)
};
