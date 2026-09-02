export type HistoryCatalogGroup = 'milestone' | 'owner' | 'research';
export type HistoryHrefKind = 'hash' | 'site';

export interface HistoryCatalogEntry {
  id: string;
  group: HistoryCatalogGroup;
  era: '1910s' | '1940s' | '1950s' | '1960s';
  sort: number;
  meta: string;
  name: string;
  hook?: string;
  cardSummary?: string;
  cardStatus?: string;
  href: string;
  hrefKind: HistoryHrefKind;
  featured: boolean;
}

/**
 * HISTORY のカードで共有する時計・テーマのマスターデータ。
 *
 * WATCH / RESEARCH INDEX は視覚レビュ後に削除したため、
 * カード移行が始まるまで既存表示からは参照しない。
 */
export const historyCatalog: HistoryCatalogEntry[] = [
  {
    id: 'eterna-alarm-1914',
    group: 'milestone',
    era: '1910s',
    sort: 10,
    meta: '1914 / ETERNA',
    name: 'ETERNA ALARM',
    hook: 'アラームを、腕時計のサイズへ。',
    cardSummary: '一つの香箱から時刻とアラームを動かす、最初期の量産アラーム腕時計。',
    cardStatus: 'MILESTONE',
    href: '#1910s',
    hrefKind: 'hash',
    featured: true
  },
  {
    id: 'vulcain-cricket',
    group: 'milestone',
    era: '1940s',
    sort: 20,
    meta: '1947 / VULCAIN',
    name: 'CRICKET',
    hook: '腕につけたまま、聞こえる音を。',
    cardSummary: '二重底の音響構造で、装着時のアラーム音を実用的なレベルへ押し上げた。',
    cardStatus: 'MILESTONE',
    href: '#1940s',
    hrefKind: 'hash',
    featured: true
  },
  {
    id: 'basis-alarm-bfg90',
    group: 'owner',
    era: '1940s',
    sort: 25,
    meta: '1948 / BASIS',
    name: 'BASIS ALARM / BFG 90',
    hook: '高級機だけが、アラームではない。',
    cardSummary: '2香箱と巻上げ表示窓を持つBFG 90。実用品としてのアラーム腕時計を見る一例。',
    cardStatus: "OWNER'S NOTE / NEXT",
    href: '#1940s',
    hrefKind: 'hash',
    featured: true
  },
  {
    id: 'jaeger-lecoultre-memovox',
    group: 'milestone',
    era: '1950s',
    sort: 30,
    meta: '1951 / JAEGER-LECOULTRE',
    name: 'MEMOVOX',
    hook: 'アラーム専用の動力を持つ。',
    cardSummary: '時刻用とアラーム用に独立した2つの香箱を持つ、代表的な二香箱構成。',
    cardStatus: 'MILESTONE',
    href: '#1950s',
    hrefKind: 'hash',
    featured: true
  },
  {
    id: 'as-1475',
    group: 'milestone',
    era: '1950s',
    sort: 40,
    meta: '1954 / A. SCHILD',
    name: 'AS 1475',
    hook: 'アラームを、もっと多くの腕へ。',
    cardSummary: '多数のブランドへ広がり、アラーム腕時計の裾野を大きく広げた量産ムーブメント。',
    cardStatus: 'MILESTONE',
    href: '#1950s',
    hrefKind: 'hash',
    featured: true
  },
  {
    id: 'pierce-duofon',
    group: 'owner',
    era: '1950s',
    sort: 50,
    meta: 'PIERCE',
    name: 'PIERCE DUOFON',
    hook: '鳴らすか。控えめに知らせるか。',
    cardSummary: '2香箱とWECKER / SIGNALの切替を持つ実機。',
    cardStatus: "OWNER'S NOTE →",
    href: 'pierce-duofon/',
    hrefKind: 'site',
    featured: true
  },
  {
    id: 'cyma-time-o-vox',
    group: 'owner',
    era: '1950s',
    sort: 60,
    meta: 'CYMA',
    name: 'TIME-O-VOX',
    hook: '一つの香箱で、時刻とアラームを。',
    cardSummary: 'Cal.R.464を搭載する18K Chronomètre表記の実機を記録中。',
    cardStatus: "OWNER'S NOTE →",
    href: 'cyma-time-o-vox/',
    hrefKind: 'site',
    featured: true
  },
  {
    id: 'citizen-alarm',
    group: 'owner',
    era: '1950s',
    sort: 70,
    meta: 'CITIZEN',
    name: 'CITIZEN ALARM',
    hook: 'アラーム腕時計が、日本へ。',
    cardSummary: '1950年代末に現れる国産機械式アラームの実機。',
    cardStatus: "OWNER'S NOTE / NEXT",
    href: '#1950s',
    hrefKind: 'hash',
    featured: true
  },
  {
    id: 'parking-watch',
    group: 'research',
    era: '1950s',
    sort: 80,
    meta: '1957 / JLC PARKING PATENT',
    name: 'PARKING WATCH',
    hook: '駐車時間まで、腕が知らせる。',
    cardSummary: 'アラームを「起こす」以外の生活用途へ使う、気になる系譜。',
    cardStatus: 'RESEARCHING',
    href: '#1950s',
    hrefKind: 'hash',
    featured: true
  },
  {
    id: 'automatic-diver-travel',
    group: 'milestone',
    era: '1960s',
    sort: 90,
    meta: '1960s–70s',
    name: 'AUTOMATIC / DIVER / TRAVEL',
    href: '#1960s',
    hrefKind: 'hash',
    featured: false
  }
];

export const historyCatalogByGroup = {
  milestones: historyCatalog.filter((entry) => entry.group === 'milestone'),
  owners: historyCatalog.filter((entry) => entry.group === 'owner'),
  research: historyCatalog.filter((entry) => entry.group === 'research')
};
