// Embedded viewer: HTML shell + CSS + JS. Ported from yasai's build-html.ts.
// De-Matilda-ified: i18n via Strings, accent color from config, no hardcoded
// modal/feature maps. The client-side JS is a single string template — we keep
// it self-contained so the output is one standalone HTML file.

import type { ViewerData } from "../builder/data.js";
import type { Strings } from "./strings.js";

export interface RenderInput {
  title: string; // app/header title
  accent: string; // CSS --accent value
  locale: "en" | "ja";
  strings: Strings;
  data: ViewerData;
}

export function renderViewer(input: RenderInput): string {
  const { title, accent, locale, strings, data } = input;
  // JSON-escape data; replace EVERY `<` with `\u003c` so the embedded JSON
  // cannot open OR close a script tag. Same for `>` for symmetry (and for
  // future safety against `]]>` style breakouts in CDATA contexts).
  const safeJson = (v: unknown) =>
    JSON.stringify(v).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
  const dataJson = safeJson(data);
  // Stringify the i18n table the same way for in-browser use.
  const stringsJson = safeJson({
    homeLabel: strings.homeLabel,
    tabScreens: strings.tabScreens,
    tabFeatures: strings.tabFeatures,
    searchPlaceholderTrigger: strings.searchPlaceholderTrigger,
    statsScreens: strings.statsScreens,
    statsElements: strings.statsElements,
    generatedAt: strings.generatedAt,
    screenCardCountSuffix: strings.screenCardCountSuffix,
    modCountSuffix: strings.modCountSuffix,
    breadcrumbHome: strings.breadcrumbHome,
    metaRoutePrefix: strings.metaRoutePrefix,
    metaElementsPrefix: strings.metaElementsPrefix,
    noScreenshot: strings.noScreenshot,
    filterElementsPlaceholder: strings.filterElementsPlaceholder,
    zoomHint: strings.zoomHint,
    close: strings.close,
    required: strings.required,
    sectionBusinessRules: strings.sectionBusinessRules,
    sectionValidation: strings.sectionValidation,
    sectionStateRule: strings.sectionStateRule,
    sectionErrorMessages: strings.sectionErrorMessages,
    sectionNotes: strings.sectionNotes,
    openModalLink: strings.openModalLink,
    featuresTitle: strings.featuresTitle,
    noFeatureData: strings.noFeatureData,
    searchInputPlaceholder: strings.searchInputPlaceholder,
    searchHint: strings.searchHint,
    searchEmpty: strings.searchEmpty,
    searchGroupScreens: strings.searchGroupScreens,
    searchGroupElements: strings.searchGroupElements,
  });

  const titleEsc = escHtml(title);
  const headerStats =
    `${data.totalScreens} ${escHtml(strings.statsScreens)} · ` +
    `${data.totalElements} ${escHtml(strings.statsElements)}`;

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titleEsc}</title>
<style>${CSS.replace("__ACCENT__", escCss(accent))}</style>
</head>
<body>
<div class="app" id="app">
  <header class="header">
    <button onclick="toggleSidebar()" title="${escHtml(strings.homeLabel)}">☰</button>
    <h1>${titleEsc}</h1>
    <div class="header-tabs">
      <button class="header-tab active" onclick="showTab('screens')" id="tab-screens">${escHtml(strings.tabScreens)}</button>
      <button class="header-tab" onclick="showTab('features')" id="tab-features">${escHtml(strings.tabFeatures)}</button>
    </div>
    <button class="search-trigger" onclick="openSearch()">
      🔍 ${escHtml(strings.searchPlaceholderTrigger)}
      <kbd>⌘K</kbd>
    </button>
    <span class="header-stats">${headerStats}</span>
  </header>
  <div class="body">
    <nav class="sidebar" id="sidebar"></nav>
    <div class="main" id="main"></div>
  </div>
  <div class="search-overlay hidden" id="search-overlay" onclick="if(event.target===this)closeSearch()">
    <div class="search-box">
      <div class="search-input-row">
        <span>🔍</span>
        <input type="text" id="search-input" placeholder="${escHtml(strings.searchInputPlaceholder)}" oninput="onSearch(this.value)">
        <button onclick="closeSearch()">✕</button>
      </div>
      <div class="search-results" id="search-results">
        <div class="search-hint">${escHtml(strings.searchHint)}</div>
      </div>
    </div>
  </div>
