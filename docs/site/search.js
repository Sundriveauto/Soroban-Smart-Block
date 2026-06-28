// Lightweight client-side search over a static index (no external service).
// Loads search-index.json and supports keyboard navigation with Cmd/Ctrl+K.
(function () {
  let index = [];
  let results = [];
  let active = 0;

  const overlay = document.getElementById("searchOverlay");
  const input = document.getElementById("searchInput");
  const list = document.getElementById("searchResults");

  fetch("./search-index.json")
    .then((r) => r.json())
    .then((data) => {
      index = data;
    })
    .catch(() => {
      index = [];
    });

  function score(item, terms) {
    const haystack = (
      item.title +
      " " +
      item.section +
      " " +
      (item.keywords || "")
    ).toLowerCase();
    let s = 0;
    for (const t of terms) {
      if (!t) continue;
      if (item.title.toLowerCase().includes(t)) s += 5;
      if (haystack.includes(t)) s += 2;
    }
    return s;
  }

  function render() {
    if (!input.value.trim()) {
      list.innerHTML =
        '<div class="empty">Type to search the documentation…</div>';
      return;
    }
    if (results.length === 0) {
      list.innerHTML = '<div class="empty">No matches.</div>';
      return;
    }
    list.innerHTML = results
      .map(
        (r, i) =>
          `<a class="result ${i === active ? "active" : ""}" href="${r.url}">
            <div class="title">${r.title}</div>
            <div class="meta"><span class="tag">${r.section}</span> — ${r.description || ""}</div>
          </a>`,
      )
      .join("");
  }

  function search() {
    const terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    results = index
      .map((item) => ({ item, s: score(item, terms) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 12)
      .map((x) => x.item);
    active = 0;
    render();
  }

  function open() {
    overlay.classList.add("open");
    input.value = "";
    results = [];
    render();
    setTimeout(() => input.focus(), 0);
  }

  function close() {
    overlay.classList.remove("open");
  }

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      overlay.classList.contains("open") ? close() : open();
    } else if (e.key === "Escape") {
      close();
    } else if (overlay.classList.contains("open")) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        active = Math.min(active + 1, results.length - 1);
        render();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        active = Math.max(active - 1, 0);
        render();
      } else if (e.key === "Enter" && results[active]) {
        window.location.href = results[active].url;
      }
    }
  });

  if (input) input.addEventListener("input", search);
  if (overlay)
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

  const trigger = document.getElementById("searchTrigger");
  if (trigger) trigger.addEventListener("click", open);
})();
