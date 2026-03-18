/* =====================================================
   ALAMIN NETWORK — main.js
   No index.json. Homepage auto-fetches from categories.
   Article URL: report.html?id=bd001&cat=bangladesh
   ===================================================== */

'use strict';

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
  } catch (e) { return null; }
}

function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function fmtDateTime(date, time) {
  if (!time) return fmtDate(date);
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return fmtDate(date) + ', ' + h12 + ':' + String(m).padStart(2, '0') + ' ' + ampm;
}

function timeAgo(date, time) {
  const posted = new Date(date + 'T' + (time || '00:00') + ':00');
  const diff = Math.floor((Date.now() - posted) / 1000);
  if (diff < 60)         return 'Just now';
  if (diff < 3600)       return Math.floor(diff / 60) + ' min ago';
  if (diff < 86400)      return Math.floor(diff / 3600) + ' hr ago';
  if (diff < 604800)     return Math.floor(diff / 86400) + ' days ago';
  if (diff < 2592000)    return Math.floor(diff / 604800) + ' weeks ago';
  return fmtDate(date);
}

function readTime(html) {
  const w = (html || '').replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(w / 200)) + ' min read';
}

function catColor(cat) {
  const map = {
    bangladesh: 'bangladesh', international: 'international',
    sports: 'sports', politics: 'politics', business: 'business',
    technology: 'technology', entertainment: 'entertainment',
    explained: 'explained', opinion: 'opinion'
  };
  return map[(cat || '').toLowerCase()] || 'international';
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function articleURL(id, cat) {
  return 'report.html?id=' + id + '&cat=' + (cat || '').toLowerCase();
}

function timeMeta(date, time) {
  return '<span class="time-ago">' + timeAgo(date, time) + '</span>' +
         '<span class="time-sep">·</span>' +
         '<span class="time-full">' + fmtDateTime(date, time) + '</span>';
}

// ── STATE ─────────────────────────────────────────────

let _feed = [];
let _currentArticle = null;

const ALL_CATS  = ['international','bangladesh','business','sports','politics','technology','entertainment','explained','opinion'];
const HOME_CATS = ['international','bangladesh','business','sports','politics'];

// ── COMMON ────────────────────────────────────────────

function initDate() {
  const el = $('#live-date');
  if (el) el.textContent = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

function initEdition() {
  const h = new Date().getHours();
  const name = h < 12 ? 'Morning Edition' : h < 17 ? 'Afternoon Edition' : 'Evening Edition';
  $$('#edition-name, #drawer-edition-name').forEach(el => { if (el) el.textContent = name; });
}

function setActiveNav() {
  const cat  = qs('cat');
  const path = window.location.pathname;
  const home = path.endsWith('index.html') || path === '/' || path.endsWith('/');
  $$('.cat-link').forEach(l => {
    l.classList.remove('active');
    if (l.dataset.cat && l.dataset.cat === cat) l.classList.add('active');
    if (!l.dataset.cat && home) l.classList.add('active');
  });
  $$('.drawer-link').forEach(l => {
    l.classList.remove('active');
    if (l.dataset.cat && l.dataset.cat === cat) l.classList.add('active');
    if (l.dataset.page === 'home' && home) l.classList.add('active');
  });
}

function initBreaking(data) {
  const banner = $('#breaking-banner'), inner = $('#breaking-inner');
  if (!banner || !inner || !data) return;
  const items = data.filter(a => a.breaking);
  if (!items.length) return;
  banner.classList.add('visible');
  const text = items.map(a => '⚡ ' + a.title).join('   ·   ');
  inner.textContent = text + '   ·   ·   ·   ' + text;
}

// ── SCROLL NAV HIDE ───────────────────────────────────

(function() {
  let last = 0;
  window.addEventListener('scroll', () => {
    const nav = $('.cat-nav');
    if (!nav) return;
    const cur = window.scrollY;
    if (cur > 60 && cur > last) nav.classList.add('hidden');
    else nav.classList.remove('hidden');
    last = cur <= 0 ? 0 : cur;
  }, { passive: true });
})();

// ── DRAWER ────────────────────────────────────────────

function openDrawer() {
  const d = $('#drawer'), b = $('#drawer-backdrop'), btn = $('#hamburger-btn');
  if (!d) return;
  d.classList.add('open'); if (b) b.classList.add('open');
  if (btn) btn.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  const d = $('#drawer'), b = $('#drawer-backdrop'), btn = $('#hamburger-btn');
  if (!d) return;
  d.classList.remove('open'); if (b) b.classList.remove('open');
  if (btn) btn.classList.remove('open');
  document.body.style.overflow = '';
}

// ── SEARCH ────────────────────────────────────────────

function openSearch() {
  const o = $('#search-overlay');
  if (!o) return;
  o.classList.add('open');
  setTimeout(() => { const i = $('#search-input'); if (i) i.focus(); }, 60);
}

function closeSearch() {
  const o = $('#search-overlay');
  if (o) o.classList.remove('open');
}

function runSearch(q) {
  const el = $('#search-results');
  if (!el) return;
  if (!q || q.length < 2) { el.innerHTML = ''; return; }
  const hits = _feed.filter(a =>
    a.title.toLowerCase().includes(q.toLowerCase()) ||
    (a.summary || '').toLowerCase().includes(q.toLowerCase())
  );
  if (!hits.length) {
    el.innerHTML = '<div style="color:var(--text-4);font-size:.85rem;padding:.8rem 0">No results found.</div>';
    return;
  }
  el.innerHTML = hits.slice(0, 6).map(a => {
    const cat = a.cat || a.category || 'international';
    return `<div class="search-result-item" onclick="location.href='${articleURL(a.id, cat)}'">
      <span class="search-result-cat cat-${catColor(cat)}">${cap(cat)}</span>
      <span class="search-result-title">${a.title}</span>
    </div>`;
  }).join('');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeSearch(); closeDrawer(); }
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); openSearch(); }
});

