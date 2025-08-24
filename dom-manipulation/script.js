/***************************
 * Dynamic Quote Generator
 * + Local/Session Storage
 * + Import/Export (JSON)
 * + Category Filter (persisted)
 * + Server Sync (JSONPlaceholder)
 * + Conflict Handling (server-wins)
 ***************************/

/* ---------- Storage Keys ---------- */
const LS_QUOTES_KEY = "quotes";
const SS_LAST_QUOTE_INDEX_KEY = "lastQuote";
const LS_LAST_CATEGORY_KEY = "lastCategory";
const LS_LAST_SYNC_KEY = "lastSync";
const LS_CONFLICTS_KEY = "conflicts";

/* ---------- Server (Mock API) ---------- */
const SERVER_URL = "https://jsonplaceholder.typicode.com/posts";

/* ---------- Data ---------- */
let quotes = [
  { id: makeId(), text: "The best way to get started is to quit talking and begin doing.", category: "Motivation", updatedAt: Date.now(), dirty: false },
  { id: makeId(), text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", category: "Inspiration", updatedAt: Date.now(), dirty: false },
  { id: makeId(), text: "Don’t let yesterday take up too much of today.", category: "Wisdom", updatedAt: Date.now(), dirty: false }
];

/* ---------- Global Selected Category ---------- */
let selectedCategory = "all";

/* ---------- Utilities ---------- */
function makeId() {
  return "loc-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function nowIso() {
  return new Date().toISOString();
}
function shallowEqualQuote(a, b) {
  return a.text === b.text && a.category === b.category;
}

/* ---------- Local / Session Storage ---------- */
function saveQuotes() { localStorage.setItem(LS_QUOTES_KEY, JSON.stringify(quotes)); }
function loadQuotes() {
  const raw = localStorage.getItem(LS_QUOTES_KEY);
  if (!raw) return;
  try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) quotes = parsed; }
  catch (e) { console.warn("Failed to parse saved quotes", e); }
}
function saveLastQuoteIndex(index) { sessionStorage.setItem(SS_LAST_QUOTE_INDEX_KEY, String(index)); }
function getLastQuoteIndex() { const v = sessionStorage.getItem(SS_LAST_QUOTE_INDEX_KEY); return v == null ? null : Number(v); }
function saveLastCategory(category) { localStorage.setItem(LS_LAST_CATEGORY_KEY, category); }
function getLastCategory() { return localStorage.getItem(LS_LAST_CATEGORY_KEY) || "all"; }
function getConflicts() { try { return JSON.parse(localStorage.getItem(LS_CONFLICTS_KEY) || "[]"); } catch { return []; } }
function addConflict(conflict) { const conflicts = getConflicts(); conflicts.push(conflict); localStorage.setItem(LS_CONFLICTS_KEY, JSON.stringify(conflicts)); }
function setLastSync(ts) { localStorage.setItem(LS_LAST_SYNC_KEY, ts); }
function getLastSync() { return localStorage.getItem(LS_LAST_SYNC_KEY) || ""; }

/* ---------- Rendering ---------- */
function showQuoteAtIndex(index) {
  const display = document.getElementById("quoteDisplay");
  if (!quotes.length) { display.textContent = "No quotes available."; return; }
  const q = quotes[index % quotes.length];
  display.innerHTML = `<p>"${q.text}"</p><small>— ${q.category}</small>`;
  saveLastQuoteIndex(index);
}
function showRandomQuote() {
  const list = getFilteredQuotes();
  const display = document.getElementById("quoteDisplay");
  if (!list.length) { display.textContent = "No quotes in this category."; return; }
  const q = list[Math.floor(Math.random() * list.length)];
  display.innerHTML = `<p>"${q.text}"</p><small>— ${q.category}</small>`;
}

/* ---------- Category Filter ---------- */
function populateCategories() {
  const filter = ensureCategoryFilter();
  filter.innerHTML = `<option value="all">All Categories</option>`;
  const cats = [...new Set(quotes.map(q => q.category))].sort();
  cats.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c; opt.textContent = c;
    filter.appendChild(opt);
  });
  selectedCategory = getLastCategory();
  filter.value = filter.querySelector(`option[value="${selectedCategory}"]`) ? selectedCategory : "all";
}

function getFilteredQuotes() {
  if (selectedCategory === "all") return quotes;
  return quotes.filter(q => q.category === selectedCategory);
}

function filterQuotes() {
  const filter = document.getElementById("categoryFilter");
  if (!filter) return;
  selectedCategory = filter.value;
  saveLastCategory(selectedCategory);

  const list = getFilteredQuotes();
  const display = document.getElementById("quoteDisplay");
  display.innerHTML = "";
  if (!list.length) { display.textContent = "No quotes in this category."; return; }
  list.forEach(q => {
    const p = document.createElement("p"); p.textContent = `"${q.text}"`;
    const s = document.createElement("small"); s.textContent = `— ${q.category}`;
    display.appendChild(p); display.appendChild(s);
  });
}

