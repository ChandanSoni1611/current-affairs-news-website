const CONFIG = {
  BASE_URL: "https://newsapi.org/v2/everything",
  API_KEY:  "4f0fd232ab8d4bd2bd6a37668ba6dafc",
  PAGE_SIZE: 12,   // cards shown per "Load More" click
};

const CATEGORIES = [
  { id: "india",         label: "🇮🇳 India",          q: "India",                   lang: "en" },
  { id: "general",       label: "🌐 Top News",         q: "breaking news",           lang: "en" },
  { id: "technology",    label: "💻 Technology",       q: "technology",              lang: "en" },
  { id: "sports",        label: "🏏 Sports",           q: "sports cricket",          lang: "en" },
  { id: "entertainment", label: "🎬 Entertainment",    q: "bollywood entertainment", lang: "en" },
  { id: "business",      label: "📈 Business",         q: "business economy",        lang: "en" },
  { id: "science",       label: "🔬 Science & Health", q: "science health",          lang: "en" },
];

const EMOJI_MAP = {
  india:"🇮🇳", general:"📰", technology:"💻",
  sports:"🏏", entertainment:"🎬", business:"📈", science:"🔬",
};

// ── STATE ──
let activeTab  = "india";
let cache      = {};
let pageIndex  = {};   // tracks how many cards shown per tab
let darkMode   = localStorage.getItem("darkMode") === "true";

// ── INIT ──
document.addEventListener("DOMContentLoaded", () => {
  applyDark();
  setDate();
  buildTabs();
  loadTab(activeTab);
  loadTicker();
  checkSession(); // ← this line
  document.getElementById("searchBtn").addEventListener("click", doSearch);
  document.getElementById("searchInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch();
  });
});

function checkSession() {
  const session = JSON.parse(localStorage.getItem("ca_session") || "{}");
  const headerRight = document.querySelector(".header-right");
  if (!headerRight) return;

  if (session.loggedIn) {
    const userEl = document.createElement("div");
    userEl.className = "user-badge";
    userEl.innerHTML = `
      <span class="user-name">👤 ${session.name.split(" ")[0]}</span>
      <button class="logout-btn" onclick="logout()">Logout</button>
    `;
    headerRight.prepend(userEl);
  } else {
    const loginEl = document.createElement("a");
    loginEl.href = "authentication/login.html";
    loginEl.className = "login-link";
    loginEl.textContent = "Login / Sign Up";
    headerRight.prepend(loginEl);
  }
}

function logout() {
  localStorage.removeItem("ca_session");
  window.location.reload();
}

// ── DARK MODE ──
function toggleDark() {
  darkMode = !darkMode;
  localStorage.setItem("darkMode", darkMode);
  applyDark();
}
function applyDark() {
  document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  const btn = document.getElementById("darkToggle");
  if (btn) btn.textContent = darkMode ? "☀️ Light Mode" : "🌙 Dark Mode";
}

// ── DATE ──
function setDate() {
  document.getElementById("dateBar").textContent =
    new Date().toLocaleDateString("en-IN", {
      weekday:"long", year:"numeric", month:"long", day:"numeric",
    });
}

// ── BREAKING NEWS TICKER ──
async function loadTicker() {
  try {
    const params = new URLSearchParams({
      apiKey:   CONFIG.API_KEY,
      q:        "India breaking news",
      language: "en",
      pageSize: 10,
      sortBy:   "publishedAt",
    });
    const res  = await fetch(`${CONFIG.BASE_URL}?${params}`);
    const data = await res.json();
    const headlines = (data.articles || [])
      .filter(a => a.title && a.title !== "[Removed]")
      .map(a => `📌 ${a.title}`)
      .join("   ·   ");

    if (headlines) {
      document.getElementById("tickerContent").textContent = headlines;
    }
  } catch (e) {
    document.getElementById("tickerContent").textContent = "📌 Stay tuned for the latest breaking news...";
  }
}

// ── BUILD TABS ──
function buildTabs() {
  const nav = document.getElementById("tabNav");
  CATEGORIES.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (cat.id === activeTab ? " active" : "");
    btn.textContent = cat.label;
    btn.dataset.id  = cat.id;
    btn.addEventListener("click", () => switchTab(cat.id));
    nav.appendChild(btn);
  });
}

// ── SWITCH TAB ──
function switchTab(id) {
  activeTab = id;
  document.querySelectorAll(".tab-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.id === id);
  });
  loadTab(id);
}

