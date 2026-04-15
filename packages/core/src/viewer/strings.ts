// UI strings for the embedded viewer. English is the default; Japanese mirrors
// yasai's original copy. Consumer config.branding.locale selects.

export interface Strings {
  // Header
  appTitleDefault: string;
  tabScreens: string;
  tabFeatures: string;
  searchPlaceholderTrigger: string;
  statsScreens: string; // "{n} screens"
  statsElements: string; // "{n} elements"
  // Sidebar
  homeLabel: string;
  // Dashboard
  generatedAt: string; // "Generated: {date}"
  screenCardCountSuffix: string; // "{n} elements"
  modCountSuffix: string; // "{n} screens"
  // Screen view
  breadcrumbHome: string;
  metaRoutePrefix: string; // "📺"
  metaElementsPrefix: string; // "🏷️"
  noScreenshot: string;
  filterElementsPlaceholder: string;
  elFooter: (shown: number, total: number) => string;
  zoomHint: string;
  // Detail panel
  close: string;
  required: string;
  sectionBusinessRules: string;
  sectionValidation: string;
  sectionStateRule: string;
  sectionErrorMessages: string;
  sectionNotes: string;
  openModalLink: string; // "→ Open {title}"
  // Features tab
  featuresTitle: string;
  noFeatureData: string;
  // Search overlay
  searchInputPlaceholder: string;
  searchHint: string;
  searchEmpty: string; // "No results for \"{q}\""
  searchGroupScreens: string;
  searchGroupElements: string;
}

export const EN: Strings = {
  appTitleDefault: "Spec Viewer",
  tabScreens: "Screens",
  tabFeatures: "Features",
  searchPlaceholderTrigger: "Search...",
  statsScreens: "screens",
  statsElements: "elements",
  homeLabel: "All screens",
  generatedAt: "Generated",
  screenCardCountSuffix: "elements",
  modCountSuffix: "screens",
  breadcrumbHome: "All screens",
  metaRoutePrefix: "📺",
  metaElementsPrefix: "🏷️",
  noScreenshot: "No screenshot captured",
  filterElementsPlaceholder: "Filter elements...",
  elFooter: (shown, total) => `${shown} / ${total} elements`,
  zoomHint: "Drag to pan · Scroll to zoom",
  close: "Close",
  required: "Required",
  sectionBusinessRules: "Business rules",
  sectionValidation: "Validation",
  sectionStateRule: "State rule",
  sectionErrorMessages: "Error messages",
  sectionNotes: "Notes",
  openModalLink: "Open",
  featuresTitle: "Features",
  noFeatureData: "No feature data",
  searchInputPlaceholder: "Search screens, elements, features...",
  searchHint: "Type to search screens, element labels, and features",
  searchEmpty: "No results",
  searchGroupScreens: "Screens",
  searchGroupElements: "Elements",
};

export const JA: Strings = {
  appTitleDefault: "Spec Viewer",
  tabScreens: "画面仕様",
  tabFeatures: "機能一覧",
  searchPlaceholderTrigger: "検索...",
  statsScreens: "画面",
  statsElements: "要素",
  homeLabel: "全画面一覧",
  generatedAt: "最終生成",
  screenCardCountSuffix: "要素",
  modCountSuffix: "画面",
  breadcrumbHome: "画面一覧",
  metaRoutePrefix: "📺",
  metaElementsPrefix: "🏷️",
  noScreenshot: "スクリーンショットがありません",
  filterElementsPlaceholder: "要素を検索...",
  elFooter: (shown, total) => `${shown} / ${total} 要素`,
  zoomHint: "ドラッグで移動 / スクロールでズーム",
  close: "閉じる",
  required: "必須",
  sectionBusinessRules: "ビジネスルール",
  sectionValidation: "バリデーション",
  sectionStateRule: "ステート制約",
  sectionErrorMessages: "エラーメッセージ",
  sectionNotes: "備考",
  openModalLink: "開く",
  featuresTitle: "機能一覧",
  noFeatureData: "機能データがありません",
  searchInputPlaceholder: "画面名、要素名、機能名で検索...",
  searchHint: "画面名、要素ラベル、機能名で検索できます",
  searchEmpty: "一致する結果がありません",
  searchGroupScreens: "画面",
  searchGroupElements: "要素",
};

export function stringsFor(locale: "en" | "ja" | undefined): Strings {
  return locale === "ja" ? JA : EN;
}
