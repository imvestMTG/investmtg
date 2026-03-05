/* investMTG App */

// ===== STATE MANAGEMENT (in-memory only) =====
var AppState = {
  portfolio: [],
  cart: [],
  searchResults: [],
  currentCard: null,
  autocompleteTimer: null,
  lastRequestTime: 0,
  searchQuery: '',
  tickerCards: []
};

// ===== SCRYFALL API =====
var API = {
  BASE: 'https://api.scryfall.com',
  MIN_INTERVAL: 100,

  rateLimit: function() {
    var now = Date.now();
    var elapsed = now - AppState.lastRequestTime;
    if (elapsed < this.MIN_INTERVAL) {
      return new Promise(function(resolve) {
        setTimeout(resolve, API.MIN_INTERVAL - elapsed);
      });
    }
    return Promise.resolve();
  },

  fetch: function(url) {
    return this.rateLimit().then(function() {
      AppState.lastRequestTime = Date.now();
      return fetch(url);
    }).then(function(res) {
      if (!res.ok) { throw new Error('API error: ' + res.status); }
      return res.json();
    });
  },

  searchCards: function(query) {
    return this.fetch(this.BASE + '/cards/search?q=' + encodeURIComponent(query) + '+has%3Ausd&order=usd&dir=desc');
  },

  getCard: function(id) {
    return this.fetch(this.BASE + '/cards/' + id);
  },

  randomCard: function() {
    return this.fetch(this.BASE + '/cards/random?q=usd%3E0.5+has%3Aimage');
  },

  autocomplete: function(query) {
    return this.fetch(this.BASE + '/cards/autocomplete?q=' + encodeURIComponent(query));
  }
};

// ===== UTILITY FUNCTIONS =====
function formatUSD(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) { return 'N/A'; }
  return '$' + Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function getCardPrice(card) {
  if (!card || !card.prices) { return 0; }
  return parseFloat(card.prices.usd) || parseFloat(card.prices.usd_foil) || 0;
}

function generateMockPriceHistory(currentPrice, days) {
  if (!days) { days = 30; }
  var prices = [];
  var price = currentPrice * (0.85 + Math.random() * 0.15);
  for (var i = 0; i < days; i++) {
    var change = (Math.random() - 0.48) * currentPrice * 0.05;
    price = Math.max(price + change, currentPrice * 0.5);
    price = Math.min(price, currentPrice * 1.5);
    prices.push(Math.round(price * 100) / 100);
  }
  prices[days - 1] = currentPrice;
  return prices;
}

function generateMockChange() {
  var change = (Math.random() - 0.45) * 15;
  return Math.round(change * 10) / 10;
}

function getCardImage(card) {
  if (!card) { return ''; }
  if (card.image_uris) {
    return card.image_uris.normal || card.image_uris.small || '';
  }
  if (card.card_faces && card.card_faces[0] && card.card_faces[0].image_uris) {
    return card.card_faces[0].image_uris.normal || card.card_faces[0].image_uris.small || '';
  }
  return '';
}

function getCardImageSmall(card) {
  if (!card) { return ''; }
  if (card.image_uris) {
    return card.image_uris.small || card.image_uris.normal || '';
  }
  if (card.card_faces && card.card_faces[0] && card.card_faces[0].image_uris) {
    return card.card_faces[0].image_uris.small || card.card_faces[0].image_uris.normal || '';
  }
  return '';
}

