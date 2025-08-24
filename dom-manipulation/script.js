/* ---------- Category Filter ---------- */
let selectedCategory = "all"; // global selected category

function populateCategories() {
  const filter = ensureCategoryFilter();
  filter.innerHTML = `<option value="all">All Categories</option>`;
  const cats = [...new Set(quotes.map(q => q.category))].sort();
  cats.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c; 
    opt.textContent = c;
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
  if (!list.length) { 
    display.textContent = "No quotes in this category."; 
    return; 
  }
  list.forEach(q => {
    const p = document.createElement("p"); p.textContent = `"${q.text}"`;
    const s = document.createElement("small"); s.textContent = `— ${q.category}`;
    display.appendChild(p); display.appendChild(s);
  });
}

/* ---------- Fetch Quotes from Server (wrapper) ---------- */
async function fetchQuotesFromServer() {
  const serverQuotes = await fetchServerQuotes();
  const stats = mergeServerQuotes(serverQuotes);
  populateCategories();
  filterQuotes();
  return stats;
}