document.addEventListener('DOMContentLoaded', () => {
  const bd = $('#drawer-backdrop');
  if (bd) bd.addEventListener('click', closeDrawer);
});

// ── CARD HTML ─────────────────────────────────────────

function cardHTML(a) {
  const cat = (a.cat || a.category || 'international').toLowerCase();
  const url = articleURL(a.id, cat);
  return `<div class="news-card" onclick="location.href='${url}'">
    <div class="card-img-wrap">
      <img class="card-img" src="${a.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80'}"
        alt="${a.title}" loading="lazy"
        onerror="this.src='https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80'" />
      <div class="card-img-overlay"></div>
      <div class="card-chip chip-${catColor(cat)}">${cap(cat)}</div>
    </div>
    <div class="card-body">
      <h3 class="card-title">${a.title}</h3>
      ${a.summary ? `<p class="card-summary">${a.summary}</p>` : ''}
      <div class="card-footer">
        <div class="card-time-wrap">${timeMeta(a.date, a.time)}</div>
        <div class="card-arrow">→</div>
      </div>
    </div>
  </div>`;
}

// ── HOMEPAGE ──────────────────────────────────────────

async function initHomepage() {
  initDate(); initEdition(); setActiveNav();

  const results = await Promise.all(HOME_CATS.map(cat => getJSON('data/' + cat + '.json')));

  let feed = [], allArticles = [];
  results.forEach((data, i) => {
    if (!data) return;
    const cat = HOME_CATS[i];
    const tagged = data.map(a => ({ ...a, cat }));
    allArticles = allArticles.concat(tagged);
    feed = feed.concat(tagged.slice(0, 3));
  });

  _feed = allArticles;
  initBreaking(allArticles);

  const featured = feed.find(a => a.featured) || feed[0];
  renderHero(featured);
  renderHeroStack(feed.filter(a => a.id !== featured.id).slice(0, 3));
  renderTrending(feed.slice(0, 6));

  const grid = $('#news-grid');
  if (grid) grid.innerHTML = feed.map(cardHTML).join('');

  // 5 strips
  const stripCats = ['international','bangladesh','business','sports','politics'];
  const stripData = await Promise.all(stripCats.map(cat => getJSON('data/' + cat + '.json')));
  stripCats.forEach((cat, i) => {
    if (stripData[i]) renderStrip(stripData[i], '#strip-' + cat, cat);
  });
}

function renderHero(a) {
  const el = $('#hero-main');
  if (!el) return;
  const cat = (a.cat || a.category || 'international').toLowerCase();
  el.innerHTML = `
    <img class="hero-main-img" src="${a.image || ''}" alt="${a.title}" loading="eager"
      onerror="this.src='https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=80'" />
    <div class="hero-main-overlay"></div>
    <div class="hero-content">
      <div class="hero-cat">${cap(cat)}</div>
      <h2 class="hero-title">${a.title}</h2>
      <p class="hero-summary">${a.summary || ''}</p>
      <div class="hero-meta">${timeMeta(a.date, a.time)}</div>
      <a href="${articleURL(a.id, cat)}" class="hero-read-btn">Read Full Report
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </a>
    </div>`;
  el.onclick = e => { if (!e.target.closest('a')) location.href = articleURL(a.id, cat); };
}