function escapeHTML(str) {
  if (!str) { return ''; }
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ===== ROUTER =====
function navigateTo(hash) {
  window.location.hash = hash;
}

function getCurrentRoute() {
  var hash = window.location.hash.slice(1) || '';
  if (hash.startsWith('card/')) {
    return { page: 'card', id: hash.slice(5) };
  }
  if (hash === 'search') { return { page: 'search' }; }
  if (hash === 'portfolio') { return { page: 'portfolio' }; }
  if (hash === 'cart') { return { page: 'cart' }; }
  return { page: 'home' };
}

function handleRoute() {
  var route = getCurrentRoute();
  var views = document.querySelectorAll('.page-view');
  views.forEach(function(v) {
    v.classList.remove('active');
  });

  var navLinks = document.querySelectorAll('.nav-links a');
  navLinks.forEach(function(l) { l.classList.remove('active'); });

  switch (route.page) {
    case 'home':
      showView('home-view');
      break;
    case 'search':
      showView('search-view');
      loadSearchPage();
      setActiveNav('nav-search');
      break;
    case 'card':
      showView('card-view');
      loadCardDetail(route.id);
      break;
    case 'portfolio':
      showView('portfolio-view');
      renderPortfolio();
      setActiveNav('nav-portfolio');
      break;
    case 'cart':
      showView('cart-view');
      renderCart();
      setActiveNav('nav-cart');
      break;
    default:
      showView('home-view');
  }

  // Close mobile menu
  var navLinksEl = document.querySelector('.nav-links');
  if (navLinksEl) { navLinksEl.classList.remove('open'); }
  window.scrollTo(0, 0);
}

function showView(id) {
  var el = document.getElementById(id);
  if (el) {
    el.style.display = '';
    requestAnimationFrame(function() {
      el.classList.add('active');
    });
  }
}

function setActiveNav(id) {
  var el = document.getElementById(id);
  if (el) { el.classList.add('active'); }
}

// ===== THEME TOGGLE =====
function initTheme() {
  var toggle = document.querySelector('[data-theme-toggle]');
  var root = document.documentElement;
  var theme = 'dark'; // Default to dark
  root.setAttribute('data-theme', theme);

  if (toggle) {
    toggle.addEventListener('click', function() {
      theme = theme === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', theme);
      updateThemeIcon(toggle, theme);
    });
    updateThemeIcon(toggle, theme);
  }
}

function updateThemeIcon(toggle, theme) {
  toggle.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode');
  toggle.innerHTML = theme === 'dark'
    ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
    : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
}

// ===== TICKER =====
function initTicker() {
  var tickerData = [
    { name: 'Black Lotus', price: 42500.00, change: 2.3 },
    { name: 'Mox Sapphire', price: 8200.00, change: -1.2 },
    { name: 'Ancestral Recall', price: 7800.00, change: 0.8 },
    { name: 'Time Walk', price: 6500.00, change: 1.5 },
    { name: 'Underground Sea', price: 850.00, change: -0.4 },
    { name: 'Force of Will', price: 89.99, change: 3.1 },
    { name: 'Ragavan', price: 62.50, change: -2.8 },
    { name: 'The One Ring', price: 45.00, change: 5.2 },
    { name: 'Mana Crypt', price: 185.00, change: -1.0 },
    { name: 'Jace, the Mind Sculptor', price: 38.00, change: 0.6 },
    { name: 'Liliana of the Veil', price: 25.50, change: -3.4 },
    { name: 'Scalding Tarn', price: 22.00, change: 1.9 },
    { name: 'Wrenn and Six', price: 55.00, change: 2.1 },
    { name: 'Doubling Season', price: 42.00, change: -0.7 }
  ];

  var track = document.getElementById('ticker-track');
  if (!track) { return; }

  var itemsHTML = '';
  tickerData.forEach(function(t) {
    var changeClass = t.change >= 0 ? 'up' : 'down';
    var arrow = t.change >= 0 ? '▲' : '▼';
    itemsHTML += '<span class="ticker-item">' +
      '<span class="ticker-name">' + escapeHTML(t.name) + '</span>' +
      '<span class="ticker-price">' + formatUSD(t.price) + '</span>' +
      '<span class="' + changeClass + '">' + arrow + ' ' + Math.abs(t.change).toFixed(1) + '%</span>' +
      '</span>';
  });
  // Duplicate for seamless loop
  track.innerHTML = itemsHTML + itemsHTML;
}

// ===== SEARCH =====
function loadSearchPage() {
  var input = document.getElementById('search-page-input');
  if (input && AppState.searchQuery) {
    input.value = AppState.searchQuery;
  }
  if (AppState.searchResults.length > 0) {
    renderSearchResults(AppState.searchResults);
  } else {
    loadTrendingCards();
  }
}

function loadTrendingCards() {
  var grid = document.getElementById('search-results-grid');
  if (!grid) { return; }
  grid.innerHTML = renderSkeletonCards(8);

  API.searchCards('is:staple usd>5 has:image')
    .then(function(data) {
      var cards = data.data || [];
      AppState.searchResults = cards.slice(0, 20);
      renderSearchResults(AppState.searchResults);
    })
    .catch(function() {
      grid.innerHTML = '<div class="empty-state"><h3>Unable to load cards</h3><p>Please try searching for a specific card.</p></div>';
    });
}

function performSearch(query) {
  if (!query || query.length < 2) { return; }
  AppState.searchQuery = query;

  var grid = document.getElementById('search-results-grid');
  if (!grid) { return; }
  grid.innerHTML = renderSkeletonCards(8);

  API.searchCards(query)
    .then(function(data) {
      var cards = data.data || [];
      AppState.searchResults = cards.slice(0, 30);
      renderSearchResults(AppState.searchResults);
    })
    .catch(function() {
      grid.innerHTML = '<div class="empty-state"><h3>No cards found</h3><p>Try a different search term.</p></div>';
    });
}

function renderSearchResults(cards) {
  var grid = document.getElementById('search-results-grid');
  if (!grid) { return; }

  if (!cards || cards.length === 0) {
    grid.innerHTML = '<div class="empty-state"><h3>No cards found</h3><p>Try a different search term.</p></div>';
    return;
  }

  grid.innerHTML = cards.map(function(card) {
    var price = getCardPrice(card);
    var change = generateMockChange();
    var changeClass = change >= 0 ? 'price-up' : 'price-down';
    var arrow = change >= 0 ? '▲' : '▼';
    var img = getCardImageSmall(card);
    return '<div class="mtg-card" onclick="navigateTo(\'#card/' + card.id + '\')">' +
      '<div class="mtg-card-image">' +
        (img ? '<img src="' + escapeHTML(img) + '" alt="' + escapeHTML(card.name) + '" loading="lazy">' : '') +
      '</div>' +
      '<div class="mtg-card-info">' +
        '<div class="mtg-card-name">' + escapeHTML(card.name) + '</div>' +
        '<div class="mtg-card-set">' + escapeHTML(card.set_name || '') + '</div>' +
        '<div class="mtg-card-price-row">' +
          '<span class="mtg-card-price">' + (price > 0 ? formatUSD(price) : 'N/A') + '</span>' +
          (price > 0 ? '<span class="mtg-card-change ' + changeClass + '">' + arrow + ' ' + Math.abs(change).toFixed(1) + '%</span>' : '') +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function renderSkeletonCards(count) {
  var html = '';
  for (var i = 0; i < count; i++) {
    html += '<div class="skeleton-card">' +
      '<div class="skeleton skeleton-image"></div>' +
      '<div style="padding:var(--space-3)">' +
        '<div class="skeleton skeleton-text" style="width:70%"></div>' +
        '<div class="skeleton skeleton-text" style="width:40%"></div>' +
        '<div class="skeleton skeleton-text" style="width:50%"></div>' +
      '</div>' +
    '</div>';
  }
  return html;
}

// ===== AUTOCOMPLETE =====
function initAutocomplete(inputId, dropdownId) {
  var input = document.getElementById(inputId);
  var dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) { return; }

  input.addEventListener('input', function() {
    var query = input.value.trim();
    clearTimeout(AppState.autocompleteTimer);

    if (query.length < 2) {
      dropdown.classList.remove('open');
      return;
    }

    AppState.autocompleteTimer = setTimeout(function() {
      API.autocomplete(query)
        .then(function(data) {
          var names = data.data || [];
          if (names.length === 0) {
            dropdown.classList.remove('open');
            return;
          }
          dropdown.innerHTML = names.slice(0, 8).map(function(name) {
            return '<div class="autocomplete-item" data-name="' + escapeHTML(name) + '">' + escapeHTML(name) + '</div>';
          }).join('');
          dropdown.classList.add('open');
        })
        .catch(function() {
          dropdown.classList.remove('open');
        });
    }, 200);
  });

  dropdown.addEventListener('click', function(e) {
    var item = e.target.closest('.autocomplete-item');
    if (item) {
      var name = item.getAttribute('data-name');
      input.value = name;
      dropdown.classList.remove('open');
      if (inputId === 'hero-search-input') {
        navigateTo('#search');
        setTimeout(function() {
          var searchInput = document.getElementById('search-page-input');
          if (searchInput) { searchInput.value = name; }
          performSearch(name);
        }, 100);
      } else {
        performSearch(name);
      }
    }
  });

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      dropdown.classList.remove('open');
      var q = input.value.trim();
      if (inputId === 'hero-search-input') {
        navigateTo('#search');
        setTimeout(function() {
          var searchInput = document.getElementById('search-page-input');
          if (searchInput) { searchInput.value = q; }
          performSearch(q);
        }, 100);
      } else {
        performSearch(q);
      }
    }
  });

  document.addEventListener('click', function(e) {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });
}