// ── FETCH NEWS ──
async function fetchNews(cat) {
  if (cache[cat.id]) return cache[cat.id];

  const params = new URLSearchParams({
    apiKey:   CONFIG.API_KEY,
    q:        cat.q,
    language: "en",
    pageSize: 30,
    sortBy:   "publishedAt",
  });

  const res  = await fetch(`${CONFIG.BASE_URL}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data     = await res.json();
  const articles = (data.articles || [])
    .filter((a) => a.title && a.title !== "[Removed]")
    .map((a) => ({
      title:       a.title,
      description: a.description,
      url:         a.url,
      image:       a.urlToImage,
      source:      a.source?.name,
      publishedAt: a.publishedAt,
    }));

  cache[cat.id]  = articles;
  pageIndex[cat.id] = CONFIG.PAGE_SIZE; // start showing first 9
  return articles;
}

// ── LOAD TAB ──
async function loadTab(id) {
  const main = document.getElementById("mainContent");
  main.innerHTML = `<div class="loader-wrap"><div class="spinner"></div><p>Loading news...</p></div>`;

  const cat = CATEGORIES.find((c) => c.id === id);
  try {
    const articles = await fetchNews(cat);
    if (!articles.length) {
      main.innerHTML = `<div class="error-box">No articles found. Try again later.</div>`;
      return;
    }
    renderArticles(articles, cat);
  } catch (e) {
    main.innerHTML = `<div class="error-box">❌ Could not load news.<br><small>${e.message}</small></div>`;
  }
}

// ── RENDER ARTICLES ──
function renderArticles(articles, cat) {
  const main  = document.getElementById("mainContent");
  const emoji = EMOJI_MAP[cat.id] || "📰";

  totalSlides  = Math.min(5, articles.length);
  currentSlide = 0;

  const rest  = articles.slice(5); // cards start after top 5
  const shown = Math.min(CONFIG.PAGE_SIZE, rest.length);
  const hasMore = shown < rest.length;

  main.innerHTML =
    buildHeroSlider(articles, cat, emoji) +
    `<div class="section-title">${cat.label} — Latest Stories</div>` +
    `<div class="news-grid" id="newsGrid">
       ${rest.slice(0, shown).map((a, i) => buildCard(a, i, emoji)).join("")}
     </div>` +
    (hasMore
      ? `<div class="load-more-wrap">
           <button class="load-more-btn" onclick="loadMore('${cat.id}')">Load More Articles</button>
         </div>`
      : "");

  // start auto slider after DOM is ready
  setTimeout(() => startSliderAuto(), 100);
}

// ── LOAD MORE ──
function loadMore(catId) {
  const cat      = CATEGORIES.find(c => c.id === catId);
  const articles = cache[catId];
  const emoji    = EMOJI_MAP[catId] || "📰";

  pageIndex[catId] = (pageIndex[catId] || CONFIG.PAGE_SIZE) + CONFIG.PAGE_SIZE;
  const shown    = pageIndex[catId];
  const rest     = articles.slice(5); // always skip first 5 (slider)
  const newCards = rest.slice(0, shown);
  const hasMore  = shown < rest.length;

  const grid = document.getElementById("newsGrid");
  if (grid) grid.innerHTML = newCards.map((a, i) => buildCard(a, i, emoji)).join("");

  const wrap = document.querySelector(".load-more-wrap");
  if (wrap) {
    wrap.innerHTML = hasMore
      ? `<button class="load-more-btn" onclick="loadMore('${catId}')">Load More Articles</button>`
      : `<p style="color:var(--text-muted);font-size:13px;text-align:center;">All articles loaded ✓</p>`;
  }
}

// ── SEARCH (main feed) ──
async function doSearch() {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) return;

  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  const main = document.getElementById("mainContent");
  main.innerHTML = `<div class="loader-wrap"><div class="spinner"></div><p>Searching for "${query}"...</p></div>`;

  try {
    const params = new URLSearchParams({
      apiKey:   CONFIG.API_KEY,
      q:        query,
      language: "en",
      pageSize: 31,
      sortBy:   "publishedAt",
    });
    const res  = await fetch(`${CONFIG.BASE_URL}?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data     = await res.json();
    const articles = (data.articles || [])
      .filter(a => a.title && a.title !== "[Removed]")
      .map(a => ({
        title:       a.title,
        description: a.description,
        url:         a.url,
        image:       a.urlToImage,
        source:      a.source?.name,
        publishedAt: a.publishedAt,
      }));

    if (!articles.length) {
      main.innerHTML = `<div class="error-box">No results for "<strong>${query}</strong>". Try a different keyword.</div>`;
      return;
    }

    const hero = articles[0];
    const rest = articles.slice(1);
    main.innerHTML =
      `<p class="search-label">Results for: <span>"${query}"</span></p>` +
      buildHero(hero, { id:"search", label:"🔍 Search" }, "🔍") +
      `<div class="section-title">🔍 Results — ${query}</div>` +
      `<div class="news-grid">${rest.map((a,i) => buildCard(a, i, "🔍")).join("")}</div>`;

  } catch (e) {
    main.innerHTML = `<div class="error-box">❌ Search failed.<br><small>${e.message}</small></div>`;
  }
}

