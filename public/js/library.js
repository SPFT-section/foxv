"use strict";

let state = { genre: "all", sort: "title", followingOnly: false, folder: null, search: "" };

function bookById(id) {
  return NOVELS.find(b => b.id === id) || null;
}

function allGenres() {
  const set = new Set();
  NOVELS.forEach(b => b.tags.forEach(t => set.add(t)));
  return Array.from(set);
}

function followBtnMarkup(book) {
  const active = getFollows().includes(book.id) ? " active" : "";
  return `<button class="follow-btn${active}" data-follow="${book.id}" title="Follow" aria-label="Follow">${icon("heart", 15)}</button>`;
}

function renderCard(book, showFollow = true) {
  const el = document.createElement("a");
  el.className = "book-card";
  el.href = "novel.html?book=" + encodeURIComponent(book.id);
  const p = progressOf(book);
  const done = p >= 100;
  el.innerHTML = `
    <div class="cover" style="background:${book.color}">
      ${done ? `<span class="status done">${icon("check", 11)} Done</span>` : `<span class="status ongoing">${icon("bolt", 10)} Ongoing</span>`}
      ${showFollow ? followBtnMarkup(book) : ""}
      <div class="tint"></div>
      <span class="cover-icon">${icon("book-open", 22)}</span>
      <h3>${book.title}</h3>
    </div>
    <div class="card-body">
      <span class="author">${book.author}</span>
      <div class="tags">${book.tags.map(t => `<span class="tag">${t}</span>`).join("")}</div>
      <div class="progress">${icon("bookmark", 12)} ${p}% read</div>
      <div class="progress-bar"><i style="width:${p}%"></i></div>
    </div>`;
  return el;
}

function renderRail() {
  const wrap = document.getElementById("railNovels");
  if (!wrap) return;
  wrap.innerHTML = "";
  NOVELS.slice().reverse().forEach(book => {
    const card = document.createElement("a");
    card.className = "rail-card";
    card.href = "novel.html?book=" + encodeURIComponent(book.id);
    const p = progressOf(book);
    const done = p >= 100;
    card.innerHTML = `
      <div class="rail-cover" style="background:${book.color}">
        ${done ? `<span class="status done">${icon("check", 10)}</span>` : `<span class="status ongoing">${icon("bolt", 10)}</span>`}
        <div class="tint"></div>
        <span class="cover-icon">${icon("book-open", 16)}</span>
        <span class="rail-title">${book.title}</span>
      </div>
      <div class="rail-info">
        <span class="author">${book.author}</span>
        <span class="progress">${p}%</span>
      </div>`;
    wrap.appendChild(card);
  });
}

function visibleBooks() {
  const q = state.search.trim().toLowerCase();
  let list = NOVELS.filter(b => {
    if (state.genre !== "all" && !b.tags.includes(state.genre)) return false;
    if (state.followingOnly && !getFollows().includes(b.id)) return false;
    if (state.folder && !(getFolders()[state.folder] || []).includes(b.id)) return false;
    if (q && !(b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) ||
      b.tags.some(t => t.toLowerCase().includes(q)))) return false;
    return true;
  });
  if (state.sort === "title") list.sort((a, b) => a.title.localeCompare(b.title));
  else if (state.sort === "progress") list.sort((a, b) => progressOf(b) - progressOf(a));
  else if (state.sort === "author") list.sort((a, b) => a.author.localeCompare(b.author));
  return list;
}

function renderGrid() {
  const grid = document.getElementById("bookGrid");
  if (!grid) return;
  grid.innerHTML = "";
  visibleBooks().forEach(b => grid.appendChild(renderCard(b)));
  const empty = document.getElementById("noResults");
  if (empty) empty.style.display = visibleBooks().length ? "none" : "block";
}