// ===== CARD DETAIL =====
var priceChart = null;

function loadCardDetail(id) {
  var container = document.getElementById('card-detail-content');
  if (!container) { return; }

  container.innerHTML = '<div class="card-detail-grid">' +
    '<div class="skeleton skeleton-image" style="aspect-ratio:745/1040;border-radius:var(--radius-xl)"></div>' +
    '<div>' +
      '<div class="skeleton skeleton-heading" style="width:60%"></div>' +
      '<div class="skeleton skeleton-text" style="width:40%"></div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-3);margin-top:var(--space-6)">' +
        '<div class="skeleton" style="height:70px;border-radius:var(--radius-lg)"></div>' +
        '<div class="skeleton" style="height:70px;border-radius:var(--radius-lg)"></div>' +
        '<div class="skeleton" style="height:70px;border-radius:var(--radius-lg)"></div>' +
      '</div>' +
    '</div>' +
  '</div>';

  API.getCard(id)
    .then(function(card) {
      AppState.currentCard = card;
      renderCardDetail(card);
    })
    .catch(function() {
      container.innerHTML = '<div class="empty-state"><h3>Card not found</h3><p>This card may not exist or the API is unavailable.</p>' +
        '<button class="btn btn-primary" onclick="navigateTo(\'#search\')">Back to Search</button></div>';
    });
}