function renderHeroStack(items) {
  const el = $('#hero-stack');
  if (!el) return;
  el.innerHTML = items.map(a => {
    const cat = (a.cat || a.category || 'international').toLowerCase();
    return `<div class="hero-stack-item" onclick="location.href='${articleURL(a.id, cat)}'">
      <img class="hero-stack-img" src="${a.image || ''}" alt="${a.title}" loading="lazy"
        onerror="this.src='https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=80'" />
      <div class="hero-stack-overlay"></div>
      <div class="hero-stack-content">
        <div class="stack-cat">${cap(cat)}</div>
        <div class="stack-title">${a.title}</div>
        <div class="stack-date">${timeAgo(a.date, a.time)}</div>
      </div>
    </div>`;
  }).join('');
}

function renderTrending(items) {
  const el = $('#trending-items');
  if (!el) return;
  el.innerHTML = items.map((a, i) => {
    const cat = (a.cat || a.category || 'international').toLowerCase();
    return `<a class="trending-item" href="${articleURL(a.id, cat)}">
      <span class="trending-num">${i + 1}</span>${a.title}
    </a>`;
  }).join('');
}

function renderStrip(items, selector, cat) {
  const el = $(selector);
  if (!el || !items) return;
  el.innerHTML = items.slice(0, 3).map(a => `
    <div class="strip-item" onclick="location.href='${articleURL(a.id, cat)}'">
      <img class="strip-img"
        src="${a.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&q=60'}"
        alt="${a.title}" loading="lazy"
        onerror="this.src='https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&q=60'" />
      <div>
        <div class="strip-title">${a.title}</div>
        <div class="strip-date">${timeAgo(a.date, a.time)}</div>
      </div>
    </div>`).join('');
}

// ── CATEGORY PAGE ─────────────────────────────────────

async function initCategoryPage() {
  initDate(); initEdition(); setActiveNav();

  const cat = qs('cat') || 'bangladesh';
  document.title = cap(cat) + ' — Alamin Network';

  const allData = await Promise.all(ALL_CATS.map(c => getJSON('data/' + c + '.json')));
  allData.forEach((data, i) => {
    if (data) _feed = _feed.concat(data.map(a => ({ ...a, cat: ALL_CATS[i] })));
  });
  initBreaking(_feed);

  const data = await getJSON('data/' + cat + '.json');
  if (!data) return;

  const labelEl = $('#cat-label'); if (labelEl) labelEl.textContent = 'Category';
  const titleEl = $('#cat-title'); if (titleEl) titleEl.textContent = cap(cat);
  const countEl = $('#cat-count'); if (countEl) countEl.textContent = String(data.length).padStart(2, '0');

  const listEl = $('#cat-list');
  if (!listEl) return;
  listEl.innerHTML = data.map((a, i) => `
    <div class="cat-list-item" onclick="location.href='${articleURL(a.id, cat)}'"
      style="animation-delay:${i * 0.06}s">
      <img class="cat-list-img"
        src="${a.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&q=60'}"
        alt="${a.title}" loading="lazy"
        onerror="this.src='https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&q=60'" />
      <div>
        <div class="cat-list-title">${a.title}</div>
        <div class="cat-list-meta">${fmtDateTime(a.date, a.time)} · ${timeAgo(a.date, a.time)}</div>
      </div>
      <div class="cat-list-arrow">›</div>
    </div>`).join('');
}

// ── ARTICLE PAGE ──────────────────────────────────────

async function initArticlePage() {
  initDate(); initEdition(); setActiveNav();

  const id  = qs('id');
  const cat = qs('cat') || 'bangladesh';

  window.addEventListener('scroll', () => {
    const bar = $('#article-progress');
    if (!bar) return;
    const s = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (s > 0 ? (window.scrollY / s) * 100 : 0) + '%';
  }, { passive: true });

  const allData = await Promise.all(ALL_CATS.map(c => getJSON('data/' + c + '.json')));
  allData.forEach((data, i) => {
    if (data) _feed = _feed.concat(data.map(a => ({ ...a, cat: ALL_CATS[i] })));
  });
  initBreaking(_feed);

  if (!id) { showError(); return; }

  // First try main category JSON
  let catData = await getJSON('data/' + cat + '.json');
  let article = catData ? catData.find(a => a.id === id) : null;

  // If not found, try archive JSON as fallback
  if (!article) {
    const archiveData = await getJSON('data/archive-' + cat + '.json');
    if (archiveData) {
      article = archiveData.find(a => a.id === id);
      // Use archive data for related articles too
      if (article) catData = archiveData;
    }
  }

  if (!article) { showError(); return; }

  _currentArticle = article;
  document.title = article.title + ' — Alamin Network';

  const setMeta = (mid, val) => {
    const el = document.getElementById(mid);
    if (el && val) el.setAttribute('content', val);
  };
  setMeta('og-title',       article.title + ' — Alamin Network');
  setMeta('og-description', article.summary || article.title);
  setMeta('og-image',       article.image || '');
  setMeta('og-url',         window.location.href);
  setMeta('tw-title',       article.title + ' — Alamin Network');
  setMeta('tw-description', article.summary || article.title);
  setMeta('tw-image',       article.image || '');

  renderArticle(article, cat);
  renderRelated(catData.filter(a => a.id !== id).slice(0, 5), cat);
}

