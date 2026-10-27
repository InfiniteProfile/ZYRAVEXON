(() => {
  'use strict';

  const INITIAL_BATCH = 300;
  const APPEND_BATCH = 300;
  const PREFETCH_AT = 100;
  const grid = document.getElementById('profile-grid');
  const countLabel = document.getElementById('generated-count');
  const status = document.getElementById('status');
  const loadStatus = document.getElementById('load-status');
  const sentinel = document.getElementById('sentinel');
  const searchDialog = document.getElementById('search-dialog');
  const profileDialog = document.getElementById('profile-dialog');
  const searchInput = document.getElementById('search-input');
  const searchResult = document.getElementById('search-result');
  const profileDetail = document.getElementById('profile-detail');

  const prefixes = ['Oryn','Astra','Luma','Kael','Nyra','Vexa','Zyra','Ely','Aeri','Sol','Novi','Vey','Orbi','Xylo','Mira','Thalen','Auri','Kairo','Nexa','Vori','Ily','Zeno','Rhea','Cyr'];
  const suffixes = ['Aeris','Vex','Sol','Aeris','Nova','Thane','Lyra','Vorn','Mira','Quin','Ryn','Vale','Nox','Lune','Dara','Zen','Vara','Keth','Sora','Myth','Aven','Taris','Elion','Vey'];
  const colors = ['#c9f27a','#efc2ff','#d9a5ff','#aa8aff','#7deef0','#ffadcf','#f4c878','#91b9ff','#ff9e86','#a6f2c4'];
  const symbols = ['✦','✧','◈','✺','✹','✵','❖','✷','✴','◇','☼','✶'];
  const namesSeen = new Map();
  let generated = 0n;
  let nextId = 1n;
  let generating = false;
  let pending = false;
  let nextTrigger = BigInt(PREFETCH_AT);
  let observer = null;

  function hashId(id) {
    // Stable string-based hash; works with IDs far beyond Number.MAX_SAFE_INTEGER.
    const s = String(id);
    let h1 = 2166136261 >>> 0;
    let h2 = 0x9e3779b9 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619) >>> 0;
      h2 = (Math.imul(h2 ^ s.charCodeAt(i), 2246822519) + 3266489917) >>> 0;
    }
    return [h1, h2];
  }

  function identity(id) {
    const [a, b] = hashId(id);
    const prefix = prefixes[a % prefixes.length];
    const suffix = suffixes[b % suffixes.length];
    const tail = ((a >>> 7) % 9) ? '' : String((b % 89) + 10);
    const name = prefix + suffix + tail;
    return {
      id: String(id), name,
      color: colors[(a ^ (b >>> 3)) % colors.length],
      symbol: symbols[(b ^ (a >>> 5)) % symbols.length],
      world: ['Celestial','Astral','Luminous','Forgotten','Ethereal','Quantum','Stellar','Hidden'][(a >>> 4) % 8],
      story: `A ${['quiet','ancient','curious','radiant','enigmatic','restless','brilliant','unmapped'][(b >>> 6) % 8]} identity from a ${['violet','crystal','distant','shifting','silver','echoing','forgotten','living'][(a >>> 9) % 8]} world. Its signature is generated deterministically from identity ${id}.`
    };
  }

  function makeCard(person) {
    const card = document.createElement('article');
    card.className = 'profile-card';
    card.style.setProperty('--accent', person.color);
    card.dataset.id = person.id;
    const top = document.createElement('div');
    top.className = 'card-top';
    const label = document.createElement('span'); label.textContent = 'IDENTITY / ' + person.id;
    const dot = document.createElement('span'); dot.className = 'identity-dot';
    top.append(label, dot);
    const sigilWrap = document.createElement('div'); sigilWrap.className = 'sigil-wrap';
    const sigil = document.createElement('div'); sigil.className = 'sigil'; sigil.textContent = person.symbol; sigil.setAttribute('aria-hidden', 'true');
    sigilWrap.append(sigil);
    const info = document.createElement('div'); info.className = 'card-info';
    const name = document.createElement('h3'); name.textContent = person.name;
    const id = document.createElement('p'); id.textContent = '#' + person.id;
    info.append(name, id);
    const open = document.createElement('button'); open.className = 'card-open'; open.type = 'button'; open.textContent = person.symbol + '  VIEW IDENTITY ↗';
    open.addEventListener('click', () => showProfile(person));
    card.append(top, sigilWrap, info, open);
    return card;
  }

  function updateCount() {
    countLabel.textContent = generated.toString();
    status.textContent = 'Universe active';
  }

  function appendBatch(size) {
    if (generating) { pending = true; return; }
    generating = true;
    loadStatus.textContent = 'Generating the next worlds…';
    // Build in animation-frame chunks to avoid blocking low-end phones.
    let made = 0;
    const fragment = document.createDocumentFragment();
    function chunk() {
      const limit = Math.min(made + 50, size);
      while (made < limit) {
        const person = identity(nextId);
        namesSeen.set(person.name.toLowerCase(), person.id);
        fragment.append(makeCard(person));
        nextId += 1n;
        made++;
      }
      grid.append(fragment);
      // The next ID is the authoritative count, including arbitrarily large IDs.
      generated = nextId - 1n;
      updateCount();
      if (made < size) {
        requestAnimationFrame(chunk);
      } else {
        generating = false;
        loadStatus.textContent = 'More worlds will appear as you explore.';
        if (pending) { pending = false; appendBatch(APPEND_BATCH); }
      }
    }
    requestAnimationFrame(chunk);
  }

  function ensureAhead() {
    if (generating || generated < nextTrigger) return;
    // Find the first profile currently entering the viewport. This threshold is based
    // on actual profile cards, not scroll height, so responsive grids behave correctly.
    const cards = grid.children;
    let visibleIndex = -1;
    for (let i = 0; i < cards.length; i++) {
      if (cards[i].getBoundingClientRect().bottom >= 0) { visibleIndex = i; break; }
    }
    if (visibleIndex < 0 || BigInt(visibleIndex + 1) < nextTrigger) return;
    nextTrigger += BigInt(APPEND_BATCH);
    appendBatch(APPEND_BATCH);
  }

  function showProfile(person) {
    profileDetail.replaceChildren();
    const wrap = document.createElement('div'); wrap.className = 'detail-profile'; wrap.style.setProperty('--accent', person.color);
    const sigil = document.createElement('div'); sigil.className = 'sigil'; sigil.textContent = person.symbol;
    const eyebrow = document.createElement('div'); eyebrow.className = 'eyebrow'; eyebrow.textContent = person.world.toUpperCase() + ' WORLD';
    const h = document.createElement('h2'); h.textContent = person.name;
    const id = document.createElement('div'); id.className = 'detail-id'; id.textContent = 'IDENTITY #' + person.id;
    const story = document.createElement('p'); story.textContent = person.story;
    const actions = document.createElement('div'); actions.className = 'detail-actions';
    const copy = document.createElement('button'); copy.className = 'button secondary'; copy.textContent = 'Copy identity ID';
    copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(person.id); copy.textContent = 'Copied!'; } catch { copy.textContent = person.id; } });
    actions.append(copy); wrap.append(sigil, eyebrow, h, id, story, actions); profileDetail.append(wrap);
    if (!profileDialog.open) profileDialog.showModal();
  }

  function canonicalId(raw) {
    const s = raw.trim();
    if (!/^\d+$/.test(s)) return null;
    const normalized = s.replace(/^0+(?=\d)/, '');
    return normalized === '0' ? null : normalized;
  }

  function showSearchResult(person) {
    searchResult.replaceChildren();
    const row = document.createElement('div'); row.className = 'result-card'; row.style.setProperty('--accent', person.color);
    const sigil = document.createElement('div'); sigil.className = 'sigil'; sigil.textContent = person.symbol;
    const content = document.createElement('div'); const h = document.createElement('h3'); h.textContent = person.name;
    const p = document.createElement('p'); p.textContent = 'IDENTITY #' + person.id;
    const open = document.createElement('button'); open.className = 'button secondary'; open.textContent = 'Open identity'; open.style.marginTop = '9px'; open.addEventListener('click', () => showProfile(person));
    content.append(h,p,open); row.append(sigil,content); searchResult.append(row);
  }

  document.getElementById('open-search').addEventListener('click', () => { searchDialog.showModal(); searchInput.focus(); });
  document.getElementById('hero-search').addEventListener('click', () => { searchDialog.showModal(); searchInput.focus(); });
  document.getElementById('close-profile').addEventListener('click', () => profileDialog.close());
  document.getElementById('search-form').addEventListener('submit', event => {
    event.preventDefault();
    const value = searchInput.value.trim();
    const id = canonicalId(value);
    if (id) {
      const person = identity(id);
      showSearchResult(person);
      return;
    }
    const target = value.toLowerCase();
    let foundId = namesSeen.get(target);
    if (!foundId) {
      // Deterministic local search window, not a claim that arbitrary names can be exhaustively searched.
      for (let i = 1n; i <= 5000n; i++) {
        const person = identity(i);
        if (person.name.toLowerCase() === target) { foundId = person.id; break; }
      }
    }
    if (foundId) showSearchResult(identity(foundId));
    else { searchResult.textContent = 'No exact generated name found. Try an identity ID, which supports arbitrarily long numbers.'; searchResult.className = 'hint'; }
  });

  // Observe the feed end as a backup trigger. It never changes scroll position.
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) ensureAhead();
    }, { root: null, rootMargin: '1200px 0px', threshold: 0 });
    observer.observe(sentinel);
  }
  // Scroll fallback plus threshold check; passive listener does not call scrollTo/scrollIntoView.
  let scrollQueued = false;
  window.addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      const near = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1500;
      if (near) ensureAhead();
    });
  }, { passive: true });

  // Initial 300 are generated automatically in small rendering chunks.
  appendBatch(INITIAL_BATCH);
})();