function renderCardDetail(card) {
  var container = document.getElementById('card-detail-content');
  if (!container) { return; }

  var img = getCardImage(card);
  var price = getCardPrice(card);
  var foilPrice = parseFloat(card.prices.usd_foil) || 0;
  var low = price > 0 ? Math.round(price * 0.85 * 100) / 100 : 0;
  var high = price > 0 ? Math.round(price * 1.18 * 100) / 100 : 0;

  var legalitiesHTML = '';
  if (card.legalities) {
    var formats = ['standard', 'modern', 'legacy', 'vintage', 'commander', 'pioneer', 'pauper'];
    formats.forEach(function(fmt) {
      var status = card.legalities[fmt];
      var cls = status === 'legal' ? 'legality-legal' : 'legality-not-legal';
      var label = fmt.charAt(0).toUpperCase() + fmt.slice(1);
      if (status === 'legal' || status === 'not_legal' || status === 'banned' || status === 'restricted') {
        legalitiesHTML += '<span class="legality-badge ' + cls + '">' + label + (status !== 'legal' ? ' (' + status.replace('_', ' ') + ')' : '') + '</span>';
      }
    });
  }

  container.innerHTML =
    '<a class="back-link" onclick="history.back()">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>' +
      'Back' +
    '</a>' +
    '<div class="card-detail-grid">' +
      '<div class="card-detail-image">' +
        (img ? '<img src="' + escapeHTML(img) + '" alt="' + escapeHTML(card.name) + '">' : '<div style="aspect-ratio:745/1040;background:var(--color-surface-offset);border-radius:var(--radius-xl)"></div>') +
      '</div>' +
      '<div class="card-detail-info">' +
        '<h1>' + escapeHTML(card.name) + '</h1>' +
        '<div class="card-detail-set">' + escapeHTML(card.set_name || '') + ' &middot; ' + escapeHTML(card.rarity || '') + ' &middot; ' + escapeHTML(card.type_line || '') + '</div>' +

        '<div class="price-breakdown">' +
          '<div class="price-box"><div class="price-box-label">Market</div><div class="price-box-value">' + (price > 0 ? formatUSD(price) : 'N/A') + '</div></div>' +
          '<div class="price-box"><div class="price-box-label">Low</div><div class="price-box-value">' + (low > 0 ? formatUSD(low) : 'N/A') + '</div></div>' +
          '<div class="price-box"><div class="price-box-label">High</div><div class="price-box-value">' + (high > 0 ? formatUSD(high) : 'N/A') + '</div></div>' +
          '<div class="price-box"><div class="price-box-label">Foil</div><div class="price-box-value">' + (foilPrice > 0 ? formatUSD(foilPrice) : 'N/A') + '</div></div>' +
        '</div>' +

        '<div class="chart-container">' +
          '<h3>30-Day Price History</h3>' +
          '<canvas id="price-chart"></canvas>' +
        '</div>' +

        '<div class="card-actions">' +
          '<button class="btn btn-primary" onclick="addToPortfolio(\'' + card.id + '\')">Add to Portfolio</button>' +
          '<button class="btn btn-secondary" onclick="addToCart(\'' + card.id + '\')">Add to Cart</button>' +
        '</div>' +

        (legalitiesHTML ? '<h3 style="font-family:var(--font-display);font-size:var(--text-sm);font-weight:600;margin-bottom:var(--space-2)">Format Legality</h3><div class="legality-grid">' + legalitiesHTML + '</div>' : '') +
      '</div>' +
    '</div>';

  // Render chart
  if (price > 0) {
    renderPriceChart(price);
  }
}

