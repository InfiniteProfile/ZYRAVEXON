(() => {
  "use strict";

  /*
   * ZYRAVEXON deterministic identity engine.
   * IDs remain canonical decimal strings; BigInt is used only for exact
   * increment/decrement and bounded feed offsets. No Number conversion is
   * applied to a user-supplied profile ID.
   *
   * Name search strategy: scan a deterministic window of 500 IDs beginning
   * at the current feed cursor. This is intentionally bounded and does not
   * claim to search the infinite identity space.
   */

  const $ = (selector, root = document) => root.querySelector(selector);
  const grid = $("#profile-grid");
  const sentinel = $("#feed-sentinel");
  const overlay = $("#search-overlay");
  const profileOverlay = $("#profile-overlay");
  const searchInput = $("#profile-id-input");
  const nameInput = $("#profile-name-input");
  const searchMessage = $("#search-message");
  const nameResults = $("#name-results");
  const toast = $("#toast");

  const FIRST_NAMES = [
    "Aev", "Nyx", "Zyra", "Vey", "Kael", "Astra", "Vael", "Luma",
    "Orin", "Xyra", "Nexa", "Eryx", "Cyr", "Zev", "Ilyra", "Noct",
    "Auri", "Vel", "Thyra", "Riven", "Sora", "Elun", "Vexa", "Mira",
    "Kairo", "Lyrix", "Oryn", "Zalen", "Nira", "Aether", "Syl", "Rhea"
  ];
  const LAST_NAMES = [
    "vex", "aeris", "nyth", "ora", "ion", "aris", "yx", "eon",
    "thys", "vane", "lune", "axis", "zen", "oryn", "veil", "ara",
    "cyon", "elle", "nova", "rune", "eth", "aris", "yra", "exis",
    "quill", "drax", "sol", "vyr", "aura", "zenith", "nox", "elys"
  ];
  const PALETTES = [
    ["#a78bfa", "#5b36b8", "#17122b"],
    ["#64e7ef", "#167b91", "#0b2028"],
    ["#ed9aff", "#8c3fa9", "#26132d"],
    ["#8ce6b8", "#287f75", "#10271f"],
    ["#f0c7ff", "#8355db", "#21162f"],
    ["#80baff", "#3566bd", "#101c35"],
    ["#e4a6cb", "#a14f8b", "#291528"],
    ["#c8e879", "#6c8531", "#1e2810"]
  ];
  const ARCHETYPES = ["The Quiet Voyager", "Keeper of the Violet Gate", "Wanderer Between Stars", "Architect of Echoes", "The Uncharted Mind", "Guardian of the Far Horizon", "Collector of Lost Light", "The Infinite Observer"];
  const TRAITS = ["Nebula-born", "Signal Weaver", "Void Cartographer", "Starlight Nomad", "Dream Architect", "Quantum Pilgrim", "Orbit Keeper", "Echo Seeker"];
  const SYMBOLS = ["✦", "◈", "⌬", "⟡", "✧", "◇", "⊹", "⧫"];

  function canonicalId(raw) {
    const value = String(raw ?? "").trim();
    if (!/^[0-9]+$/.test(value)) return null;
    const normalized = value.replace(/^0+/, "");
    return normalized.length ? normalized : null;
  }

  function addOne(id) { return (BigInt(id) + 1n).toString(); }
  function subtractOne(id) { return BigInt(id) > 1n ? (BigInt(id) - 1n).toString() : null; }

  // Stable FNV-1a-style 32-bit hash over every digit, with a second mixing pass.
  function hashId(id, salt = "") {
    const input = `${salt}:${id}`;
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x7feb352d);
    h ^= h >>> 15;
    h = Math.imul(h, 0x846ca68b);
    h ^= h >>> 16;
    return h >>> 0;
  }

  function pick(list, id, salt) { return list[hashId(id, salt) % list.length]; }
  function makeAvatar(id, palette, symbol) {
    const h1 = hashId(id, "avatar-a") % 360;
    const h2 = hashId(id, "avatar-b") % 360;
    const turn = hashId(id, "avatar-turn") % 360;
    const ring = 16 + (hashId(id, "avatar-ring") % 24);
    const cx = 50 + (hashId(id, "avatar-x") % 13) - 6;
    const cy = 50 + (hashId(id, "avatar-y") % 13) - 6;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><radialGradient id="g"><stop stop-color="hsl(${h1} 90% 74%)"/><stop offset="1" stop-color="hsl(${h2} 70% 20%)"/></radialGradient><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${palette[0]}"/><stop offset="1" stop-color="${palette[1]}"/></linearGradient></defs><rect width="100" height="100" rx="50" fill="${palette[2]}"/><circle cx="${cx}" cy="${cy}" r="${ring}" fill="url(#g)" opacity=".92"/><circle cx="50" cy="50" r="37" fill="none" stroke="url(#b)" stroke-width="1.4" opacity=".9"/><ellipse cx="50" cy="50" rx="43" ry="18" transform="rotate(${turn} 50 50)" fill="none" stroke="${palette[0]}" stroke-width=".8" opacity=".7"/><path d="M50 23 56 43 77 50 56 57 50 77 44 57 23 50 44 43Z" fill="${palette[0]}" opacity=".88"/><circle cx="50" cy="50" r="5" fill="#fff"/><text x="50" y="89" font-size="9" fill="#fff" text-anchor="middle" opacity=".9">${symbol}</text></svg>`;
    return `url("data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}")`;
  }

  function generateProfile(rawId) {
    const id = canonicalId(rawId);
    if (!id) throw new Error("Enter a positive decimal integer greater than zero.");
    const first = pick(FIRST_NAMES, id, "first");
    const last = pick(LAST_NAMES, id, "last");
    const palette = pick(PALETTES, id, "palette");
    const symbol = pick(SYMBOLS, id, "symbol");
    const name = `${first}${last.charAt(0).toUpperCase()}${last.slice(1)}`;
    const archetype = pick(ARCHETYPES, id, "archetype");
    const trait = pick(TRAITS, id, "trait");
    const avatar = makeAvatar(id, palette, symbol);
    const hue = hashId(id, "hue") % 360;
    const bio = `${archetype}. A fictional ${trait.toLowerCase()} charting a personal path through the ZYRAVEXON universe. Identity signature ${symbol} ${id.slice(-Math.min(6, id.length))}.`;
    return { id, name, palette, symbol, archetype, trait, avatar, bio, hue };
  }

  function profileUrl(id) {
    // Query routing works on static hosts, including GitHub Pages project sites.
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("profile", id);
    return url.href;
  }

  function applyAvatar(element, profile) {
    element.style.backgroundImage = profile.avatar;
    element.style.backgroundColor = profile.palette[2];
    element.style.setProperty("--accent", profile.palette[0]);
  }

  function createCard(profile) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "profile-card";
    card.dataset.profileId = profile.id;
    card.setAttribute("aria-label", `Open ${profile.name}, profile ID ${profile.id}`);
    card.style.setProperty("--accent", profile.palette[0]);
    card.style.setProperty("--avatar-bg", profile.palette[2]);
    const top = document.createElement("div");
    top.className = "card-top";
    const index = document.createElement("span");
    index.className = "card-index";
    index.textContent = "IDENTITY /";
    const orbit = document.createElement("span");
    orbit.className = "card-orbit";
    top.append(index, orbit);
    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.setAttribute("aria-hidden", "true");
    applyAvatar(avatar, profile);
    const name = document.createElement("h3");
    name.textContent = profile.name;
    const id = document.createElement("div");
    id.className = "card-id";
    id.textContent = `#${profile.id}`;
    const bottom = document.createElement("div");
    bottom.className = "card-bottom";
    bottom.textContent = `${profile.symbol}  VIEW IDENTITY  ↗`;
    card.append(top, avatar, name, id, bottom);
    card.addEventListener("click", () => openProfile(profile.id));
    return card;
  }

  const BATCH_SIZE = 300;
  const GENERATION_THRESHOLD = 100;
  const NAME_SEARCH_WINDOW = 500;
  let nextFeedId = 1n;
  let loading = false;
  let nextGenerationAt = 100n;
  let toastTimer = 0;
  let lastFocus = null;

  function updateCount() {
    $("#visible-count").textContent = String(grid.children.length);
  }

  function renderBatch() {
    if (loading) return;
    loading = true;
    $("#feed-status-text").textContent = "Generating identities";
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < BATCH_SIZE; i++) {
      const id = nextFeedId.toString();
      fragment.appendChild(createCard(generateProfile(id)));
      nextFeedId += 1n;
    }
    grid.appendChild(fragment);
    updateCount();
    loading = false;
    $("#feed-status-text").textContent = "Universe active";
  }

  // Generate another 300 only when the user has actually reached the threshold.
  // This never changes scroll position and doesn't use a timer or auto-scroll.
  function checkGenerationThreshold() {
    if (loading || !grid.children.length) return;
    const cards = grid.children;
    let highestVisibleId = 0n;
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        const id = cards[i].dataset.profileId;
        if (id && /^[0-9]+$/.test(id) && BigInt(id) > highestVisibleId) highestVisibleId = BigInt(id);
      }
    }
    if (highestVisibleId >= nextGenerationAt) {
      renderBatch();
      nextGenerationAt += BigInt(BATCH_SIZE);
    }
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function openSearch() {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    searchMessage.textContent = "";
    searchMessage.classList.remove("error");
    nameResults.replaceChildren();
    window.setTimeout(() => searchInput.focus(), 0);
  }
  function closeSearch() {
    overlay.hidden = true;
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  function openProfile(rawId, updateHistory = true) {
    const id = canonicalId(rawId);
    if (!id) { showToast("That profile ID is not valid."); return; }
    const profile = generateProfile(id);
    if (updateHistory) {
      const url = new URL(window.location.href);
      url.search = "";
      url.hash = "";
      url.searchParams.set("profile", id);
      history.pushState({ profile: id }, "", url);
    }
    renderProfileDetail(profile);
    profileOverlay.hidden = false;
    closeSearch();
    $("#detail-feedback").textContent = "";
    $("#detail-name").focus?.({ preventScroll: true });
  }

  function renderProfileDetail(profile) {
    const detail = $(".profile-detail");
    detail.style.setProperty("--detail-accent", profile.palette[0]);
    detail.style.setProperty("--detail-avatar", profile.avatar);
    $("#detail-orb").style.backgroundImage = profile.avatar;
    $("#detail-orb").style.backgroundColor = profile.palette[2];
    $("#detail-name").textContent = profile.name;
    $("#detail-id").textContent = profile.id;
    $("#detail-bio").textContent = profile.bio;
    const tags = $("#detail-tags");
    tags.replaceChildren();
    [profile.archetype, profile.trait, `Signature ${profile.symbol}`].forEach(label => {
      const tag = document.createElement("span");
      tag.textContent = label;
      tags.appendChild(tag);
    });
    $("#previous-profile").disabled = !subtractOne(profile.id);
    $("#previous-profile").style.opacity = subtractOne(profile.id) ? "1" : ".42";
    $("#copy-link").dataset.profileId = profile.id;
    $("#share-profile").dataset.profileId = profile.id;
    $("#previous-profile").dataset.profileId = profile.id;
    $("#next-profile").dataset.profileId = profile.id;
  }

  function closeProfile(updateHistory = true) {
    profileOverlay.hidden = true;
    if (updateHistory) {
      const url = new URL(window.location.href);
      url.searchParams.delete("profile");
      history.pushState({}, "", url);
    }
  }

  function submitIdSearch(event) {
    event.preventDefault();
    const id = canonicalId(searchInput.value);
    if (!id) {
      searchMessage.textContent = "Enter a valid positive integer using decimal digits only. Zero is not a profile ID.";
      searchMessage.classList.add("error");
      return;
    }
    searchMessage.classList.remove("error");
    searchMessage.textContent = `Opening exact profile ID ${id}…`;
    openProfile(id);
  }

  function searchNames(event) {
    event.preventDefault();
    const query = nameInput.value.trim().toLocaleLowerCase();
    nameResults.replaceChildren();
    if (!query) {
      searchMessage.textContent = "Enter a name or part of a generated name to search.";
      searchMessage.classList.add("error");
      return;
    }
    searchMessage.classList.remove("error");
    searchMessage.textContent = `Searching a deterministic window of ${NAME_SEARCH_WINDOW} IDs…`;
    const matches = [];
    // The window starts at the feed cursor and wraps to ID 1 if it reaches no practical boundary.
    const start = nextFeedId;
    for (let i = 0n; i < BigInt(NAME_SEARCH_WINDOW); i++) {
      const p = generateProfile((start + i).toString());
      if (p.name.toLocaleLowerCase().includes(query)) matches.push(p);
      if (matches.length >= 8) break;
    }
    if (!matches.length) {
      searchMessage.textContent = `No matches in this ${NAME_SEARCH_WINDOW}-ID search window. Try a shorter name fragment or search by exact ID.`;
      return;
    }
    searchMessage.textContent = `${matches.length} matching result${matches.length === 1 ? "" : "s"} in the checked window.`;
    matches.forEach(profile => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "result-row";
      const avatar = document.createElement("span");
      avatar.className = "avatar";
      applyAvatar(avatar, profile);
      const copy = document.createElement("span");
      copy.className = "result-copy";
      const strong = document.createElement("strong");
      strong.textContent = profile.name;
      const id = document.createElement("span");
      id.textContent = `PROFILE ID #${profile.id}`;
      copy.append(strong, id);
      button.append(avatar, copy);
      button.addEventListener("click", () => openProfile(profile.id));
      nameResults.appendChild(button);
    });
  }

  async function copyProfileLink() {
    const id = $("#copy-link").dataset.profileId;
    const url = profileUrl(id);
    try {
      await navigator.clipboard.writeText(url);
      $("#detail-feedback").textContent = "Profile link copied.";
    } catch {
      const helper = document.createElement("textarea");
      helper.value = url;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      const success = document.execCommand("copy");
      helper.remove();
      $("#detail-feedback").textContent = success ? "Profile link copied." : url;
    }
  }

  async function shareProfile() {
    const id = $("#share-profile").dataset.profileId;
    const profile = generateProfile(id);
    const url = profileUrl(id);
    if (navigator.share) {
      try { await navigator.share({ title: `${profile.name} — ZYRAVEXON`, text: `Explore fictional identity ${profile.name} (#${id}).`, url }); }
      catch (error) { if (error?.name !== "AbortError") showToast("Sharing was not available. You can copy the profile link instead."); }
    } else {
      await copyProfileLink();
      showToast("Sharing is not supported here; profile link copied where possible.");
    }
  }

  $("#open-search").addEventListener("click", openSearch);
  $("#hero-search").addEventListener("click", openSearch);
  $("#explore").addEventListener("click", () => $("#universe").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
  document.querySelectorAll("[data-close-search]").forEach(el => el.addEventListener("click", closeSearch));
  document.querySelectorAll("[data-close-profile]").forEach(el => el.addEventListener("click", () => closeProfile()));
  $("#search-form").addEventListener("submit", submitIdSearch);
  $("#name-search-form").addEventListener("submit", searchNames);
  $("#copy-link").addEventListener("click", copyProfileLink);
  $("#share-profile").addEventListener("click", shareProfile);
  $("#next-profile").addEventListener("click", () => openProfile(addOne($("#next-profile").dataset.profileId)));
  $("#previous-profile").addEventListener("click", () => {
    const previous = subtractOne($("#previous-profile").dataset.profileId);
    if (previous) openProfile(previous);
  });
  $("#explore-more").addEventListener("click", () => {
    closeProfile();
    $("#universe").scrollIntoView({ behavior: "smooth" });
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      if (!overlay.hidden) closeSearch();
      if (!profileOverlay.hidden) closeProfile();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openSearch();
    }
  });

  window.addEventListener("scroll", checkGenerationThreshold, { passive: true });
  window.addEventListener("resize", checkGenerationThreshold, { passive: true });
  window.addEventListener("popstate", () => {
    const id = new URL(window.location.href).searchParams.get("profile");
    if (id && canonicalId(id)) {
      renderProfileDetail(generateProfile(id));
      profileOverlay.hidden = false;
    } else {
      profileOverlay.hidden = true;
    }
  });

  // Initial view and direct profile links (including very long query-string IDs).
  renderBatch();
  // 300 profiles are available on first load; no automatic page scrolling.
  nextGenerationAt = BigInt(GENERATION_THRESHOLD);
  const initialId = new URL(window.location.href).searchParams.get("profile");
  if (initialId !== null) {
    if (canonicalId(initialId)) openProfile(initialId, false);
    else showToast("Invalid profile ID in this URL.");
  }
})();