function renderArticle(a, cat) {
  const el = $('#article-container');
  if (!el) return;
  const color = catColor(a.category || cat);
  const backURL = 'category.html?cat=' + cat;

  el.innerHTML = `
    <a href="${backURL}" class="article-back-btn">← ${cap(cat)}</a>
    ${a.image ? `<div class="article-hero-wrap">
      <img class="article-hero-img" src="${a.image}" alt="${a.title}"
        onerror="this.style.display='none'" />
      <div class="article-hero-caption">Photo: Alamin Network / ${a.category || cap(cat)}</div>
    </div>` : ''}
    <div class="article-cat-row">
      <span class="article-cat-pill cat-${color}">${a.category || cap(cat)}</span>
      ${a.breaking ? '<span class="article-breaking">⚡ Breaking</span>' : ''}
    </div>
    <h1 class="article-title">${a.title}</h1>
    <div class="article-meta-bar">
      <div class="article-meta-item">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        ${fmtDateTime(a.date, a.time)}
      </div>
      <span class="article-meta-sep">●</span>
      <div class="article-meta-item">🕐 ${timeAgo(a.date, a.time)}</div>
      <span class="article-meta-sep">●</span>
      <div class="article-meta-item">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        ${readTime(a.content)}
      </div>
      <span class="article-meta-sep">●</span>
      <div class="article-meta-item">Alamin Network</div>
    </div>
    <div class="article-body">${a.content || '<p>Content not available.</p>'}</div>`;
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

function showError() {
  const el = $('#article-container');
  if (!el) return;
  el.innerHTML = `<div style="text-align:center;padding:5rem 0;color:var(--text-4)">
    <div style="font-size:3rem;margin-bottom:1rem">📰</div>
    <div style="font-family:var(--display);font-size:1.5rem;color:var(--navy);margin-bottom:.5rem">Article Not Found</div>
    <div style="font-size:.85rem;margin-bottom:2rem">This article may have been moved or removed.</div>
    <a href="index.html" style="color:var(--gold);font-size:.8rem;letter-spacing:.1em;text-transform:uppercase">← Return to Homepage</a>
  </div>`;
}

// ── SHARE & DOWNLOAD ─────────────────────────────────

function shareTo(platform) {
  const url = encodeURIComponent(window.location.href);
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
    if (!btn) return;
    const orig = btn.innerHTML;
    btn.innerHTML = '✓ Copied!';
    btn.style.color = 'var(--cat-spt)';
    setTimeout(() => { btn.innerHTML = orig; btn.style.color = ''; }, 2000);
  });
}

function downloadSummary() {
  if (!_currentArticle) return;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const W = 1200, H = 630;
  canvas.width = W; canvas.height = H;
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#04080f'); bg.addColorStop(1, '#0c1a35');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(201,168,76,.04)'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  ctx.fillStyle = '#c9a84c'; ctx.fillRect(60, 80, 4, H - 160);
  ctx.font = '500 13px Arial'; ctx.fillStyle = '#c9a84c';
  ctx.fillText('ALAMIN NETWORK  ·  ' + (_currentArticle.category || '').toUpperCase(), 84, 110);
  ctx.font = 'bold 48px Georgia'; ctx.fillStyle = '#ffffff';
  const words = _currentArticle.title.split(' ');
  let line = '', ty = 200;
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > W - 200 && line) { ctx.fillText(line.trim(), 84, ty); line = word + ' '; ty += 62; }
    else line = test;
    if (ty > 440) break;
  }
  if (line.trim()) ctx.fillText(line.trim(), 84, ty);
  ctx.font = '400 16px Arial'; ctx.fillStyle = 'rgba(244,241,235,.4)';
  ctx.fillText(fmtDateTime(_currentArticle.date, _currentArticle.time) + '  ·  ' + readTime(_currentArticle.content || ''), 84, H - 80);
  ctx.fillStyle = '#c9a84c'; ctx.fillRect(0, H-5, W, 5);
  const link = document.createElement('a');
  link.download = 'alamin-' + _currentArticle.id + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}