// ── BUILD HERO SLIDER ──
function buildHeroSlider(articles, cat, emoji) {
  const top5 = articles.slice(0, 5);

  const slides = top5.map((article, i) => {
    const imgHtml = article.image
      ? `<img class="hero-img" src="${article.image}" alt="${escHtml(article.title)}"
           onerror="this.style.display='none'">`
      : `<div class="hero-img-placeholder">${emoji}</div>`;

    const tagLabel = cat.label.replace(/[^\w\s]/g, "").trim();
    const source   = escHtml(article.source?.name || article.source || "");
    const time     = timeAgo(article.publishedAt);

    return `
      <a class="hero-slide ${i === 0 ? 'active' : ''}"
         href="${article.url || '#'}" target="_blank" rel="noopener"
         data-index="${i}">
        ${imgHtml}
        <div class="hero-content">
          <span class="hero-tag">${tagLabel}</span>
          <h2 class="hero-title">${escHtml(article.title)}</h2>
          <p class="hero-desc">${escHtml(article.description || "")}</p>
          <p class="hero-meta"><span>${source}</span>&nbsp;·&nbsp;${time}</p>
        </div>
      </a>`;
  }).join("");

  const dots = top5.map((_, i) =>
    `<button class="hero-dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></button>`
  ).join("");

  return `
    <div class="hero-slider" id="heroSlider">
      <div class="hero-slides-wrap" id="heroSlidesWrap">
        ${slides}
      </div>
      <button class="hero-arrow left"  onclick="shiftSlide(-1)">&#8592;</button>
      <button class="hero-arrow right" onclick="shiftSlide(1)">&#8594;</button>
      <div class="hero-dots" id="heroDots">${dots}</div>
    </div>`;
}

// ── SLIDER STATE ──
let currentSlide  = 0;
let totalSlides   = 5;
let sliderTimer   = null;

function startSliderAuto() {
  stopSliderAuto();
  sliderTimer = setInterval(() => shiftSlide(1), 4000);
}
function stopSliderAuto() {
  if (sliderTimer) clearInterval(sliderTimer);
}

function goToSlide(index) {
  currentSlide = (index + totalSlides) % totalSlides;
  updateSlider();
  startSliderAuto(); // reset timer on manual click
}

function shiftSlide(dir) {
  currentSlide = (currentSlide + dir + totalSlides) % totalSlides;
  updateSlider();
}

function updateSlider() {
  // update slides
  document.querySelectorAll(".hero-slide").forEach((s, i) => {
    s.classList.toggle("active", i === currentSlide);
    s.classList.toggle("prev",   i === (currentSlide - 1 + totalSlides) % totalSlides);
  });
  // update dots
  document.querySelectorAll(".hero-dot").forEach((d, i) => {
    d.classList.toggle("active", i === currentSlide);
  });
}

// ── BUILD CARD ──
function buildCard(article, index, emoji) {
  const imgHtml = article.image
    ? `<img src="${article.image}" alt="${escHtml(article.title)}" loading="lazy"
         onerror="this.parentElement.innerHTML='<div class=\\'card-img-placeholder\\'>${emoji}</div>'">`
    : `<div class="card-img-placeholder">${emoji}</div>`;

  const source = escHtml(article.source?.name || article.source || "");
  const time   = timeAgo(article.publishedAt);

  return `
    <a class="news-card" href="${article.url || "#"}" target="_blank" rel="noopener">
      <div class="card-img-wrap">${imgHtml}</div>
      <div class="card-body">
        <div class="card-source">${source}</div>
        <div class="card-title">${escHtml(article.title)}</div>
        <div class="card-desc">${escHtml(article.description || "")}</div>
        <div class="card-meta">${time}</div>
      </div>
    </a>`;
}

// ── TIME AGO ──
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── ESCAPE HTML ──
function escHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}