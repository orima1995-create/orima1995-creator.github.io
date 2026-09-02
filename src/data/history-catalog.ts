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

export const historyCatalog: HistoryCatalogEntry[] = [
  {
    id: 'eterna-1914',
    group: 'milestone',
    era: '1910s',
    sort: 10,
    meta: '1914 / ETERNA',
    name: 'ETERNA ALARM / CAL.68',
    hook: '最初のシリーズ生産アラーム腕時計。',
    cardSummary: '約13リーニュ、1香箱。ハンマーが底部のベルを叩く。',
    cardStatus: 'MILESTONE',
    featured: true
  },
  {
    id: 'vulcain-cricket',
    group: 'milestone',
    era: '1940s',
    sort: 20,
    meta: '1947 / VULCAIN',
    name: 'CRICKET',
    hook: "THE PRESIDENTS' WATCH",
    cardSummary: '二重底で音量と防水性を両立。米大統領たちとの縁でも知られる。',
    cardStatus: 'MILESTONE',
    featured: true
  },
  {
    id: 'basis-bfg90',
    group: 'owner',
    era: '1940s',
    sort: 30,
    meta: 'BASIS / BFG 90',
    name: 'BASIS ALARM',
    hook: '2香箱と、2つの巻上げ表示窓。',
    cardSummary: 'BFG 90を搭載する所有個体。',
    cardStatus: "OWNER'S NOTE",
    featured: true
  },
  {
    id: 'as1475',
    group: 'milestone',
    era: '1950s',
    sort: 40,
    meta: '1954 / A. SCHILD',
    name: 'AS 1475',
    hook: '最も多く使われたアラーム・キャリバー。',
    cardSummary: '1954–70年に約78万個を生産。派生系まで含めると約140万個。',
    cardStatus: 'MILESTONE',
    featured: true
  },
  {
    id: 'memovox-automatic',
    group: 'milestone',
    era: '1950s',
    sort: 50,
    meta: '1956 / JAEGER-LECOULTRE',
    name: 'MEMOVOX AUTOMATIC / CAL.815',
    hook: '世界初の自動巻きアラーム腕時計。',
    cardSummary: '時計側を自動巻き化。アラーム用ゼンマイは手巻き。',
    cardStatus: 'MILESTONE',
    featured: true
  },
  {
    id: 'vulcain-golden-voice',
    group: 'milestone',
    era: '1950s',
    sort: 55,
    meta: '1958 / VULCAIN',
    name: 'GOLDEN VOICE / CAL.406',
    hook: '世界初の女性用アラーム腕時計。',
    cardSummary: '19.7mmの2香箱ムーブメントと金製メンブレン。',
    cardStatus: 'MILESTONE',
    featured: true
  },
  {
    id: 'jlc-parking',
    group: 'milestone',
    era: '1950s',
    sort: 58,
    meta: '1958 / JAEGER-LECOULTRE',
    name: 'MEMOVOX PARKING',
    hook: '駐車時間を知らせる最初のアラーム腕時計。',
    cardSummary: '内側のディスクに駐車時間用の目盛りを加えたMemovox。',
    cardStatus: 'MILESTONE',
    featured: true
  },
  {
    id: 'wittnauer-10wa',
    group: 'owner',
    era: '1950s',
    sort: 59,
    meta: 'WITTNAUER / 10WA',
    name: 'WITTNAUER ALARM',
    hook: 'CAL.10WA',
    cardSummary: 'Longines系手巻きムーブメントに独自のアラームモジュールを追加。',
    cardStatus: "OWNER'S NOTE",
    featured: true
  },
  {
    id: 'pierce-duofon',
    group: 'owner',
    era: '1950s',
    sort: 60,
    meta: 'PIERCE',
    name: 'PIERCE DUOFON',
    hook: '量産唯一の音量調節機構',
    cardSummary: 'WECKER / SIGNALを選べるCal.135を、実機と資料から追う。',
    cardStatus: "OWNER'S NOTE →",
    featured: true,
    href: 'pierce-duofon/',
    hrefKind: 'site'
  },
  {
    id: 'cyma-time-o-vox',
    group: 'owner',
    era: '1950s',
    sort: 70,
    meta: 'CYMA',
    name: 'TIME-O-VOX',
    hook: 'アラーム×クロノメーターという矛盾',
    cardSummary: 'Cal.R.464を搭載する18K Chronomètre表記の実機。',
    cardStatus: "OWNER'S NOTE →",
    featured: true,
    href: 'cyma-time-o-vox/',
    hrefKind: 'site'
  },
  {
    id: 'citizen-alarm',
    group: 'owner',
    era: '1950s',
    sort: 80,
    meta: '1958 / CITIZEN',
    name: 'CITIZEN ALARM',
    hook: '国産初のアラーム',
    cardSummary: 'まことしやかに囁かれる伝説',
    cardStatus: "OWNER'S NOTE",
    featured: true
  },
  {
    id: 'vulcain-cricket-nautical',
    group: 'milestone',
    era: '1960s',
    sort: 100,
    meta: '1961 / VULCAIN',
    name: 'CRICKET NAUTICAL',
    hook: '水中で聞こえるアラームを、ダイバーズへ。',
    cardSummary: '減圧表を備え、Hannes Kellerの潜水でも使用された。',
    cardStatus: 'MILESTONE',
    featured: true
  },
  {
    id: 'seiko-bell-matic',
    group: 'milestone',
    era: '1960s',
    sort: 105,
    meta: '約1968 / SEIKO',
    name: 'BELL-MATIC / CAL.4005・4006',
    hook: '日本独自開発の自動巻きアラーム。',
    cardSummary: '時計側は自動巻き、アラーム用ゼンマイは手巻き。',
    cardStatus: 'MILESTONE',
    featured: true
  },
  {
    id: 'omega-memomatic',
    group: 'milestone',
    era: '1960s',
    sort: 110,
    meta: '1969 / OMEGA',
    name: 'MEMOMATIC / CAL.980',
    hook: 'アラームの動力まで自動巻き。',
    cardSummary: '1香箱で時刻とアラームを駆動し、分単位でアラーム時刻を設定できる。',
    cardStatus: 'MILESTONE',
    featured: true
  },
  {
    id: 'as5007-5008',
    group: 'milestone',
    era: 'electronic',
    sort: 115,
    meta: '1971–73 / A. SCHILD',
    name: 'AS 5007 / 5008',
    hook: '2香箱の両方をローターで自動巻き。',
    cardSummary: '5007 / 5008では、時計用とアラーム用の双方をローターで巻き上げる。',
    cardStatus: 'MILESTONE',
    featured: true
  },
  {
    id: 'citizen-criston-lc-alarm',
    group: 'milestone',
    era: 'electronic',
    sort: 120,
    meta: '1976 / CITIZEN',
    name: 'CRISTON LC ALARM',
    hook: '世界初のデジタル式アラーム機能付き腕時計。',
    cardSummary: '水晶発振・液晶表示。圧電素子とチタン振動板でアラームを鳴らす。',
    cardStatus: 'MILESTONE',
    featured: true
  }
];

export const historyCatalogByGroup = {
  milestones: historyCatalog.filter((entry) => entry.group === 'milestone').sort((a, b) => a.sort - b.sort),
  owners: historyCatalog.filter((entry) => entry.group === 'owner').sort((a, b) => a.sort - b.sort),
  research: historyCatalog.filter((entry) => entry.group === 'research').sort((a, b) => a.sort - b.sort)
};