/* ---------- Add Quote ---------- */
function addQuote() {
  const textEl = document.getElementById("newQuoteText");
  const catEl = document.getElementById("newQuoteCategory");
  const text = (textEl.value || "").trim();
  const category = (catEl.value || "").trim() || "General";
  if (!text) { alert("Please enter a quote."); return; }
  quotes.push({ id: makeId(), text, category, updatedAt: Date.now(), dirty: true });
  saveQuotes();
  populateCategories();
  textEl.value = ""; catEl.value = "";
  filterQuotes();
  toast("Quote added locally. Will sync to server.");
}

/* ---------- Import / Export ---------- */
function exportToJson() {
  try {
    const data = JSON.stringify(quotes, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "quotes.json";
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  } catch (e) { alert("Failed to export quotes."); console.error(e); }
}
function importFromJsonFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      const incoming = Array.isArray(imported) ? imported : (Array.isArray(imported?.quotes) ? imported.quotes : null);
      if (!incoming) { alert("Invalid JSON. Expected an array or { quotes: [...] }"); return; }
      const normalized = incoming.filter(Boolean).map(q => {
        if (typeof q === "string") return { id: makeId(), text: q, category: "General", updatedAt: Date.now(), dirty: true };
        const text = (q && typeof q.text === "string") ? q.text : "";
        const category = (q && typeof q.category === "string" && q.category.trim()) ? q.category : "General";
        const updatedAt = Number(q?.updatedAt) || Date.now();
        return { id: makeId(), text, category, updatedAt, dirty: true };
      }).filter(q => q.text.trim() !== "");
      const keys = new Set(quotes.map(q => `${q.text}||${q.category}`));
      const toAdd = normalized.filter(q => !keys.has(`${q.text}||${q.category}`));
      quotes.push(...toAdd);
      saveQuotes(); populateCategories(); filterQuotes();
      toast(`Imported ${toAdd.length} quote(s). Will sync to server.`);
      event.target.value = "";
    } catch (err) { alert("Failed to read JSON file."); console.error(err); }
  };
  reader.readAsText(file);
}

/* ---------- Dynamic UI Builders ---------- */
function ensureCategoryFilter() {
  let filter = document.getElementById("categoryFilter");
  if (!filter) {
    filter = document.createElement("select");
    filter.id = "categoryFilter";
    filter.addEventListener("change", filterQuotes);
    const before = document.getElementById("quoteDisplay");
    document.body.insertBefore(filter, before);
  }
  return filter;
}

function createAddQuoteForm() {
  const wrap = document.createElement("div");
  wrap.style.marginTop = "16px";
  wrap.style.display = "grid";
  wrap.style.gridTemplateColumns = "1fr 1fr auto";
  wrap.style.gap = "8px";
  const textInput = Object.assign(document.createElement("input"), { id: "newQuoteText", type: "text", placeholder: "Enter a new quote" });
  const catInput  = Object.assign(document.createElement("input"), { id: "newQuoteCategory", type: "text", placeholder: "Enter quote category" });
  const addBtn = document.createElement("button"); addBtn.textContent = "Add Quote"; addBtn.addEventListener("click", addQuote);
  wrap.append(textInput, catInput, addBtn);
  document.body.appendChild(wrap);
}

function createStorageControls() {
  const controls = document.createElement("div");
  controls.style.marginTop = "12px"; controls.style.display = "flex"; controls.style.gap = "8px"; controls.style.flexWrap = "wrap";
  const exportBtn = document.createElement("button"); exportBtn.textContent = "Export Quotes (JSON)"; exportBtn.addEventListener("click", exportToJson);
  const importInput = document.createElement("input"); importInput.type = "file"; importInput.id = "importFile"; importInput.accept = ".json"; importInput.addEventListener("change", importFromJsonFile);
  const clearBtn = document.createElement("button"); clearBtn.textContent = "Clear All Quotes"; clearBtn.addEventListener("click", () => {
    if (!confirm("This will remove all quotes from local storage. Continue?")) return;
    quotes = []; saveQuotes(); populateCategories(); filterQuotes();
  });
  const syncBtn = document.createElement("button"); syncBtn.textContent = "Sync Now"; syncBtn.addEventListener("click", syncWithServer);
  controls.append(exportBtn, importInput, clearBtn, syncBtn);
  document.body.appendChild(controls);
}

function ensureToastArea() {
  let el = document.getElementById("toastArea");
  if (!el) {
    el = document.createElement("div");
    el.id = "toastArea";
    el.style.position = "fixed";
    el.style.bottom = "16px";
    el.style.right = "16px";
    el.style.display = "grid";
    el.style.gap = "8px";
    el.style.zIndex = "9999";
    document.body.appendChild(el);
  }
  return el;
}

