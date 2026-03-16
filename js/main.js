/* ============================================================
   ALAMIN NETWORK — Main JavaScript
   Handles: homepage, category, article pages
   ============================================================ */

// ── UTILITIES ─────────────────────────────────────────────────

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function capFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Not found');
    return await res.json();
  } catch (e) {
    return null;
  }
}

// ── LIVE DATE ─────────────────────────────────────────────────

function setLiveDate() {
  const el = document.getElementById('live-date');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

// ── TICKER ───────────────────────────────────────────────────

let allArticles = [];

async function loadTicker() {
  const data = await fetchJSON('data/index.json');
  if (!data) return;
  allArticles = data;
  const el = document.getElementById('ticker-text');
  if (!el) return;
  const headlines = data.map((a, i) => `${i + 1}. ${a.title}`).join('   ·   ');
  el.textContent = headlines;
}

// ── SEARCH ───────────────────────────────────────────────────

function toggleSearch() {
  const bar = document.getElementById('searchBar');
  bar.classList.toggle('open');
  if (bar.classList.contains('open')) {
    document.getElementById('searchInput').focus();
  }
}

function doSearch(query) {
  const resultsEl = document.getElementById('searchResults');
  if (!query || query.length < 2) {
    resultsEl.innerHTML = '';
    return;
  }
  const q = query.toLowerCase();
  const hits = allArticles.filter(a =>
    a.title.toLowerCase().includes(q) ||
    (a.summary || '').toLowerCase().includes(q)
  );
  if (hits.length === 0) {
    resultsEl.innerHTML = '<div class="search-result-item" style="color:var(--muted)">No results found.</div>';
    return;
  }
  resultsEl.innerHTML = hits.slice(0, 6).map(a =>
    `<a class="search-result-item" href="report.html?id=${a.id}">
      <span style="color:var(--accent);font-size:0.6rem;letter-spacing:0.12em;text-transform:uppercase;margin-right:0.5rem">${capFirst(a.category)}</span>
      ${a.title}
    </a>`
  ).join('');
}

// ── NAV ACTIVE STATE ──────────────────────────────────────────

function setActiveNav() {
  const cat = getParam('cat');
  document.querySelectorAll('.nav-link[data-cat]').forEach(link => {
    link.classList.toggle('active', link.dataset.cat === cat);
  });
  if (window.location.pathname.includes('index') || window.location.pathname === '/') {
    const homeLink = document.querySelector('.nav-link:not([data-cat])');
    if (homeLink) homeLink.classList.add('active');
  }
}

// ── HOMEPAGE ──────────────────────────────────────────────────

async function initHomepage() {
  setLiveDate();
  await loadTicker();
  setActiveNav();

  const data = await fetchJSON('data/index.json');
  if (!data) return;

  allArticles = data;

  // Hero (first article)
  const hero = data[0];
  document.getElementById('hero-article').innerHTML = `
    <div class="art-cat">${capFirst(hero.category)}</div>
    <h2><a href="report.html?id=${hero.id}">${hero.title}</a></h2>
    <p class="art-summary">${hero.summary}</p>
    <div class="art-meta">${formatDate(hero.date)}</div>
    <br/>
    <a href="report.html?id=${hero.id}" class="read-more-btn">Read Full Report →</a>
  `;

  // Hero sidebar (articles 1–3)
  const sidebarEl = document.getElementById('hero-sidebar');
  sidebarEl.innerHTML = data.slice(1, 4).map(a => `
    <div class="sidebar-card">
      <div class="art-cat">${capFirst(a.category)}</div>
      <h3><a href="report.html?id=${a.id}">${a.title}</a></h3>
      <div class="art-meta">${formatDate(a.date)}</div>
    </div>
  `).join('');

  // Trending bar
  const trendingEl = document.getElementById('trending-list');
  trendingEl.innerHTML = data.slice(0, 6).map((a, i) =>
    `<a class="trending-item" href="report.html?id=${a.id}"><span>${i + 1}</span>${a.title}</a>`
  ).join('');

  // Main grid (all articles)
  const grid = document.getElementById('news-grid');
  grid.innerHTML = data.map(a => `
    <div class="news-card">
      <div class="art-cat">${capFirst(a.category)}</div>
      <h3><a href="report.html?id=${a.id}">${a.title}</a></h3>
      ${a.summary ? `<p class="art-summary">${a.summary}</p>` : ''}
      <div class="art-meta">${formatDate(a.date)}</div>
      <a href="report.html?id=${a.id}" class="card-link">Continue Reading →</a>
    </div>
  `).join('');

  // Category strips
  loadCategoryStrip('national', 'strip-national-list');
  loadCategoryStrip('sports', 'strip-sports-list');
}

async function loadCategoryStrip(cat, elId) {
  const data = await fetchJSON(`data/${cat}.json`);
  if (!data) return;
  const el = document.getElementById(elId);
  el.innerHTML = data.slice(0, 4).map((a, i) => `
    <div class="strip-item">
      <span class="strip-num">${String(i + 1).padStart(2, '0')}</span>
      <h4><a href="report.html?id=${a.id}">${a.title}</a></h4>
      <span class="strip-date">${formatDate(a.date)}</span>
    </div>
  `).join('');
}

// ── CATEGORY PAGE ─────────────────────────────────────────────

async function initCategoryPage() {
  setLiveDate();
  await loadTicker();
  setActiveNav();

  const cat = getParam('cat') || 'national';
  const label = capFirst(cat);

  document.title = `${label} — Alamin Network`;
  document.getElementById('cat-label-large').textContent = 'Category';
  document.getElementById('cat-page-title').textContent = label;

  const data = await fetchJSON(`data/${cat}.json`);
  if (!data) {
    document.getElementById('cat-list').innerHTML = '<p style="color:var(--muted);text-align:center;padding:3rem">No articles found.</p>';
    return;
  }

  allArticles = data;

  document.getElementById('cat-list').innerHTML = data.map((a, i) => `
    <a href="report.html?id=${a.id}" class="list-item" style="display:grid;grid-template-columns:60px 1fr auto;align-items:center;gap:1.5rem">
      <div class="list-num">${String(i + 1).padStart(2, '0')}</div>
      <div class="list-item-body">
        <h3>${a.title}</h3>
        <div class="art-meta">${formatDate(a.date)}</div>
      </div>
      <div class="list-arrow">›</div>
    </a>
  `).join('');
}

// ── ARTICLE PAGE ──────────────────────────────────────────────

let currentArticle = null;

async function initArticlePage() {
  setLiveDate();
  await loadTicker();
  setActiveNav();

  const id = getParam('id');
  if (!id) {
    document.getElementById('article-body').innerHTML = '<p style="color:var(--muted)">Article not found.</p>';
    return;
  }

  const article = await fetchJSON(`articles/${id}.json`);
  if (!article) {
    document.getElementById('article-body').innerHTML = '<p style="color:var(--muted)">Article not found.</p>';
    return;
  }

  currentArticle = article;
  document.title = `${article.title} — Alamin Network`;

  document.getElementById('article-body').innerHTML = `
    <div class="article-cat-badge">${article.category}</div>
    <h1 class="article-title">${article.title}</h1>
    <div class="article-meta-bar">
      <span>${formatDate(article.date)}</span>
      <span class="meta-dot">·</span>
      <span>${article.category}</span>
      <span class="meta-dot">·</span>
      <span>Alamin Network</span>
    </div>
    <div class="article-content">${article.content}</div>
  `;

  // Load related articles
  const allData = await fetchJSON('data/index.json');
  if (allData) {
    allArticles = allData;
    const related = allData.filter(a => a.id !== id).slice(0, 5);
    document.getElementById('related-list').innerHTML = related.map(a =>
      `<a href="report.html?id=${a.id}" class="related-item">${a.title}</a>`
    ).join('');
  }
}

// ── SHARE ─────────────────────────────────────────────────────

function shareTo(platform) {
  const url = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(document.title);
  const links = {
    twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`
  };
  if (links[platform]) window.open(links[platform], '_blank', 'noopener');
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    const btn = document.querySelector('.share-btn:nth-child(3)');
    if (btn) {
      btn.textContent = '✓ Copied!';
      setTimeout(() => btn.textContent = 'Copy Link', 2000);
    }
  });
}

// ── DOWNLOAD SUMMARY PNG ───────────────────────────────────────

function downloadSummary() {
  if (!currentArticle) return;
  const canvas = document.getElementById('summary-canvas');
  const ctx = canvas.getContext('2d');

  const W = 1200, H = 630;
  canvas.width = W;
  canvas.height = H;

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#060c1a');
  bg.addColorStop(1, '#0f2040');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Gold accent bar
  ctx.fillStyle = '#c9a84c';
  ctx.fillRect(60, 60, 4, 510);

  // Network name
  ctx.font = 'bold 28px Georgia, serif';
  ctx.fillStyle = '#c9a84c';
  ctx.fillText('ALAMIN NETWORK', 80, 110);

  // Category
  ctx.font = '16px Arial, sans-serif';
  ctx.fillStyle = 'rgba(201,168,76,0.7)';
  ctx.fillText(currentArticle.category.toUpperCase(), 80, 150);

  // Title — word wrap
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillStyle = '#ffffff';
  const words = currentArticle.title.split(' ');
  let line = '', y = 220;
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > W - 160 && line !== '') {
      ctx.fillText(line.trim(), 80, y);
      line = word + ' ';
      y += 56;
    } else { line = test; }
  }
  ctx.fillText(line.trim(), 80, y);

  // Date
  ctx.font = '18px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText(formatDate(currentArticle.date) + '  ·  alaminnetwork.com', 80, H - 60);

  // Bottom border
  ctx.fillStyle = '#c9a84c';
  ctx.fillRect(0, H - 4, W, 4);

  // Download
  const link = document.createElement('a');
  link.download = `alamin-${currentArticle.id}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ── KEYBOARD SHORTCUT ─────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
    e.preventDefault();
    toggleSearch();
  }
  if (e.key === 'Escape') {
    const bar = document.getElementById('searchBar');
    if (bar) bar.classList.remove('open');
  }
});