function renderContinue() {
  const wrap = document.getElementById("continueCard");
  const list = document.getElementById("continueList");
  if (!wrap || !list) return;
  const active = NOVELS.filter(b => progressOf(b) > 0 && progressOf(b) < 100);
  wrap.style.display = active.length ? "" : "none";
  list.innerHTML = "";
  active.forEach(b => {
    const p = progressOf(b);
    const ch = b.chapters[Math.min(b.chapters.length - 1, Math.floor(p / 100 * b.chapters.length))];
    const item = document.createElement("a");
    item.className = "row-item";
    item.href = ch ? "reader.html?book=" + encodeURIComponent(b.id) + "&chapter=" + ch.id : "novel.html?book=" + encodeURIComponent(b.id);
    item.innerHTML = `
      <div class="row-cover" style="background:${b.color}">
        <div class="tint"></div>
        <span class="cover-icon">${icon("book-open", 14)}</span>
      </div>
      <div class="row-main">
        <span class="t">${b.title}</span>
        <span class="s">${ch ? ch.title : "Start reading"}</span>
      </div>
      <div class="row-side">
        <span class="s">${p}%</span>
        <div class="progress-bar"><i style="width:${p}%"></i></div>
      </div>`;
    list.appendChild(item);
  });
}

function renderRecent() {
  const wrap = document.getElementById("recentList");
  if (!wrap) return;
  wrap.innerHTML = "";
  NOVELS.slice().reverse().forEach(b => {
    const last = b.chapters[b.chapters.length - 1];
    const item = document.createElement("a");
    item.className = "row-item";
    item.href = last ? "reader.html?book=" + encodeURIComponent(b.id) + "&chapter=" + last.id : "novel.html?book=" + encodeURIComponent(b.id);
    item.innerHTML = `
      <div class="row-cover" style="background:${b.color}">
        <div class="tint"></div>
        <span class="cover-icon">${icon("book-open", 14)}</span>
      </div>
      <div class="row-main">
        <span class="t">${b.title}</span>
        <span class="s">${last ? last.title : "—"} · ${icon("clock", 11)} ${b.updated}</span>
      </div>
      <div class="row-side"><span class="chip">${b.chapters.length} ch</span></div>`;
    wrap.appendChild(item);
  });
}

function renderRanking() {
  const wrap = document.getElementById("rankList");
  if (!wrap) return;
  const ranked = NOVELS.slice().sort((a, b) => (b.followers || 0) - (a.followers || 0));
  wrap.innerHTML = "";
  ranked.forEach((b, i) => {
    const item = document.createElement("a");
    item.className = "rank-item";
    item.href = "novel.html?book=" + encodeURIComponent(b.id);
    item.innerHTML = `
      <span class="rank-num">${i + 1}</span>
      <div class="rank-info">
        <span class="t">${b.title}</span>
        <span class="s">${b.author}</span>
      </div>
      <span class="rank-votes">${icon("heart", 11)} ${b.followers || 0}</span>`;
    wrap.appendChild(item);
  });
}

function renderGenreChips() {
  const wrap = document.getElementById("genreChips");
  if (!wrap) return;
  wrap.innerHTML = "";
  ["all", ...allGenres()].forEach(g => {
    const b = document.createElement("button");
    b.className = "chip-btn" + (state.genre === g ? " active" : "");
    b.textContent = g === "all" ? "All genres" : g;
    b.addEventListener("click", () => { state.genre = g; setActiveChips(); renderGrid(); });
    wrap.appendChild(b);
  });
}

function setActiveChips() {
  document.querySelectorAll("#genreChips .chip-btn").forEach((c, i) => {
    const g = ["all", ...allGenres()][i];
    c.classList.toggle("active", state.genre === g);
  });
  const fol = document.getElementById("followFilter");
  if (fol) fol.classList.toggle("active", state.followingOnly);
  document.querySelectorAll(".folder-chip").forEach(c =>
    c.classList.toggle("active", state.folder === c.dataset.folder)
  );
}