function toast(msg, type = "info") {
  const area = ensureToastArea();
  const card = document.createElement("div");
  card.textContent = msg;
  card.style.padding = "10px 12px";
  card.style.borderRadius = "8px";
  card.style.boxShadow = "0 2px 6px rgba(0,0,0,.15)";
  card.style.background = type === "error" ? "#ffe5e5" : type === "success" ? "#e7ffe7" : "#eef2ff";
  card.style.border = "1px solid rgba(0,0,0,.08)";
  area.appendChild(card);
  setTimeout(() => card.remove(), 3800);
}

/* ---------- Server Sync ---------- */
async function fetchServerQuotes() {
  try {
    const res = await fetch(`${SERVER_URL}?_limit=15`);
    const posts = await res.json();
    const serverQuotes = posts.map(p => ({
      serverId: String(p.id),
      text: String(p.body || "").trim(),
      category: String(p.title || "Server").trim() || "Server",
      serverStamp: Date.now()
    })).filter(q => q.text);
    return serverQuotes;
  } catch (e) {
    toast("Failed to fetch from server.", "error");
    console.error(e);
    return [];
  }
}

function mergeServerQuotes(serverQuotes) {
  if (!serverQuotes.length) return { added: 0, updated: 0, conflicted: 0 };
  let added = 0, updated = 0, conflicted = 0;
  const byServerId = new Map();
  quotes.forEach(q => { if (q.serverId) byServerId.set(q.serverId, q); });

  serverQuotes.forEach(srv => {
    const local = byServerId.get(srv.serverId);
    if (local) {
      const newShape = { ...local, text: srv.text, category: srv.category, updatedAt: Date.now(), dirty: false };
      if (!shallowEqualQuote(local, newShape)) {
        const lastSync = Number(getLastSync()) || 0;
        const localChangedAfterSync = Number(local.updatedAt) > lastSync && local.dirty === true;
        if (localChangedAfterSync) {
          conflicted++;
          addConflict({
            when: nowIso(),
            reason: "Local & server both changed",
            local: { text: local.text, category: local.category, updatedAt: local.updatedAt },
            server: { text: srv.text, category: srv.category, serverStamp: srv.serverStamp },
            resolvedAs: "server"
          });
        }
        local.text = srv.text;
        local.category = srv.category;
        local.updatedAt = Date.now();
        local.dirty = false;
        updated++;
      } else local.dirty = false;
    } else {
      quotes.push({
        id: makeId(),
        serverId: srv.serverId,
        text: srv.text,
        category: srv.category,
        updatedAt: Date.now(),
        dirty: false
      });
      added++;
    }
  });
  saveQuotes();
  return { added, updated, conflicted };
}

async function pushLocalChanges() {
  const dirty = quotes.filter(q => q.dirty === true);
  if (!dirty.length) return { pushed: 0 };
  let pushed = 0;
  for (const q of dirty) {
    try {
      const res = await fetch(SERVER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: q.category,
          body: q.text,
          userId: 1,
          clientUpdatedAt: q.updatedAt
        })
      });
      const data = await res.json();
      if (data && data.id != null) q.serverId = String(data.id);
      q.dirty = false;
      pushed++;
    } catch (e) { console.warn("Failed to push quote:", q, e); }
  }
  saveQuotes();
  return { pushed };
}

async function syncWithServer() {
  toast("Sync started…");
  const srv = await fetchServerQuotes();
  const mergeStats = mergeServerQuotes(srv);
  const pushStats = await pushLocalChanges();
  setLastSync(String(Date.now()));
  const parts = [];
  if (mergeStats.added) parts.push(`+${mergeStats.added} from server`);
  if (mergeStats.updated) parts.push(`${mergeStats.updated} updated`);
  if (mergeStats.conflicted) parts.push(`${mergeStats.conflicted} conflicts (server-wins)`);
  if (pushStats.pushed) parts.push(`${pushStats.pushed} pushed`);
  toast(`Sync complete: ${parts.join(", ") || "no changes"}`, mergeStats.conflicted ? "info" : "success");
  populateCategories();
  filterQuotes();
}

let syncTimer = null;
function startAutoSync(intervalMs = 30000) {
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(syncWithServer, intervalMs);
}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  loadQuotes();
  ensureCategoryFilter();
  populateCategories();
  filterQuotes();
  const newBtn = document.getElementById("newQuote");
  if (newBtn) newBtn.addEventListener("click", showRandomQuote);
  createAddQuoteForm();
  createStorageControls();
  ensureToastArea();
  const last = getLastQuoteIndex();
  if (last != null && quotes.length) showQuoteAtIndex(Math.max(0, Math.min(last, quotes.length - 1)));
  else showRandomQuote();
  syncWithServer();
  startAutoSync(30000);
});