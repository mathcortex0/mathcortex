/* ═══════════════════════════════════════════════════════════════
   ALAMIN NETWORK v3 — main.js
   Architecture: All article content lives inside category JSONs.
   report.html?id=n001&cat=national  → reads national.json, finds id
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ── HELPERS ──────────────────────────────────────────────────

const $ = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];

function qs(key) {
  return new URLSearchParams(window.location.search).get(key);
}

async function getJSON(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

function fmt(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function readTime(html) {
  const words = (html || '').replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200)) + ' min read';
}

function catColor(cat) {
  const c = (cat || '').toLowerCase();
  if (c === 'national') return 'national';
  if (c === 'sports')   return 'sports';
  return 'international';
}

function capFirst(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function articleURL(id, cat) {
  return `report.html?id=${id}&cat=${(cat || '').toLowerCase()}`;
}

// ── STATE ────────────────────────────────────────────────────

let _feedArticles = []; // homepage feed (index.json)

// ── INIT HELPERS ─────────────────────────────────────────────

function initDate() {
  const el = $('#live-date');
  if (el) el.textContent = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

function initEdition() {
  const h = new Date().getHours();
  const name = h < 12 ? 'Morning Edition' : h < 17 ? 'Afternoon Edition' : 'Evening Edition';
  const el = $('#edition-name');
  const el2 = $('#drawer-edition-name');
  if (el) el.textContent = name;
  if (el2) el2.textContent = name;
}

function initTheme() {
  if (localStorage.getItem('an-theme') === 'light') document.body.classList.add('light-mode');
}

function toggleTheme() {
  document.body.classList.toggle('light-mode');
  localStorage.setItem('an-theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
  const btn = $('#theme-btn');
  if (btn) btn.textContent = document.body.classList.contains('light-mode') ? '🌙' : '☀️';
}

function setActiveNav() {
  const cat  = qs('cat');
  const path = window.location.pathname;
  const isHome = path.endsWith('index.html') || path === '/' || path.endsWith('/');

  // Top nav links
  $$('.nav-link').forEach(l => {
    l.classList.remove('active');
    if (l.dataset.cat && l.dataset.cat === cat) l.classList.add('active');
    if (!l.dataset.cat && isHome) l.classList.add('active');
  });

  // Drawer links
  $$('.drawer-link').forEach(l => {
    l.classList.remove('active');
    if (l.dataset.cat && l.dataset.cat === cat) l.classList.add('active');
    if (l.dataset.page === 'home' && isHome) l.classList.add('active');
  });
}

// ── TICKER ───────────────────────────────────────────────────

function initTicker(data) {
  const el = $('#ticker-text');
  if (el && data) el.textContent = data.map((a, i) => `${i+1}. ${a.title}`).join('   ·   ');
}

// ── BREAKING BANNER ──────────────────────────────────────────

function initBreaking(data) {
  const banner = $('#breaking-banner');
  const inner  = $('#breaking-inner');
  if (!banner || !inner || !data) return;
  const items = data.filter(a => a.breaking);
  if (!items.length) return;
  banner.classList.add('visible');
  const text = items.map(a => '⚡ ' + a.title).join('   ·   ');
  inner.textContent = text + '   ·   ' + text;
}

// ── SEARCH ───────────────────────────────────────────────────

function openSearch() {
  const o = $('#search-overlay');
  if (o) { o.classList.add('open'); setTimeout(() => { const i = $('#search-input'); if (i) i.focus(); }, 50); }
}

function closeSearch() {
  const o = $('#search-overlay');
  if (o) o.classList.remove('open');
}

function runSearch(q) {
  const el = $('#search-results-overlay');
  if (!el) return;
  if (!q || q.length < 2) { el.innerHTML = ''; return; }
  const hits = _feedArticles.filter(a =>
    a.title.toLowerCase().includes(q.toLowerCase()) ||
    (a.summary || '').toLowerCase().includes(q.toLowerCase())
  );
  el.innerHTML = !hits.length
    ? '<div style="color:var(--text-muted);font-size:0.85rem;padding:1rem 0">No results found.</div>'
    : hits.slice(0, 6).map(a => `
        <div class="search-result-item" onclick="location.href='${articleURL(a.id, a.cat)}'">
          <span class="search-result-cat cat-${catColor(a.cat || a.category)}">${capFirst(a.cat || a.category)}</span>
          <span class="search-result-title">${a.title}</span>
        </div>`).join('');
}

document.addEventListener('keydown', e => {
// ── NEWS CARD HTML ────────────────────────────────────────────

function cardHTML(a) {
  const cat = a.cat || a.category || 'international';
  const url = articleURL(a.id, cat);
  return `
    <div class="news-card" onclick="location.href='${url}'" style="cursor:pointer">
      <div class="card-img-wrap">
        <img class="card-img"
          src="${a.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80'}"
          alt="${a.title}" loading="lazy"
          onerror="this.src='https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80'" />
        <div class="card-img-overlay"></div>
        <div class="card-cat-chip chip-${catColor(cat)}">${capFirst(cat)}</div>
      </div>
      <div class="card-body">
        <h3 class="card-title">${a.title}</h3>
        ${a.summary ? `<p class="card-summary">${a.summary}</p>` : ''}
        <div class="card-footer">
          <span class="card-date">${fmt(a.date)}</span>
          <div class="card-arrow">→</div>
        </div>
      </div>
    </div>`;
}

// ── HOMEPAGE ─────────────────────────────────────────────────

async function initHomepage() {
  initTheme(); initDate(); initEdition(); setActiveNav();

  const feed = await getJSON('data/index.json');
  if (!feed || !feed.length) return;
  _feedArticles = feed;
  initTicker(feed);
  initBreaking(feed);

  // Hero
  const featured = feed.find(a => a.featured) || feed[0];
  renderHero(featured);
  renderHeroStack(feed.filter(a => a.id !== featured.id).slice(0, 3));
  renderTrending(feed.slice(0, 6));

  // Main grid
  const grid = $('#news-grid');
  if (grid) grid.innerHTML = feed.map(a => cardHTML(a)).join('');

  // Category strips — load from category JSONs for thumbnails
  const [natData, sptData] = await Promise.all([
    getJSON('data/national.json'),
    getJSON('data/sports.json')
  ]);
  renderStrip(natData, '#strip-national', 'national');
  renderStrip(sptData, '#strip-sports',   'sports');
}

function renderHero(a) {
  const el = $('#hero-main');
  if (!el) return;
  const cat = a.cat || a.category || 'international';
  el.innerHTML = `
    <img class="hero-main-img"
      src="${a.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=80'}"
      alt="${a.title}" loading="eager"
      onerror="this.src='https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=80'" />
    <div class="hero-main-overlay"></div>
    <div class="hero-main-content">
      <div class="hero-cat-badge cat-${catColor(cat)}">${capFirst(cat)}</div>
      <h2 class="hero-title">${a.title}</h2>
      <p class="hero-summary">${a.summary || ''}</p>
      <div class="hero-meta">
        <span>${fmt(a.date)}</span>
        <span class="hero-meta-dot">●</span>
        <span>Alamin Network</span>
      </div>
      <a href="${articleURL(a.id, cat)}" class="hero-read-btn">
        Read Full Report
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </a>
    </div>`;
  el.onclick = e => { if (!e.target.closest('a')) location.href = articleURL(a.id, cat); };
}

function renderHeroStack(items) {
  const el = $('#hero-stack');
  if (!el) return;
  el.innerHTML = items.map(a => {
    const cat = a.cat || a.category || 'international';
    return `
      <div class="hero-stack-item" onclick="location.href='${articleURL(a.id, cat)}'">
        <img class="hero-stack-img" src="${a.image || ''}" alt="${a.title}" loading="lazy"
          onerror="this.src='https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=80'" />
        <div class="hero-stack-overlay"></div>
        <div class="hero-stack-content">
          <div class="stack-cat cat-${catColor(cat)}">${capFirst(cat)}</div>
          <div class="stack-title">${a.title}</div>
          <div class="stack-date">${fmt(a.date)}</div>
        </div>
      </div>`;
  }).join('');
}

function renderTrending(items) {
  const el = $('#trending-items');
  if (!el) return;
  el.innerHTML = items.map((a, i) => {
    const cat = a.cat || a.category || 'international';
    return `<a class="trending-item" href="${articleURL(a.id, cat)}">
      <span class="trending-num">${i+1}</span>${a.title}
    </a>`;
  }).join('');
}

function renderStrip(items, selector, cat) {
  const el = $(selector);
  if (!el || !items) return;
  el.innerHTML = items.slice(0, 4).map(a => `
    <div class="strip-item" onclick="location.href='${articleURL(a.id, cat)}'">
      <img class="strip-item-img"
        src="${a.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&q=60'}"
        alt="${a.title}" loading="lazy"
        onerror="this.src='https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&q=60'" />
      <div class="strip-item-body">
        <div class="strip-item-title">${a.title}</div>
        <div class="strip-item-date">${fmt(a.date)}</div>
      </div>
    </div>`).join('');
}

// ── CATEGORY PAGE ─────────────────────────────────────────────

async function initCategoryPage() {
  initTheme(); initDate(); initEdition(); setActiveNav();

  const cat = qs('cat') || 'national';
  document.title = `${capFirst(cat)} — Alamin Network`;

  // Load feed for ticker/breaking
  const feed = await getJSON('data/index.json');
  if (feed) { _feedArticles = feed; initTicker(feed); initBreaking(feed); }

  // Load full category data
  const data = await getJSON(`data/${cat}.json`);
  if (!data) return;

  const labelEl = $('#cat-label');   if (labelEl) labelEl.textContent = 'Category';
  const titleEl = $('#cat-title');   if (titleEl) titleEl.textContent = capFirst(cat);
  const countEl = $('#cat-count');   if (countEl) countEl.textContent = String(data.length).padStart(2, '0');

  const listEl = $('#cat-list');
  if (!listEl) return;
  listEl.innerHTML = data.map((a, i) => `
    <div class="cat-list-item" onclick="location.href='${articleURL(a.id, cat)}'"
      style="animation-delay:${i * 0.06}s">
      <img class="cat-list-img"
        src="${a.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&q=60'}"
        alt="${a.title}" loading="lazy"
        onerror="this.src='https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&q=60'" />
      <div class="cat-list-body">
        <div class="cat-list-title">${a.title}</div>
        <div class="cat-list-meta">${fmt(a.date)}</div>
      </div>
      <div class="cat-list-arrow">›</div>
    </div>`).join('');
}

// ── ARTICLE PAGE ──────────────────────────────────────────────
// URL format: report.html?id=n001&cat=national
// Fetches data/national.json, finds entry where id === "n001"

let _currentArticle = null;

async function initArticlePage() {
  initTheme(); initDate(); initEdition(); setActiveNav();

  const id  = qs('id');
  const cat = qs('cat') || 'national';

  window.addEventListener('scroll', updateProgress);

  // Load feed for ticker/breaking/related
  const feed = await getJSON('data/index.json');
  if (feed) { _feedArticles = feed; initTicker(feed); initBreaking(feed); }

  if (!id) { showArticleError(); return; }

  // Fetch the category JSON and find the article by id
  const catData = await getJSON(`data/${cat}.json`);
  if (!catData) { showArticleError(); return; }

  const article = catData.find(a => a.id === id);
  if (!article) { showArticleError(); return; }

  _currentArticle = article;
  document.title = `${article.title} — Alamin Network`;

  renderArticle(article);

  // Related = other articles from same category
  const related = catData.filter(a => a.id !== id).slice(0, 5);
  renderRelated(related, cat);
}

function updateProgress() {
  const bar = $('#article-progress');
  if (!bar) return;
  const scrollTop  = window.scrollY;
  const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
  bar.style.width  = (docHeight > 0 ? (scrollTop / docHeight) * 100 : 0) + '%';
}

function renderArticle(a) {
  const el = $('#article-container');
  if (!el) return;
  const color = catColor(a.category);
  el.innerHTML = `
    ${a.image ? `
    <div class="article-hero-img-wrap">
      <img class="article-hero-img" src="${a.image}" alt="${a.title}"
        onerror="this.style.display='none'" />
      <div class="article-hero-img-caption">Photo: Alamin Network / ${a.category}</div>
    </div>` : ''}
    <div class="article-cat-row">
      <span class="article-cat-pill chip-${color}">${a.category}</span>
      ${a.breaking ? '<span class="article-breaking-tag">⚡ Breaking</span>' : ''}
    </div>
    <h1 class="article-title">${a.title}</h1>
    <div class="article-meta-bar">
      <div class="article-meta-item">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        ${fmt(a.date)}
      </div>
      <span class="article-meta-sep">●</span>
      <div class="article-meta-item">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        ${readTime(a.content)}
      </div>
      <span class="article-meta-sep">●</span>
      <div class="article-meta-item">Alamin Network</div>
    </div>
    <div class="article-content">${a.content || '<p>Content not available.</p>'}</div>`;
}

function renderRelated(items, cat) {
  const el = $('#related-list');
  if (!el) return;
  el.innerHTML = items.map(a => `
    <div class="related-item" onclick="location.href='${articleURL(a.id, cat)}'">
      <img class="related-item-img"
        src="${a.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=100&q=60'}"
        alt="${a.title}" loading="lazy"
        onerror="this.src='https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=100&q=60'" />
      <div class="related-item-title">${a.title}</div>
    </div>`).join('');
}

function showArticleError() {
  const el = $('#article-container');
  if (el) el.innerHTML = `
    <div style="text-align:center;padding:5rem 0;color:var(--text-muted)">
      <div style="font-size:3rem;margin-bottom:1rem">📰</div>
      <div style="font-family:var(--display);font-size:1.5rem;color:var(--cream);margin-bottom:0.5rem">Article Not Found</div>
      <div style="font-size:0.85rem;margin-bottom:2rem">This article may have been moved or is not yet available.</div>
      <a href="index.html" style="color:var(--gold);font-size:0.8rem;letter-spacing:0.1em;text-transform:uppercase">← Return to Homepage</a>
    </div>`;
}

// ── SHARE & DOWNLOAD ─────────────────────────────────────────

function shareTo(platform) {
  const url   = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(document.title);
  const links = {
    twitter:  `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    whatsapp: `https://wa.me/?text=${title}%20${url}`
  };
  if (links[platform]) window.open(links[platform], '_blank', 'noopener,width=600,height=500');
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    const btn = $('#copy-btn');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ Copied!';
      btn.style.color = 'var(--cat-sports)';
      setTimeout(() => { btn.innerHTML = orig; btn.style.color = ''; }, 2000);
    }
  });
}

function downloadSummary() {
  if (!_currentArticle) return;
  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d');
  const W = 1200, H = 630;
  canvas.width = W; canvas.height = H;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#04080f'); bg.addColorStop(0.6, '#0c1a35'); bg.addColorStop(1, '#060d1e');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(201,168,76,0.04)'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  const goldGrad = ctx.createLinearGradient(0, 80, 0, H-80);
  goldGrad.addColorStop(0, '#c9a84c'); goldGrad.addColorStop(1, 'rgba(201,168,76,0.2)');
  ctx.fillStyle = goldGrad; ctx.fillRect(60, 80, 4, H - 160);

  ctx.font = '500 13px Arial'; ctx.fillStyle = '#c9a84c';
  ctx.fillText('ALAMIN NETWORK  ·  ' + (_currentArticle.category || '').toUpperCase(), 84, 110);

  ctx.font = 'bold 50px Georgia'; ctx.fillStyle = '#ffffff';
  const words = _currentArticle.title.split(' ');
  let line = '', y = 200;
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > W - 200 && line) { ctx.fillText(line.trim(), 84, y); line = word + ' '; y += 64; }
    else line = test;
    if (y > 440) break;
  }
  if (line.trim()) ctx.fillText(line.trim(), 84, y);

  ctx.font = '400 16px Arial'; ctx.fillStyle = 'rgba(244,241,235,0.4)';
  ctx.fillText(fmt(_currentArticle.date) + '  ·  ' + readTime(_currentArticle.content || ''), 84, H - 80);

}

// ── NAV SCROLL HIDE ───────────────────────────────────────────

(function () {
  let lastScroll = 0;
  const THRESHOLD = 60; // px scrolled before nav hides

  window.addEventListener('scroll', () => {
    const nav = $('.main-nav');
    if (!nav) return;
    const current = window.scrollY;

    if (current > THRESHOLD && current > lastScroll) {
      // scrolling DOWN — hide nav
      nav.classList.add('nav-hidden');
    } else {
      // scrolling UP or near top — show nav
      nav.classList.remove('nav-hidden');
    }
    lastScroll = current <= 0 ? 0 : current;
  }, { passive: true });
})();

// ── DRAWER ────────────────────────────────────────────────────

function openDrawer() {
  const drawer  = $('#drawer');
  const overlay = $('#drawer-overlay');
  const btn     = $('#hamburger-btn');
  if (!drawer) return;
  drawer.classList.add('open');
  overlay.classList.add('open');
  btn.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  const drawer  = $('#drawer');
  const overlay = $('#drawer-overlay');
  const btn     = $('#hamburger-btn');
  if (!drawer) return;
  drawer.classList.remove('open');
  overlay.classList.remove('open');
  btn.classList.remove('is-open');
  document.body.style.overflow = '';
}

// Close drawer on overlay click
document.addEventListener('DOMContentLoaded', () => {
  const overlay = $('#drawer-overlay');
  if (overlay) overlay.addEventListener('click', closeDrawer);
});

// Close drawer on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeDrawer(); closeSearch(); }
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); openSearch(); }
});
