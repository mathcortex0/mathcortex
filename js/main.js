/* =====================================================
   ALAMIN NETWORK — main.js
   Reads full articles from category JSONs.
   Article URL: report.html?id=n001&cat=national
   ===================================================== */

'use strict';

// ── HELPERS ──────────────────────────────────────────

const $ = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];

function qs(key) {
  return new URLSearchParams(window.location.search).get(key);
}

// Clean fetch — no cache-busting suffix (breaks local file:// protocol)
async function getJSON(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}

function fmt(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function readTime(html) {
  const w = (html || '').replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(w / 200)) + ' min read';
}

function catColor(cat) {
  const c = (cat || '').toLowerCase();
  if (c === 'national') return 'national';
  if (c === 'sports')   return 'sports';
  return 'international';
}

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function articleURL(id, cat) {
  return 'report.html?id=' + id + '&cat=' + (cat || '').toLowerCase();
}

// ── STATE ─────────────────────────────────────────────

let _feed = [];
let _currentArticle = null;

// ── COMMON INIT ───────────────────────────────────────

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
  const banner = $('#breaking-banner');
  const inner  = $('#breaking-inner');
  if (!banner || !inner || !data) return;
  const items = data.filter(a => a.breaking);
  if (!items.length) return;
  banner.classList.add('visible');
  // Duplicate text for seamless marquee loop
  const text = items.map(a => '⚡ ' + a.title).join('   ·   ');
  inner.textContent = text + '   ·   ·   ·   ' + text;
}

// ── SCROLL: HIDE/SHOW CATEGORY NAV ───────────────────

(function () {
  let last = 0;
  window.addEventListener('scroll', function () {
    const nav = $('.cat-nav');
    if (!nav) return;
    const cur = window.scrollY;
    if (cur > 60 && cur > last) {
      nav.classList.add('hidden');
    } else {
      nav.classList.remove('hidden');
    }
    last = cur <= 0 ? 0 : cur;
  }, { passive: true });
})();

// ── DRAWER ────────────────────────────────────────────

function openDrawer() {
  const drawer   = $('#drawer');
  const backdrop = $('#drawer-backdrop');
  const btn      = $('#hamburger-btn');
  if (!drawer) return;
  drawer.classList.add('open');
  if (backdrop) backdrop.classList.add('open');
  if (btn) btn.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  const drawer   = $('#drawer');
  const backdrop = $('#drawer-backdrop');
  const btn      = $('#hamburger-btn');
  if (!drawer) return;
  drawer.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
  if (btn) btn.classList.remove('open');
  document.body.style.overflow = '';
}

// ── SEARCH ────────────────────────────────────────────

function openSearch() {
  const o = $('#search-overlay');
  if (!o) return;
  o.classList.add('open');
  setTimeout(() => {
    const inp = $('#search-input');
    if (inp) inp.focus();
  }, 60);
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
  el.innerHTML = hits.slice(0, 6).map(function (a) {
    var cat = a.cat || a.category || 'international';
    return '<div class="search-result-item" onclick="location.href=\'' + articleURL(a.id, cat) + '\'">' +
      '<span class="search-result-cat cat-' + catColor(cat) + '">' + cap(cat) + '</span>' +
      '<span class="search-result-title">' + a.title + '</span>' +
      '</div>';
  }).join('');
}

// ── KEYBOARD ──────────────────────────────────────────

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { closeSearch(); closeDrawer(); }
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
    e.preventDefault(); openSearch();
  }
});

// Backdrop click closes drawer
document.addEventListener('DOMContentLoaded', function () {
  var bd = $('#drawer-backdrop');
  if (bd) bd.addEventListener('click', closeDrawer);
});

// ── CARD HTML ─────────────────────────────────────────