</div>
<script>
const D = ${dataJson};
const S = ${stringsJson};
const LOCALE = ${JSON.stringify(locale)};
${JS}
</script>
</body>
</html>`;
}

// ---- Helpers ----
// HTML-escape; safe for both element text and quoted attribute values.
function escHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;"
  );
}
function escCss(s: string): string {
  // Strict allow-list for the accent token; reject anything funky.
  return /^#?[A-Za-z0-9_().,%\s-]+$/.test(s) ? s : "#3b82f6";
}

// ---- CSS (lifted verbatim from yasai with __ACCENT__ token) ----
const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#f8fafc;--bg2:#fff;--bg3:#f1f5f9;--border:#e2e8f0;
  --text:#0f172a;--text2:#475569;--text3:#94a3b8;
  --accent:__ACCENT__;--accent-light:#dcfce7;--accent-dark:#166534;
  --red:#ef4444;--yellow:#eab308;--blue:#3b82f6;--orange:#f97316;--purple:#a855f7;
}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;background:var(--bg);color:var(--text);line-height:1.5;overflow:hidden;height:100vh}
a{color:var(--accent);text-decoration:none}
button{cursor:pointer;border:none;background:none;font:inherit;color:inherit}
input{font:inherit}
.app{display:flex;flex-direction:column;height:100vh}
.header{height:52px;display:flex;align-items:center;padding:0 16px;background:var(--bg2);border-bottom:1px solid var(--border);gap:12px;flex-shrink:0}
.header h1{font-size:16px;font-weight:700;color:var(--accent-dark);white-space:nowrap}
.header-stats{font-size:11px;color:var(--text3);white-space:nowrap;margin-left:auto}
.body{display:flex;flex:1;overflow:hidden}
.search-trigger{display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text3);font-size:13px;flex:1;max-width:360px;cursor:pointer}
.search-trigger:hover{border-color:#94a3b8}
.search-trigger kbd{margin-left:auto;font-size:10px;padding:2px 6px;border-radius:4px;background:var(--border);font-family:monospace}
.sidebar{width:256px;border-right:1px solid var(--border);background:var(--bg2);overflow-y:auto;flex-shrink:0}
.sidebar-home{display:flex;align-items:center;gap:8px;padding:10px 16px;font-size:13px;font-weight:600;color:var(--text2);cursor:pointer;border-bottom:1px solid var(--border)}
.sidebar-home:hover{background:var(--bg3)}
.sidebar-home.active{color:var(--accent-dark);background:var(--accent-light)}
.mod-header{display:flex;align-items:center;gap:6px;padding:8px 16px;font-size:13px;font-weight:600;color:var(--text);cursor:pointer;user-select:none}
.mod-header:hover{background:var(--bg3)}
.mod-header .count{margin-left:auto;font-size:11px;color:var(--text3);font-weight:400}
.mod-header .arrow{font-size:10px;color:var(--text3);transition:transform .15s}
.mod-header.open .arrow{transform:rotate(90deg)}
.mod-screens{border-left:2px solid var(--border);margin-left:24px}
.screen-link{display:block;padding:5px 12px;font-size:12px;color:var(--text2);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.screen-link:hover{background:var(--bg3);color:var(--text)}
.screen-link.active{background:var(--accent-light);color:var(--accent-dark);font-weight:600}
.domain-header{display:flex;align-items:center;gap:5px;padding:6px 8px;font-size:11px;font-weight:600;color:var(--text2);cursor:pointer;user-select:none}
.domain-header:hover{background:var(--bg3)}
.domain-header .arrow{font-size:9px;color:var(--text3);transition:transform .15s}
.domain-header.open .arrow{transform:rotate(90deg)}
.domain-header .count{margin-left:auto;font-size:10px;color:var(--text3);font-weight:400}
.domain-screens{margin-left:8px}
.main{flex:1;overflow:auto;min-height:0}
.dashboard{padding:20px 24px;max-width:1200px;margin:0 auto}
.dash-module{margin-bottom:8px;border:1px solid var(--border);border-radius:10px;background:var(--bg2);overflow:hidden}
.dash-module-header{display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;user-select:none;font-size:14px;font-weight:600}
.dash-module-header:hover{background:var(--bg3)}
.dash-module-header .arrow{font-size:10px;color:var(--text3);transition:transform .15s}
.dash-module-header.open .arrow{transform:rotate(90deg)}
.dash-module-header .mod-count{margin-left:auto;font-size:11px;color:var(--text3);font-weight:400}
.dash-screen-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;padding:8px 16px 16px}
.dash-screen-card{background:var(--bg);border:1px solid var(--border);border-radius:8px;overflow:hidden;cursor:pointer;transition:box-shadow .15s,border-color .15s}
.dash-screen-card:hover{box-shadow:0 2px 8px rgba(0,0,0,.06);border-color:var(--accent)}
.dash-screen-thumb{height:90px;overflow:hidden;background:var(--bg3)}
.dash-screen-thumb img{width:100%;height:100%;object-fit:cover;object-position:top;opacity:.75;transition:opacity .15s}
.dash-screen-card:hover .dash-screen-thumb img{opacity:1}
.dash-screen-info{padding:8px 10px}
.dash-screen-info h4{font-size:12px;font-weight:600;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dash-screen-info .card-meta{font-size:11px;color:var(--text3)}
.dash-domain-header{grid-column:1/-1;font-size:12px;font-weight:600;color:var(--text2);padding:8px 0 2px;border-bottom:1px solid var(--border);margin-top:4px}
.dash-domain-header:first-child{margin-top:0}
.cov{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}
.cov-full{background:#dcfce7;color:#166534}
.cov-mid{background:#fef9c3;color:#854d0e}
.cov-low{background:#fee2e2;color:#991b1b}
.screen-view{display:flex;flex-direction:column;height:100%;min-height:0}
.screen-header{padding:16px 20px;background:var(--bg2);border-bottom:1px solid var(--border);flex-shrink:0}
.screen-breadcrumb{font-size:12px;color:var(--text3);margin-bottom:6px}
.screen-breadcrumb a{color:var(--text3);cursor:pointer}
.screen-breadcrumb a:hover{color:var(--accent)}
.screen-title-row{display:flex;align-items:center;justify-content:space-between}
.screen-title-row h2{font-size:20px;font-weight:700}
.screen-meta{display:flex;gap:12px;font-size:12px;color:var(--text2)}
.screen-panels{display:flex;flex:1;overflow:hidden;min-height:0}
.panel-img{flex:1;overflow:hidden;background:var(--bg3);display:flex;flex-direction:column;min-width:0;position:relative}
.img-toolbar{display:flex;align-items:center;gap:8px;padding:6px 12px;background:var(--bg);border-bottom:1px solid var(--border);flex-shrink:0;font-size:12px;color:var(--text3)}
.img-toolbar button{padding:4px 8px;border-radius:4px;font-size:12px}
.img-toolbar button:hover{background:var(--border)}
.img-container{flex:1;overflow:hidden;cursor:grab;position:relative}
.img-container:active{cursor:grabbing}
.img-inner{transform-origin:top left;position:absolute;top:0;left:0}
.img-inner.smooth{transition:transform .25s ease}
.img-inner img{display:block;user-select:none;-webkit-user-drag:none}
.img-badge{position:absolute;width:24px;height:24px;border-radius:50%;background:#F87171;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;pointer-events:auto;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,.3);z-index:2;transition:transform .15s,box-shadow .15s}
.img-badge:hover,.img-badge.highlight{transform:scale(1.3);box-shadow:0 0 0 3px var(--accent),0 2px 8px rgba(0,0,0,.4)}
.img-badge.selected{background:var(--accent);transform:scale(1.3);box-shadow:0 0 0 3px var(--accent),0 2px 8px rgba(0,0,0,.4)}
.panel-elements{width:360px;flex-shrink:0;display:flex;flex-direction:column;background:var(--bg2);border-left:1px solid var(--border)}
.el-filter{padding:8px 12px;border-bottom:1px solid var(--border);flex-shrink:0}
.el-filter input{width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--bg3);outline:none}
.el-filter input:focus{border-color:var(--accent)}
.el-list{flex:1;overflow-y:auto}
.el-row{display:flex;gap:10px;padding:10px 12px;border-bottom:1px solid var(--bg3);transition:background .15s;cursor:pointer}
.el-row:hover,.el-row.highlight{background:var(--accent-light)}
.el-row.selected{background:var(--accent-light);border-left:3px solid var(--accent)}
.el-badge{width:24px;height:24px;border-radius:50%;background:var(--red);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
.el-info{min-width:0;flex:1}
.el-label{font-size:13px;font-weight:500}
.el-desc{font-size:11px;color:var(--text2);margin-top:2px}
.el-selector{font-size:10px;color:var(--text3);font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.el-footer{padding:6px 12px;border-top:1px solid var(--border);font-size:11px;color:var(--text3);flex-shrink:0;background:var(--bg3)}
.detail-panel{position:absolute;bottom:0;left:0;right:0;z-index:10;background:var(--bg2);height:0;overflow:hidden;display:flex;flex-direction:column;transition:height .2s ease;box-shadow:0 -2px 8px rgba(0,0,0,.15);border-top:1px solid var(--border)}
.detail-panel.open{overflow:hidden}
.detail-panel.dragging{transition:none}
.detail-drag{height:6px;cursor:ns-resize;background:var(--border);flex-shrink:0;position:relative}
.detail-drag::after{content:'';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:32px;height:3px;border-radius:2px;background:var(--text3);opacity:.5}
.detail-drag:hover::after{opacity:1}
.detail-header{display:flex;align-items:center;justify-content:space-between;padding:8px 16px;border-bottom:1px solid var(--border);flex-shrink:0}
.detail-header h3{font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px;margin:0}
.detail-close{background:none;border:none;font-size:18px;cursor:pointer;color:var(--text3);padding:2px 6px;border-radius:4px}
.detail-close:hover{color:var(--text);background:var(--bg3)}
.detail-body{padding:12px 16px;font-size:12px;line-height:1.7;overflow-y:auto;flex:1;min-height:0}
.detail-meta{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
.detail-tag{padding:2px 8px;border-radius:4px;font-size:11px;background:var(--bg3);color:var(--text2)}
.detail-tag.required{background:#fee2e2;color:#991b1b}
.detail-section{margin-top:10px}
.detail-section-title{font-size:11px;font-weight:600;color:var(--text3);margin-bottom:4px}
.detail-rules{margin:0;padding-left:18px}
.detail-rules li{margin-bottom:2px}
.detail-selector{font-family:monospace;font-size:11px;color:var(--text3);background:var(--bg3);padding:4px 8px;border-radius:4px;word-break:break-all;margin-top:6px}
.search-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100;display:flex;align-items:flex-start;justify-content:center;padding-top:15vh}
.search-box{width:100%;max-width:500px;background:var(--bg2);border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.2);border:1px solid var(--border);overflow:hidden}
.search-input-row{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--border)}
.search-input-row input{flex:1;border:none;outline:none;font-size:14px;background:transparent}
.search-results{max-height:320px;overflow-y:auto}
.search-group-title{padding:6px 16px;font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;background:var(--bg3);letter-spacing:.5px}
.search-result{display:flex;align-items:center;gap:10px;padding:8px 16px;cursor:pointer}
.search-result:hover{background:var(--bg3)}
.search-result .sr-icon{font-size:12px;flex-shrink:0}
.search-result .sr-title{font-size:13px;flex:1;min-width:0}
.search-result .sr-title span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.search-result .sr-sub{font-size:11px;color:var(--text3)}
.search-empty{padding:24px;text-align:center;color:var(--text3);font-size:13px}
.search-hint{padding:16px;text-align:center;font-size:12px;color:var(--text3)}
.hidden{display:none!important}
.features-section{padding:24px;max-width:1200px;margin:0 auto}
.feat-empty{padding:48px 24px;text-align:center;color:var(--text3)}
.el-modal-link{font-size:10px;color:var(--accent);cursor:pointer;margin-left:6px;padding:1px 6px;border-radius:3px;background:var(--accent-light);white-space:nowrap}
.el-modal-link:hover{text-decoration:underline}
.detail-modal-link{display:block;padding:6px 12px;margin-bottom:8px;border-radius:6px;background:var(--accent-light);color:var(--accent-dark);font-size:12px;font-weight:500;cursor:pointer;transition:background .15s}
.detail-modal-link:hover{background:#bbf7d0}
.header-tabs{display:flex;gap:2px;margin-left:16px}
.header-tab{padding:6px 14px;font-size:12px;font-weight:500;border-radius:6px;color:var(--text2)}
.header-tab:hover{background:var(--bg3)}
.header-tab.active{background:var(--accent-light);color:var(--accent-dark);font-weight:600}
@media(max-width:768px){
  .sidebar{display:none}
  .panel-elements{width:280px}
  .dash-screen-grid{grid-template-columns:repeat(auto-fill,minmax(160px,1fr))}
}
`;