function renderPriceChart(currentPrice) {
  var canvas = document.getElementById('price-chart');
  if (!canvas) { return; }

  if (priceChart) { priceChart.destroy(); }

  var priceHistory = generateMockPriceHistory(currentPrice, 30);
  var labels = [];
  for (var i = 29; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    labels.push((d.getMonth() + 1) + '/' + d.getDate());
  }

  var ctx = canvas.getContext('2d');
  var gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(212, 168, 67, 0.3)');
  gradient.addColorStop(1, 'rgba(212, 168, 67, 0.0)');

  var computedStyle = getComputedStyle(document.documentElement);
  var textMuted = computedStyle.getPropertyValue('--color-text-muted').trim() || '#8B8D94';
  var textFaint = computedStyle.getPropertyValue('--color-text-faint').trim() || '#52545A';
  var borderColor = computedStyle.getPropertyValue('--color-border').trim() || '#2A2F3A';

  priceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Price (USD)',
        data: priceHistory,
        borderColor: '#D4A843',
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#D4A843',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1A1E27',
          titleColor: '#E8E6E1',
          bodyColor: '#D4A843',
          borderColor: '#2A2F3A',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return formatUSD(context.parsed.y);
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: borderColor, drawBorder: false },
          ticks: {
            color: textFaint,
            font: { family: 'Satoshi, sans-serif', size: 11 },
            maxTicksLimit: 7
          }
        },
        y: {
          grid: { color: borderColor, drawBorder: false },
          ticks: {
            color: textMuted,
            font: { family: 'Satoshi, sans-serif', size: 11 },
            callback: function(value) {
              return '$' + value.toFixed(2);
            }
          }
        }
      }
    }
  });
}

// ===== PORTFOLIO =====
function addToPortfolio(cardId) {
  var existing = AppState.portfolio.find(function(p) { return p.id === cardId; });
  if (existing) {
    existing.quantity += 1;
  } else {
    var card = AppState.currentCard;
    if (!card) { return; }
    var price = getCardPrice(card);
    AppState.portfolio.push({
      id: cardId,
      name: card.name,
      set_name: card.set_name,
      image: getCardImageSmall(card),
      avgCost: price,
      currentPrice: price,
      quantity: 1
    });
  }
  showToast('Added to portfolio');
}

