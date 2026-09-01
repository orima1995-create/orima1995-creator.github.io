export type HistoryCatalogGroup = 'milestone' | 'owner' | 'research';

export interface HistoryCatalogEntry {
  id: string;
  group: HistoryCatalogGroup;
  era: '1910s' | '1940s' | '1950s' | '1960s';
  sort: number;
  meta: string;
  name: string;
  hook: string;
  summary: string;
  status: string;
  href: string;
  featured: boolean;
}

/**
 * HISTORY のカード／INDEXで共有する時計・テーマのマスターデータ。
 *
 * Step 1A では既存表示へ接続しない。
 * まず「同じ事実を複数箇所へ手入力しない」ための単一ソースを用意し、
 * Step 1B で現行HTMLと出力一致を確認しながら段階的に置き換える。
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
    summary: '最初期の量産アラーム腕時計。',
    status: 'MILESTONE',
    href: '#1910s',
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
    summary: '装着時の音響を大きく前進させた代表的なアラーム腕時計。',
    status: 'MILESTONE',
    href: '#1940s',
    featured: true
  },
  {
    id: 'basis-alarm-bfg90',
    group: 'owner',
    era: '1940s',
    sort: 25,
    meta: '1948 / BASIS',
    name: 'BASIS ALARM / BFG 90',
    hook: '安価な構成でも、腕から知らせる。',
    summary: '実用と量産性を優先した機械式アラームの実機。',
    status: "OWNER'S NOTE / NEXT",
    href: '#1940s',
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
    summary: '時刻用とアラーム用に独立した2つの香箱を持つ、代表的な二香箱構成。',
    status: 'MILESTONE',
    href: '#1950s',
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
    summary: '多数のブランドへ広がり、アラーム腕時計の裾野を大きく広げた量産ムーブメント。',
    status: 'MILESTONE',
    href: '#1950s',
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
    summary: '2香箱とWECKER / SIGNALの切替を持つ実機。',
    status: "OWNER'S NOTE →",
    href: '/pierce-duofon/',
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
    summary: 'Cal.R.464を搭載する18K Chronomètre表記の実機を記録中。',
    status: "OWNER'S NOTE / NEXT",
    href: '#1950s',
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
    summary: '1950年代末に現れる国産機械式アラームの実機。',
    status: "OWNER'S NOTE / NEXT",
    href: '#1950s',
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
    summary: 'アラームを「起こす」以外の生活用途へ使う、気になる系譜。',
    status: 'RESEARCHING →',
    href: '#1950s',
    featured: true
  }
];

export const historyCatalogByGroup = {
  milestones: historyCatalog.filter((entry) => entry.group === 'milestone'),
  owners: historyCatalog.filter((entry) => entry.group === 'owner'),
  research: historyCatalog.filter((entry) => entry.group === 'research')
};