// ---- JS (ported from yasai with Japanese strings replaced via S object) ----
const JS = String.raw`
let currentView = 'dashboard';
let currentModuleId = null;
let currentScreenId = null;
let sidebarVisible = true;
let zoom = 1;
let baseScale = 1;
let panX = 0, panY = 0;
let isPanning = false, panStartX = 0, panStartY = 0;
let highlightedEl = null;
let selectedEl = null;
let resizeObs = null;
let detailNaturalH = 0;

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar();
  renderDashboard();
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
    if (e.key === 'Escape') { closeSearch(); closeDetail(); }
  });
});

function renderSidebar() {
  const sb = document.getElementById('sidebar');
  let html = '<div class="sidebar-home' + (currentView === 'dashboard' ? ' active' : '') + '" onclick="goHome()">📋 ' + escHtml(S.homeLabel) + '</div>';
  for (const mod of D.modules) {
    const isOpen = currentModuleId === mod.id;
    html += '<div class="mod-header' + (isOpen ? ' open' : '') + '" onclick="toggleModule(\'' + mod.id + '\')"><span class="arrow">▶</span>' + escHtml(mod.name) + '<span class="count">' + mod.screens.length + '</span></div>';
    html += '<div class="mod-screens' + (isOpen ? '' : ' hidden') + '" id="mod-' + mod.id + '">';
    const hasDomains = mod.domains && mod.domains.length > 1;
    if (hasDomains) {
      for (const dom of mod.domains) {
        const domContainsActive = dom.sids.includes(currentScreenId);
        const domOpen = domContainsActive;
        html += '<div class="domain-header' + (domOpen ? ' open' : '') + '" onclick="toggleDomain(\'' + mod.id + '_' + dom.id + '\')"><span class="arrow">▶</span>' + escHtml(dom.name) + '<span class="count">' + dom.sids.length + '</span></div>';
        html += '<div class="domain-screens' + (domOpen ? '' : ' hidden') + '" id="dom-' + mod.id + '_' + dom.id + '">';
        for (const scId of dom.sids) {
          const sc = mod.screens.find(s => s.id === scId);
          if (!sc) continue;
          const active = currentScreenId === sc.id ? ' active' : '';
          html += '<div class="screen-link' + active + '" onclick="goScreen(\'' + mod.id + '\',\'' + sc.id + '\')">' + escHtml(sc.title) + '</div>';
        }
        html += '</div>';
      }
    } else {
      for (const sc of mod.screens) {
        const active = currentScreenId === sc.id ? ' active' : '';
        html += '<div class="screen-link' + active + '" onclick="goScreen(\'' + mod.id + '\',\'' + sc.id + '\')">' + escHtml(sc.title) + '</div>';
      }
    }
    html += '</div>';
  }
  sb.innerHTML = html;
}

function toggleModule(modId) {
  const el = document.getElementById('mod-' + modId);
  if (el) el.classList.toggle('hidden');
  document.querySelectorAll('.mod-header').forEach(h => {
    const m = D.modules.find(mm => mm.id === modId);
    if (m && h.textContent.includes(m.name)) h.classList.toggle('open');
  });
}

function toggleDomain(domKey) {
  const el = document.getElementById('dom-' + domKey);
  if (el) el.classList.toggle('hidden');
  if (el && el.previousElementSibling) el.previousElementSibling.classList.toggle('open');
}

function toggleSidebar() {
  sidebarVisible = !sidebarVisible;
  document.getElementById('sidebar').style.display = sidebarVisible ? '' : 'none';
}

function goHome() {
  currentView = 'dashboard'; currentModuleId = null; currentScreenId = null; selectedEl = null;
  renderDashboard(); renderSidebar();
  showTab('screens');
}
function goModule(modId) {
  currentView = 'dashboard'; currentModuleId = modId; currentScreenId = null;
  renderDashboard(); renderSidebar();
  const sec = document.getElementById('dash-mod-' + modId);
  if (sec) { sec.classList.remove('hidden'); sec.previousElementSibling && sec.previousElementSibling.classList.add('open'); sec.scrollIntoView({behavior:'smooth',block:'start'}); }
}
function goScreen(modId, scId) {
  currentView = 'screen'; currentModuleId = modId; currentScreenId = scId; selectedEl = null;
  renderScreenDetail(modId, scId); renderSidebar();
}
function showTab(tab) {
  document.getElementById('tab-screens').classList.toggle('active', tab === 'screens');
  document.getElementById('tab-features').classList.toggle('active', tab === 'features');
  if (tab === 'features') {
    currentView = 'features';
    renderFeatures();
  } else if (currentView === 'features') {
    goHome();
  }
}

function renderDashboard() {
  const main = document.getElementById('main');
  let html = '<div class="dashboard">';
  for (const mod of D.modules) {
    html += '<div class="dash-module">';
    html += '<div class="dash-module-header open" onclick="toggleDashModule(\'' + mod.id + '\')">';
    html += '<span class="arrow">▶</span>' + escHtml(mod.name);
    html += '<span class="mod-count">' + mod.screens.length + ' ' + escHtml(S.modCountSuffix) + '</span>';
    html += '</div>';
    html += '<div class="dash-screen-grid" id="dash-mod-' + mod.id + '">';
    const hasDomains = mod.domains && mod.domains.length > 1;
    if (hasDomains) {
      for (const dom of mod.domains) {
        html += '<div class="dash-domain-header">' + escHtml(dom.name) + '</div>';
        for (const scId of dom.sids) {
          const sc = mod.screens.find(s => s.id === scId);
          if (!sc) continue;
          html += renderDashCard(mod.id, sc);
        }
      }
    } else {
      for (const sc of mod.screens) html += renderDashCard(mod.id, sc);
    }
    html += '</div></div>';
  }
  const dt = new Date(D.generatedAt);
  const dtStr = LOCALE === 'ja' ? dt.toLocaleString('ja-JP') : dt.toLocaleString('en-US');
  html += '<div style="margin-top:16px;text-align:center;font-size:11px;color:var(--text3)">' + escHtml(S.generatedAt) + ': ' + escHtml(dtStr) + '</div>';
  html += '</div>';
  main.innerHTML = html;
  main.scrollTop = 0;
}

function renderDashCard(modId, sc) {
  let html = '<div class="dash-screen-card" onclick="goScreen(\'' + modId + '\',\'' + sc.id + '\')">';
  if (sc.img) html += '<div class="dash-screen-thumb"><img src="' + escHtml(sc.img) + '" alt="' + escHtml(sc.title) + '" loading="lazy"></div>';
  else html += '<div class="dash-screen-thumb"></div>';
  html += '<div class="dash-screen-info"><h4>' + escHtml(sc.title) + '</h4>';
  html += '<div class="card-meta">' + sc.el.length + ' ' + escHtml(S.screenCardCountSuffix) + '</div>';
  html += '</div></div>';
  return html;
}

function toggleDashModule(modId) {
  const grid = document.getElementById('dash-mod-' + modId);
  if (grid) grid.classList.toggle('hidden');
  const header = grid && grid.previousElementSibling;
  if (header) header.classList.toggle('open');
}

function renderScreenDetail(modId, scId) {
  const mod = D.modules.find(m => m.id === modId);
  const sc = mod && mod.screens.find(s => s.id === scId);
  if (!mod || !sc) return;
  const main = document.getElementById('main');
  let html = '<div class="screen-view">';
  html += '<div class="screen-header">';
  html += '<div class="screen-breadcrumb"><a onclick="goHome()">' + escHtml(S.breadcrumbHome) + '</a> / ' + escHtml(mod.name) + ' / ' + escHtml(sc.title) + '</div>';
  html += '<div class="screen-title-row"><h2>' + escHtml(sc.title) + '</h2>';
  html += '<div class="screen-meta"><span>' + S.metaRoutePrefix + ' ' + escHtml(sc.route) + '</span><span>' + S.metaElementsPrefix + ' ' + sc.el.length + ' ' + escHtml(S.statsElements) + '</span>';
  html += '</div></div>';
  html += '</div>';
  html += '<div class="screen-panels">';
  html += '<div class="panel-img">';
  html += '<div class="img-toolbar"><button onclick="zoomIn()">＋</button><button onclick="zoomOut()">ー</button><button onclick="resetZoom()">↺</button><span id="zoom-label">100%</span><span style="margin-left:auto">' + escHtml(S.zoomHint) + '</span></div>';
  html += '<div class="img-container" id="img-container">';
  if (sc.img) {
    html += '<div class="img-inner" id="img-inner">';
    html += '<img id="sc-img" src="' + escHtml(sc.img) + '" alt="' + escHtml(sc.title) + '" draggable="false">';
    for (const bel of sc.el) {
      if (bel.bx != null && bel.by != null) {
        html += '<div class="img-badge" data-num="' + bel.n + '" style="left:' + bel.bx + 'px;top:' + bel.by + 'px" onclick="event.stopPropagation();selectElFromBadge(\'' + bel.n + '\')">' + bel.n + '</div>';
      }
    }
    html += '</div>';
  } else {
    html += '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3)">' + escHtml(S.noScreenshot) + '</div>';
  }
  html += '</div>';
  html += '<div class="detail-panel" id="detail-panel"><div class="detail-drag" id="detail-drag"></div><div id="detail-content" style="display:flex;flex-direction:column;flex:1;min-height:0;overflow-y:auto"></div></div>';
  html += '</div>';
  html += '<div class="panel-elements">';
  html += '<div class="el-filter"><input type="text" placeholder="' + escHtml(S.filterElementsPlaceholder) + '" oninput="filterElements(this.value)"></div>';
  html += '<div class="el-list" id="el-list">';
  for (const el of sc.el) html += elRow(el);
  html += '</div>';
  html += '<div class="el-footer" id="el-footer">' + sc.el.length + ' / ' + sc.el.length + ' ' + escHtml(S.statsElements) + '</div>';
  html += '</div></div></div>';
  main.innerHTML = html;
  zoom = 1; panX = 0; panY = 0; baseScale = 1;
  if (resizeObs) { resizeObs.disconnect(); resizeObs = null; }
  const container = document.getElementById('img-container');
  const scImg = document.getElementById('sc-img');
  if (container) {
    container.addEventListener('wheel', e => { e.preventDefault(); zoom = Math.max(0.25, Math.min(4, zoom + (e.deltaY > 0 ? -0.1 : 0.1))); applyTransform(); }, {passive:false});
    container.addEventListener('mousedown', e => { isPanning = true; panStartX = e.clientX - panX; panStartY = e.clientY - panY; });
    container.addEventListener('mousemove', e => { if (isPanning) { panX = e.clientX - panStartX; panY = e.clientY - panStartY; applyTransform(); } });
    container.addEventListener('mouseup', () => isPanning = false);
    container.addEventListener('mouseleave', () => isPanning = false);
    resizeObs = new ResizeObserver(() => { fitImage(); });
    resizeObs.observe(container);
  }
  if (scImg) { if (scImg.complete) fitImage(); else scImg.addEventListener('load', fitImage); }
}

function elRow(el) {
  const sub = el.d ? '<div class="el-desc">' + escHtml(el.d) + '</div>' : '<div class="el-selector">' + escHtml(el.s) + '</div>';
  let modalLink = '';
  if (el.modal) {
    modalLink = '<span class="el-modal-link" onclick="event.stopPropagation();goScreen(\'' + el.modal.mod + '\',\'' + el.modal.sc + '\')" title="' + escHtml(el.modal.title) + '">→ ' + escHtml(el.modal.title) + '</span>';
  }
  return '<div class="el-row" data-num="' + el.n + '" onclick="toggleDetail(\'' + el.n + '\')" onmouseenter="highlightEl(\'' + el.n + '\',true)" onmouseleave="highlightEl(\'' + el.n + '\',false)"><span class="el-badge">' + el.n + '</span><div class="el-info"><div class="el-label">' + escHtml(el.l) + modalLink + '</div>' + sub + '</div></div>';
}

function escHtml(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

function filterElements(q) {
  const mod = D.modules.find(m => m.id === currentModuleId);
  const sc = mod && mod.screens.find(s => s.id === currentScreenId);
  if (!sc) return;
  const filtered = q ? sc.el.filter(el => el.l.toLowerCase().includes(q.toLowerCase())) : sc.el;
  document.getElementById('el-list').innerHTML = filtered.map(elRow).join('');
  document.getElementById('el-footer').textContent = filtered.length + ' / ' + sc.el.length + ' ' + S.statsElements;
}

function highlightEl(num, on) {
  highlightedEl = on ? num : null;
  document.querySelectorAll('.el-row').forEach(r => r.classList.toggle('highlight', r.dataset.num === num && on));
  document.querySelectorAll('.img-badge').forEach(b => b.classList.toggle('highlight', b.dataset.num === num && on));
}
function selectElFromBadge(num) {
  toggleDetail(num);
  const row = document.querySelector('.el-row[data-num="' + num + '"]');
  if (row) row.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function syncBadgeSelection() {
  document.querySelectorAll('.img-badge').forEach(b => b.classList.toggle('selected', b.dataset.num === selectedEl));
}

function toggleDetail(num) {
  const panel = document.getElementById('detail-panel');
  if (!panel) return;
  if (selectedEl === num) { closeDetail(); }
  else {
    const wasOpen = panel.classList.contains('open');
    const prevH = panel.offsetHeight;
    selectedEl = num;
    renderDetailContent(num);
    const content = document.getElementById('detail-content');
    panel.style.height = 'auto';
    panel.classList.add('open');
    const natural = (content ? content.scrollHeight : panel.scrollHeight) + 6;
    detailNaturalH = natural;
    const maxH = Math.floor(window.innerHeight * 0.7);
    const h = Math.min(natural, maxH);
    panel.style.height = (wasOpen ? prevH : 0) + 'px';
    panel.offsetHeight;
    panel.style.height = h + 'px';
    initDetailDrag();
  }
  document.querySelectorAll('.el-row').forEach(r => r.classList.toggle('selected', r.dataset.num === selectedEl));
  syncBadgeSelection();
}
function closeDetail() {
  selectedEl = null;
  const panel = document.getElementById('detail-panel');
  if (panel) { panel.classList.remove('open'); panel.style.height = '0'; }
  document.querySelectorAll('.el-row.selected').forEach(r => r.classList.remove('selected'));
  syncBadgeSelection();
}
function initDetailDrag() {
  const drag = document.getElementById('detail-drag');
  const panel = document.getElementById('detail-panel');
  if (!drag || !panel || drag._bound) return;
  drag._bound = true;
  drag.addEventListener('mousedown', function(e) {
    e.preventDefault();
    const startY = e.clientY;
    const startH = panel.offsetHeight;
    panel.classList.add('dragging');
    function onMove(ev) {
      const delta = startY - ev.clientY;
      const cap = Math.min(detailNaturalH, Math.floor(window.innerHeight * 0.7));
      panel.style.height = Math.max(80, Math.min(startH + delta, cap)) + 'px';
    }
    function onUp() {
      panel.classList.remove('dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

function renderDetailContent(num) {
  const mod = D.modules.find(m => m.id === currentModuleId);
  const sc = mod && mod.screens.find(s => s.id === currentScreenId);
  if (!sc) return;
  const el = sc.el.find(e => e.n === num);
  if (!el) return;
  const target = document.getElementById('detail-content');
  let html = '<div class="detail-header">';
  html += '<h3><span class="el-badge">' + el.n + '</span>' + escHtml(el.l) + '</h3>';
  html += '<button class="detail-close" onclick="closeDetail()" title="' + escHtml(S.close) + '">&times;</button>';
  html += '</div><div class="detail-body">';
  if (el.modal) html += '<div class="detail-modal-link" onclick="goScreen(\'' + el.modal.mod + '\',\'' + el.modal.sc + '\')">→ ' + escHtml(S.openModalLink) + ' ' + escHtml(el.modal.title) + '</div>';
  if (el.d) html += '<div style="margin-bottom:8px;color:var(--text)">' + escHtml(el.d) + '</div>';
  const dt = el.dt;
  if (dt) {
    html += '<div class="detail-meta">';
    if (dt.type) html += '<span class="detail-tag">' + escHtml(dt.type) + '</span>';
    if (dt.required) html += '<span class="detail-tag required">' + escHtml(S.required) + '</span>';
    if (dt.displayCondition) html += '<span class="detail-tag">' + escHtml(dt.displayCondition) + '</span>';
    html += '</div>';
    if (dt.businessRules && dt.businessRules.length > 0) {
      html += '<div class="detail-section"><div class="detail-section-title">' + escHtml(S.sectionBusinessRules) + '</div><ul class="detail-rules">';
      for (const rule of dt.businessRules) html += '<li>' + escHtml(rule) + '</li>';
      html += '</ul></div>';
    }
    if (dt.validation) html += '<div class="detail-section"><div class="detail-section-title">' + escHtml(S.sectionValidation) + '</div><div>' + escHtml(dt.validation) + '</div></div>';
    if (dt.stateRule) html += '<div class="detail-section"><div class="detail-section-title">' + escHtml(S.sectionStateRule) + '</div><div>' + escHtml(dt.stateRule) + '</div></div>';
    if (dt.errorMessages && dt.errorMessages.length > 0) {
      html += '<div class="detail-section"><div class="detail-section-title">' + escHtml(S.sectionErrorMessages) + '</div><ul class="detail-rules">';
      for (const msg of dt.errorMessages) html += '<li>' + escHtml(msg) + '</li>';
      html += '</ul></div>';
    }
    if (dt.notes) html += '<div class="detail-section"><div class="detail-section-title">' + escHtml(S.sectionNotes) + '</div><div>' + escHtml(dt.notes) + '</div></div>';
  }
  html += '<div class="detail-selector">' + escHtml(el.s) + '</div></div>';
  target.innerHTML = html;
}

function applyTransform() {
  const inner = document.getElementById('img-inner');
  const s = baseScale * zoom;
  if (inner) inner.style.transform = 'translate(' + panX + 'px,' + panY + 'px) scale(' + s + ')';
  const label = document.getElementById('zoom-label');
  if (label) label.textContent = Math.round(zoom*100) + '%';
}
function fitImage() {
  const img = document.getElementById('sc-img');
  const container = document.getElementById('img-container');
  if (!img || !container) return;
  const nw = img.naturalWidth || 1920;
  const nh = img.naturalHeight || 1080;
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  baseScale = Math.min(cw / nw, ch / nh, 1);
  if (zoom === 1) { panX = (cw - nw * baseScale) / 2; panY = 0; }
  applyTransform();
}
function zoomIn() { zoom = Math.min(4, zoom + 0.25); applyTransform(); }
function zoomOut() { zoom = Math.max(0.25, zoom - 0.25); applyTransform(); }
function resetZoom() { zoom = 1; fitImage(); }

function renderFeatures() {
  const main = document.getElementById('main');
  if (!D.features || D.features.length === 0) {
    main.innerHTML = '<div class="features-section"><div class="feat-empty">' + escHtml(S.noFeatureData) + '</div></div>';
    return;
  }
  // v0.2: full features UI lands here.
  main.innerHTML = '<div class="features-section"><div class="feat-empty">' + escHtml(S.noFeatureData) + '</div></div>';
}

function openSearch() {
  document.getElementById('search-overlay').classList.remove('hidden');
  const input = document.getElementById('search-input');
  input.value = '';
  input.focus();
  document.getElementById('search-results').innerHTML = '<div class="search-hint">' + escHtml(S.searchHint) + '</div>';
}
function closeSearch() { document.getElementById('search-overlay').classList.add('hidden'); }
function onSearch(q) {
  const container = document.getElementById('search-results');
  if (!q.trim()) { container.innerHTML = '<div class="search-hint">' + escHtml(S.searchHint) + '</div>'; return; }
  const ql = q.toLowerCase();
  const screens = [];
  const elements = [];
  for (const mod of D.modules) {
    for (const sc of mod.screens) {
      if (sc.title.toLowerCase().includes(ql) || sc.route.toLowerCase().includes(ql)) {
        screens.push({ title: sc.title, sub: mod.name + ' — ' + sc.route, modId: mod.id, scId: sc.id });
      }
      for (const el of sc.el) {
        if (el.l.toLowerCase().includes(ql)) {
          elements.push({ title: el.l, sub: sc.title + ' #' + el.n, modId: mod.id, scId: sc.id });
        }
      }
    }
  }
  let html = '';
  if (screens.length === 0 && elements.length === 0) html = '<div class="search-empty">' + escHtml(S.searchEmpty) + ' "' + escHtml(q) + '"</div>';
  if (screens.length > 0) {
    html += '<div class="search-group-title">' + escHtml(S.searchGroupScreens) + ' (' + screens.length + ')</div>';
    for (const r of screens.slice(0,10)) html += '<div class="search-result" onclick="goScreen(\'' + r.modId + '\',\'' + r.scId + '\');closeSearch()"><span class="sr-icon" style="color:var(--blue)">📺</span><div class="sr-title"><span>' + escHtml(r.title) + '</span><span class="sr-sub">' + escHtml(r.sub) + '</span></div></div>';
  }
  if (elements.length > 0) {
    html += '<div class="search-group-title">' + escHtml(S.searchGroupElements) + ' (' + elements.length + ')</div>';
    for (const r of elements.slice(0,15)) html += '<div class="search-result" onclick="goScreen(\'' + r.modId + '\',\'' + r.scId + '\');closeSearch()"><span class="sr-icon" style="color:var(--orange)">🏷️</span><div class="sr-title"><span>' + escHtml(r.title) + '</span><span class="sr-sub">' + escHtml(r.sub) + '</span></div></div>';
  }
  container.innerHTML = html;
}
`;