function removeFromPortfolio(cardId) {
  AppState.portfolio = AppState.portfolio.filter(function(p) { return p.id !== cardId; });
  renderPortfolio();
}

function renderPortfolio() {
  var content = document.getElementById('portfolio-content');
  if (!content) { return; }

  if (AppState.portfolio.length === 0) {
    content.innerHTML =
      '<h2 class="page-heading">Portfolio</h2>' +
      '<div class="empty-state">' +
        '<div class="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div>' +
        '<h3>No cards in your portfolio</h3>' +
        '<p>Search for cards and add them to track your investment.</p>' +
        '<button class="btn btn-primary" onclick="navigateTo(\'#search\')">Browse Cards</button>' +
      '</div>';
    return;
  }

  var totalValue = 0;
  var totalCost = 0;
  AppState.portfolio.forEach(function(p) {
    // Simulate slight price change
    p.currentPrice = p.avgCost * (0.95 + Math.random() * 0.15);
    totalValue += p.currentPrice * p.quantity;
    totalCost += p.avgCost * p.quantity;
  });

  var totalChange = totalValue - totalCost;
  var totalChangePct = totalCost > 0 ? (totalChange / totalCost * 100) : 0;
  var dayChange = totalValue * (Math.random() * 0.02 - 0.005);
  var dayChangePct = totalValue > 0 ? (dayChange / totalValue * 100) : 0;

  var kpisHTML =
    '<div class="portfolio-kpis">' +
      '<div class="kpi-card"><div class="kpi-label">Total Value</div><div class="kpi-value">' + formatUSD(totalValue) + '</div>' +
        '<div class="kpi-delta ' + (totalChange >= 0 ? 'price-up' : 'price-down') + '">' + (totalChange >= 0 ? '▲' : '▼') + ' ' + formatUSD(Math.abs(totalChange)) + ' (' + Math.abs(totalChangePct).toFixed(1) + '%)</div></div>' +
      '<div class="kpi-card"><div class="kpi-label">Day Change</div><div class="kpi-value">' + (dayChange >= 0 ? '+' : '') + formatUSD(dayChange) + '</div>' +
        '<div class="kpi-delta ' + (dayChange >= 0 ? 'price-up' : 'price-down') + '">' + (dayChange >= 0 ? '▲' : '▼') + ' ' + Math.abs(dayChangePct).toFixed(1) + '% today</div></div>' +
      '<div class="kpi-card"><div class="kpi-label">Total Cost</div><div class="kpi-value">' + formatUSD(totalCost) + '</div>' +
        '<div class="kpi-delta" style="color:var(--color-text-muted)">' + AppState.portfolio.length + ' unique cards</div></div>' +
    '</div>';

  var tableHTML =
    '<div class="portfolio-table-wrapper">' +
      '<table class="portfolio-table">' +
        '<thead><tr>' +
          '<th>Card</th><th>Qty</th><th>Avg Cost</th><th>Current</th><th>Gain/Loss</th><th>%</th><th></th>' +
        '</tr></thead>' +
        '<tbody>' +
        AppState.portfolio.map(function(p) {
          var gain = (p.currentPrice - p.avgCost) * p.quantity;
          var gainPct = p.avgCost > 0 ? ((p.currentPrice - p.avgCost) / p.avgCost * 100) : 0;
          var cls = gain >= 0 ? 'price-up' : 'price-down';
          return '<tr>' +
            '<td class="card-name-cell" onclick="navigateTo(\'#card/' + p.id + '\')">' + escapeHTML(p.name) + '</td>' +
            '<td>' + p.quantity + '</td>' +
            '<td>' + formatUSD(p.avgCost) + '</td>' +
            '<td>' + formatUSD(p.currentPrice) + '</td>' +
            '<td class="' + cls + '">' + (gain >= 0 ? '+' : '') + formatUSD(gain) + '</td>' +
            '<td class="' + cls + '">' + (gain >= 0 ? '▲' : '▼') + ' ' + Math.abs(gainPct).toFixed(1) + '%</td>' +
            '<td><button class="btn btn-ghost btn-sm" onclick="removeFromPortfolio(\'' + p.id + '\')">Remove</button></td>' +
          '</tr>';
        }).join('') +
        '</tbody>' +
      '</table>' +
    '</div>';

  content.innerHTML =
    '<h2 class="page-heading">Portfolio</h2>' +
    kpisHTML +
    '<div class="chart-container" style="margin-bottom:var(--space-6)">' +
      '<h3>Portfolio Value (30 Days)</h3>' +
      '<canvas id="portfolio-chart" style="height:250px"></canvas>' +
    '</div>' +
    tableHTML;

  // Portfolio chart
  renderPortfolioChart(totalValue);
}