function renderFolders() {
  const wrap = document.getElementById("folderRow");
  if (!wrap) return;
  wrap.innerHTML = "";
  const folders = getFolders();
  Object.keys(folders).forEach(name => {
    const b = document.createElement("button");
    b.className = "folder-chip" + (state.folder === name ? " active" : "");
    b.dataset.folder = name;
    b.innerHTML = icon("folder", 13) + " " + name + " (" + folders[name].length + ")";
    b.addEventListener("click", () => {
      state.folder = state.folder === name ? null : name;
      setActiveChips();
      renderGrid();
      renderContinue();
    });
    wrap.appendChild(b);
  });
  const add = document.createElement("button");
  add.className = "folder-chip";
  add.innerHTML = icon("plus", 13) + " New folder";
  add.addEventListener("click", () => {
    const name = prompt("Folder name:");
    if (!name || !name.trim()) return;
    const folders = getFolders();
    folders[name.trim()] = folders[name.trim()] || [];
    saveFolders(folders);
    renderFolders();
  });
  wrap.appendChild(add);
}

function renderFollowToggles() {
  document.querySelectorAll(".follow-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.follow;
      let follows = getFollows();
      if (follows.includes(id)) follows = follows.filter(f => f !== id);
      else follows.push(id);
      saveFollows(follows);
      btn.classList.toggle("active", follows.includes(id));
      if (state.followingOnly) renderGrid();
      renderContinue();
    });
  });
}

/* ---------- requests ---------- */
function renderRequests() {
  const grid = document.getElementById("requestGrid");
  const count = document.getElementById("requestCount");
  if (count) count.textContent = getRequests().length;
  if (!grid) return;
  grid.innerHTML = "";
  const list = getRequests().slice().reverse();
  if (!list.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1;">No requests yet — be the first to suggest a novel!</div>`;
    return;
  }
  list.forEach(req => {
    const card = document.createElement("div");
    card.className = "request-card";
    card.innerHTML = `
      <h4>${req.title}</h4>
      ${req.url ? `<a href="${req.url}" target="_blank" rel="noopener">${req.url}</a>` : ""}
      <p>${req.note || "—"}</p>
      <div class="req-meta"><span class="req-status">Pending</span><span>${req.date}</span></div>`;
    grid.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await FoxDb.ready;
  const nc = document.getElementById("novelCount");
  if (nc) nc.textContent = NOVELS.length;
  const cc = document.getElementById("chapterCount");
  if (cc) cc.textContent = NOVELS.reduce((n, b) => n + b.chapters.length, 0);
  renderGenreChips();
  renderFolders();
  renderGrid();
  renderContinue();
  renderRail();
  renderRecent();
  renderRanking();
  renderRequests();
  renderFollowToggles();
  const sn = document.getElementById("statNovels");
  if (sn) sn.textContent = NOVELS.length + " novels";
  const sc = document.getElementById("statChapters");
  if (sc) sc.textContent = NOVELS.reduce((n, b) => n + b.chapters.length, 0) + " chapters";

  const input = document.getElementById("search");
  if (input) input.addEventListener("input", e => { state.search = e.target.value; renderGrid(); });

  const sortSel = document.getElementById("sortSel");
  if (sortSel) sortSel.addEventListener("change", e => { state.sort = e.target.value; renderGrid(); });

  const fol = document.getElementById("followFilter");
  if (fol) fol.addEventListener("click", () => {
    state.followingOnly = !state.followingOnly;
    setActiveChips();
    renderGrid();
  });

  const reqForm = document.getElementById("requestForm");
  if (reqForm) reqForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(reqForm);
    const title = (fd.get("title") || "").trim();
    if (!title) return;
    const reqs = getRequests();
    reqs.push({
      title,
      url: (fd.get("url") || "").trim(),
      note: (fd.get("note") || "").trim(),
      date: new Date().toISOString().slice(0, 10)
    });
    saveRequests(reqs);
    reqForm.reset();
    renderRequests();
  });
});