function cardHTML(a) {
  var cat = a.cat || a.category || 'international';
  var url = articleURL(a.id, cat);
  return '<div class="news-card" onclick="location.href=\'' + url + '\'">' +
    '<div class="card-img-wrap">' +
    '<img class="card-img" src="' + (a.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80') + '" alt="' + a.title + '" loading="lazy" onerror="this.src=\'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80\'" />' +
    '<div class="card-img-overlay"></div>' +
    '<div class="card-chip chip-' + catColor(cat) + '">' + cap(cat) + '</div>' +
    '</div>' +
    '<div class="card-body">' +
    '<h3 class="card-title">' + a.title + '</h3>' +
    (a.summary ? '<p class="card-summary">' + a.summary + '</p>' : '') +
    '<div class="card-footer"><span class="card-date">' + fmt(a.date) + '</span><div class="card-arrow">→</div></div>' +
    '</div></div>';
}

// ── HOMEPAGE ──────────────────────────────────────────

async function initHomepage() {
  initDate(); initEdition(); setActiveNav();

  var feed = await getJSON('data/index.json');
  if (!feed || !feed.length) return;
  _feed = feed;
  initBreaking(feed);

  // Hero
  var featured = feed.find(function (a) { return a.featured; }) || feed[0];
  renderHero(featured);

  // Hero stack
  var stackItems = feed.filter(function (a) { return a.id !== featured.id; }).slice(0, 3);
  renderHeroStack(stackItems);

  // Trending
  renderTrending(feed.slice(0, 6));

  // News grid
  var grid = $('#news-grid');
  if (grid) grid.innerHTML = feed.map(cardHTML).join('');

  // Category strips
  var natData = await getJSON('data/national.json');
  var intData = await getJSON('data/international.json');
  var sptData = await getJSON('data/sports.json');
  renderStrip(intData, '#strip-international', 'international');
  renderStrip(natData, '#strip-national', 'national');
  renderStrip(sptData, '#strip-sports', 'sports');
}

function renderHero(a) {
  var el = $('#hero-main');
  if (!el) return;
  var cat = a.cat || a.category || 'international';
  el.innerHTML =
    '<img class="hero-main-img" src="' + (a.image || '') + '" alt="' + a.title + '" loading="eager" onerror="this.src=\'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=80\'" />' +
    '<div class="hero-main-overlay"></div>' +
    '<div class="hero-content">' +
    '<div class="hero-cat">' + cap(cat) + '</div>' +
    '<h2 class="hero-title">' + a.title + '</h2>' +
    '<p class="hero-summary">' + (a.summary || '') + '</p>' +
    '<div class="hero-meta"><span>' + fmt(a.date) + '</span><span class="hero-meta-dot">●</span><span>Alamin Network</span></div>' +
    '<a href="' + articleURL(a.id, cat) + '" class="hero-read-btn">Read Full Report <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>' +
    '</div>';
  el.onclick = function (e) { if (!e.target.closest('a')) location.href = articleURL(a.id, cat); };
}

function renderHeroStack(items) {
  var el = $('#hero-stack');
  if (!el) return;
  el.innerHTML = items.map(function (a) {
    var cat = a.cat || a.category || 'international';
    return '<div class="hero-stack-item" onclick="location.href=\'' + articleURL(a.id, cat) + '\'">' +
      '<img class="hero-stack-img" src="' + (a.image || '') + '" alt="' + a.title + '" loading="lazy" onerror="this.src=\'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=80\'" />' +
      '<div class="hero-stack-overlay"></div>' +
      '<div class="hero-stack-content">' +
      '<div class="stack-cat">' + cap(cat) + '</div>' +
      '<div class="stack-title">' + a.title + '</div>' +
      '<div class="stack-date">' + fmt(a.date) + '</div>' +
      '</div></div>';
  }).join('');
}

function renderTrending(items) {
  var el = $('#trending-items');
  if (!el) return;
  el.innerHTML = items.map(function (a, i) {
    var cat = a.cat || a.category || 'international';
    return '<a class="trending-item" href="' + articleURL(a.id, cat) + '">' +
      '<span class="trending-num">' + (i + 1) + '</span>' + a.title + '</a>';
  }).join('');
}

function renderStrip(items, selector, cat) {
  var el = $(selector);
  if (!el || !items) return;
  el.innerHTML = items.slice(0, 4).map(function (a) {
    return '<div class="strip-item" onclick="location.href=\'' + articleURL(a.id, cat) + '\'">' +
      '<img class="strip-img" src="' + (a.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&q=60') + '" alt="' + a.title + '" loading="lazy" onerror="this.src=\'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&q=60\'" />' +
      '<div><div class="strip-title">' + a.title + '</div><div class="strip-date">' + fmt(a.date) + '</div></div>' +
      '</div>';
  }).join('');
}

// ── CATEGORY PAGE ─────────────────────────────────────

async function initCategoryPage() {
  initDate(); initEdition(); setActiveNav();

  var cat = qs('cat') || 'national';
  document.title = cap(cat) + ' — Alamin Network';

  var feed = await getJSON('data/index.json');
  if (feed) { _feed = feed; initBreaking(feed); }

  var data = await getJSON('data/' + cat + '.json');
  if (!data) return;

  var labelEl = $('#cat-label'); if (labelEl) labelEl.textContent = 'Category';
  var titleEl = $('#cat-title'); if (titleEl) titleEl.textContent = cap(cat);
  var countEl = $('#cat-count'); if (countEl) countEl.textContent = String(data.length).padStart(2, '0');

  var listEl = $('#cat-list');
  if (!listEl) return;
  listEl.innerHTML = data.map(function (a, i) {
    return '<div class="cat-list-item" onclick="location.href=\'' + articleURL(a.id, cat) + '\'" style="animation-delay:' + (i * 0.06) + 's">' +
      '<img class="cat-list-img" src="' + (a.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&q=60') + '" alt="' + a.title + '" loading="lazy" onerror="this.src=\'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&q=60\'" />' +
      '<div><div class="cat-list-title">' + a.title + '</div><div class="cat-list-meta">' + fmt(a.date) + '</div></div>' +
      '<div class="cat-list-arrow">›</div>' +
      '</div>';
  }).join('');
}

// ── ARTICLE PAGE ──────────────────────────────────────

async function initArticlePage() {
  initDate(); initEdition(); setActiveNav();

  var id  = qs('id');
  var cat = qs('cat') || 'national';

  window.addEventListener('scroll', function () {
    var bar = $('#article-progress');
    if (!bar) return;
    var s = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (s > 0 ? (window.scrollY / s) * 100 : 0) + '%';
  }, { passive: true });

  var feed = await getJSON('data/index.json');
  if (feed) { _feed = feed; initBreaking(feed); }

  if (!id) { showError(); return; }

  var catData = await getJSON('data/' + cat + '.json');
  if (!catData) { showError(); return; }

  var article = null;
  for (var i = 0; i < catData.length; i++) {
    if (catData[i].id === id) { article = catData[i]; break; }
  }
  if (!article) { showError(); return; }

  _currentArticle = article;
  document.title = article.title + ' — Alamin Network';

  renderArticle(article);

  // Related = other items from same category JSON
  var related = catData.filter(function (a) { return a.id !== id; }).slice(0, 5);
  renderRelated(related, cat);
}

function renderArticle(a) {
  var el = $('#article-container');
  if (!el) return;
  var color = catColor(a.category);
  el.innerHTML =
    (a.image ? '<div class="article-hero-wrap"><img class="article-hero-img" src="' + a.image + '" alt="' + a.title + '" onerror="this.style.display=\'none\'" /><div class="article-hero-caption">Photo: Alamin Network / ' + a.category + '</div></div>' : '') +
    '<div class="article-cat-row">' +
    '<span class="article-cat-pill cat-' + color + '">' + a.category + '</span>' +
    (a.breaking ? '<span class="article-breaking">⚡ Breaking</span>' : '') +
    '</div>' +
    '<h1 class="article-title">' + a.title + '</h1>' +
    '<div class="article-meta-bar">' +
    '<div class="article-meta-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' + fmt(a.date) + '</div>' +
    '<span class="article-meta-sep">●</span>' +
    '<div class="article-meta-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' + readTime(a.content) + '</div>' +
    '<span class="article-meta-sep">●</span>' +
    '<div class="article-meta-item">Alamin Network</div>' +
    '</div>' +
    '<div class="article-body">' + (a.content || '<p>Content not available.</p>') + '</div>';
}

function renderRelated(items, cat) {
  var el = $('#related-list');
  if (!el) return;
  el.innerHTML = items.map(function (a) {
    return '<div class="related-item" onclick="location.href=\'' + articleURL(a.id, cat) + '\'">' +
      '<img class="related-item-img" src="' + (a.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=100&q=60') + '" alt="' + a.title + '" loading="lazy" onerror="this.src=\'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=100&q=60\'" />' +
      '<div class="related-item-title">' + a.title + '</div>' +
      '</div>';
  }).join('');
}

function showError() {
  var el = $('#article-container');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:5rem 0;color:var(--text-4)">' +
    '<div style="font-size:3rem;margin-bottom:1rem">📰</div>' +
    '<div style="font-family:var(--display);font-size:1.5rem;color:var(--navy);margin-bottom:.5rem">Article Not Found</div>' +
    '<div style="font-size:.85rem;margin-bottom:2rem">This article may have been moved or removed.</div>' +
    '<a href="index.html" style="color:var(--gold);font-size:.8rem;letter-spacing:.1em;text-transform:uppercase">← Return to Homepage</a>' +
    '</div>';
}

// ── SHARE ─────────────────────────────────────────────

function shareTo(platform) {
  var url   = encodeURIComponent(window.location.href);
  var title = encodeURIComponent(document.title);
  var links = {
    twitter:  'https://twitter.com/intent/tweet?url=' + url + '&text=' + title,
    facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + url,
    whatsapp: 'https://wa.me/?text=' + title + '%20' + url
  };
  if (links[platform]) window.open(links[platform], '_blank', 'noopener,width=600,height=500');
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(function () {
    var btn = $('#copy-btn');
    if (!btn) return;
    var orig = btn.innerHTML;
    btn.innerHTML = '✓ Copied!';
    btn.style.color = 'var(--cat-spt)';
    setTimeout(function () { btn.innerHTML = orig; btn.style.color = ''; }, 2000);
  });
}

function downloadSummary() {
  if (!_currentArticle) return;
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  var W = 1200, H = 630;
  canvas.width = W; canvas.height = H;

  var bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#04080f'); bg.addColorStop(1, '#0c1a35');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(201,168,76,.04)'; ctx.lineWidth = 1;
  for (var x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (var y = 0; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  ctx.fillStyle = '#c9a84c'; ctx.fillRect(60, 80, 4, H - 160);
  ctx.font = '500 13px Arial'; ctx.fillStyle = '#c9a84c';
  ctx.fillText('ALAMIN NETWORK  ·  ' + (_currentArticle.category || '').toUpperCase(), 84, 110);

  ctx.font = 'bold 48px Georgia'; ctx.fillStyle = '#ffffff';
  var words = _currentArticle.title.split(' ');
  var line = '', ty = 200;
  for (var wi = 0; wi < words.length; wi++) {
    var test = line + words[wi] + ' ';
    if (ctx.measureText(test).width > W - 200 && line) { ctx.fillText(line.trim(), 84, ty); line = words[wi] + ' '; ty += 62; }
    else line = test;
    if (ty > 440) break;
  }
  if (line.trim()) ctx.fillText(line.trim(), 84, ty);

  ctx.font = '400 16px Arial'; ctx.fillStyle = 'rgba(244,241,235,.4)';
  ctx.fillText(fmt(_currentArticle.date) + '  ·  ' + readTime(_currentArticle.content || ''), 84, H - 80);
  ctx.fillStyle = '#c9a84c'; ctx.fillRect(0, H - 5, W, 5);

  var link = document.createElement('a');
  link.download = 'alamin-' + _currentArticle.id + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}