var portfolioChart = null;

function renderPortfolioChart(totalValue) {
  var canvas = document.getElementById('portfolio-chart');
  if (!canvas) { return; }
  if (portfolioChart) { portfolioChart.destroy(); }

  var values = generateMockPriceHistory(totalValue, 30);
  var labels = [];
  for (var i = 29; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    labels.push((d.getMonth() + 1) + '/' + d.getDate());
  }

  var ctx = canvas.getContext('2d');
  var gradient = ctx.createLinearGradient(0, 0, 0, 250);
  gradient.addColorStop(0, 'rgba(212, 168, 67, 0.25)');
  gradient.addColorStop(1, 'rgba(212, 168, 67, 0.0)');

  portfolioChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Portfolio Value',
        data: values,
        borderColor: '#D4A843',
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#D4A843'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1A1E27',
          titleColor: '#E8E6E1',
          bodyColor: '#D4A843',
          borderColor: '#2A2F3A',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: function(context) { return formatUSD(context.parsed.y); }
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#2A2F3A', drawBorder: false },
          ticks: { color: '#52545A', font: { family: 'Satoshi, sans-serif', size: 11 }, maxTicksLimit: 7 }
        },
        y: {
          grid: { color: '#2A2F3A', drawBorder: false },
          ticks: {
            color: '#8B8D94', font: { family: 'Satoshi, sans-serif', size: 11 },
            callback: function(value) { return '$' + value.toFixed(0); }
          }
        }
      }
    }
  });
}

// ===== CART =====
function addToCart(cardId) {
  var existing = AppState.cart.find(function(c) { return c.id === cardId; });
  if (existing) {
    existing.quantity += 1;
  } else {
    var card = AppState.currentCard;
    if (!card) { return; }
    var price = getCardPrice(card);
    AppState.cart.push({
      id: cardId,
      name: card.name,
      set_name: card.set_name,
      image: getCardImageSmall(card),
      price: price,
      quantity: 1
    });
  }
  updateCartBadge();
  showToast('Added to cart');
}

function updateCartQty(cardId, delta) {
  var item = AppState.cart.find(function(c) { return c.id === cardId; });
  if (!item) { return; }
  item.quantity += delta;
  if (item.quantity <= 0) {
    AppState.cart = AppState.cart.filter(function(c) { return c.id !== cardId; });
  }
  updateCartBadge();
  renderCart();
}

function removeFromCart(cardId) {
  AppState.cart = AppState.cart.filter(function(c) { return c.id !== cardId; });
  updateCartBadge();
  renderCart();
}

function updateCartBadge() {
  var badge = document.getElementById('cart-count');
  if (!badge) { return; }
  var count = AppState.cart.reduce(function(sum, c) { return sum + c.quantity; }, 0);
  badge.textContent = count > 0 ? count : '';
  badge.setAttribute('data-count', count);
}

function renderCart() {
  var content = document.getElementById('cart-content');
  if (!content) { return; }

  if (AppState.cart.length === 0) {
    content.innerHTML =
      '<h2 class="page-heading">Cart</h2>' +
      '<div class="empty-state">' +
        '<div class="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></div>' +
        '<h3>Your cart is empty</h3>' +
        '<p>Browse cards and add them to your cart.</p>' +
        '<button class="btn btn-primary" onclick="navigateTo(\'#search\')">Browse Cards</button>' +
      '</div>';
    return;
  }

  var subtotal = 0;
  AppState.cart.forEach(function(c) { subtotal += c.price * c.quantity; });
  var shipping = subtotal > 100 ? 0 : 5.99;
  var total = subtotal + shipping;

  var itemsHTML = AppState.cart.map(function(c) {
    return '<div class="cart-item">' +
      '<div class="cart-item-image">' +
        (c.image ? '<img src="' + escapeHTML(c.image) + '" alt="' + escapeHTML(c.name) + '" loading="lazy">' : '') +
      '</div>' +
      '<div class="cart-item-details">' +
        '<div class="cart-item-name">' + escapeHTML(c.name) + '</div>' +
        '<div class="cart-item-set">' + escapeHTML(c.set_name || '') + '</div>' +
      '</div>' +
      '<div class="cart-item-controls">' +
        '<button class="qty-btn" onclick="updateCartQty(\'' + c.id + '\', -1)">-</button>' +
        '<span class="qty-value">' + c.quantity + '</span>' +
        '<button class="qty-btn" onclick="updateCartQty(\'' + c.id + '\', 1)">+</button>' +
      '</div>' +
      '<div class="cart-item-price">' + formatUSD(c.price * c.quantity) + '</div>' +
      '<button class="cart-item-remove" onclick="removeFromCart(\'' + c.id + '\')" aria-label="Remove">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
      '</button>' +
    '</div>';
  }).join('');

  content.innerHTML =
    '<h2 class="page-heading">Cart</h2>' +
    '<div class="cart-grid">' +
      '<div class="cart-items">' + itemsHTML + '</div>' +
      '<div class="order-summary">' +
        '<h3>Order Summary</h3>' +
        '<div class="summary-row"><span>Subtotal</span><span>' + formatUSD(subtotal) + '</span></div>' +
        '<div class="summary-row"><span>Shipping</span><span>' + (shipping === 0 ? 'Free' : formatUSD(shipping)) + '</span></div>' +
        '<div class="summary-row total"><span>Total</span><span>' + formatUSD(total) + '</span></div>' +
        '<button class="btn btn-primary checkout-btn" onclick="handleCheckout()">Proceed to Checkout</button>' +
        '<div class="coming-soon-notice hidden" id="checkout-notice">Checkout integration coming soon. Thank you for your patience!</div>' +
      '</div>' +
    '</div>';
}

function handleCheckout() {
  var notice = document.getElementById('checkout-notice');
  if (notice) { notice.classList.remove('hidden'); }
}

// ===== TOAST =====
function showToast(message) {
  var existing = document.querySelector('.toast');
  if (existing) { existing.remove(); }

  var toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
    'background:var(--color-surface-2);color:var(--color-text);' +
    'padding:var(--space-3) var(--space-6);border-radius:var(--radius-full);' +
    'font-size:var(--text-sm);font-weight:500;z-index:1000;' +
    'border:1px solid var(--color-primary);box-shadow:var(--shadow-lg);' +
    'opacity:0;transition:opacity 300ms cubic-bezier(0.16,1,0.3,1);';
  document.body.appendChild(toast);

  requestAnimationFrame(function() {
    toast.style.opacity = '1';
  });

  setTimeout(function() {
    toast.style.opacity = '0';
    setTimeout(function() { toast.remove(); }, 300);
  }, 2000);
}

// ===== MOBILE MENU =====
function initMobileMenu() {
  var btn = document.getElementById('mobile-menu-btn');
  var nav = document.querySelector('.nav-links');
  if (btn && nav) {
    btn.addEventListener('click', function() {
      nav.classList.toggle('open');
    });
  }
}

// ===== INIT =====
function init() {
  initTheme();
  initTicker();
  initMobileMenu();
  initAutocomplete('hero-search-input', 'hero-autocomplete');
  initAutocomplete('search-page-input', 'search-autocomplete');
  updateCartBadge();
  handleRoute();
  window.addEventListener('hashchange', handleRoute);
}

document.addEventListener('DOMContentLoaded', init);