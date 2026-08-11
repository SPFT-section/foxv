"use strict";

function bookById(id) {
  return NOVELS.find(b => b.id === id) || null;
}

function renderNovelPage(book) {
  const main = document.getElementById("novelMain");
  if (!main) return;
  const r = getRead(book.id);
  const p = progressOf(book);
  const followed = getFollows().includes(book.id);
  const done = p >= 100;

  main.innerHTML = `
    <div class="card fix-size">
      <div class="card-header">
        <h2>${icon("book-open", 17)} ${book.title}</h2>
        <div class="card-action"><a class="back-link" href="index.html"><i data-icon="arrow-left" data-size="13"></i> Library</a></div>
      </div>
      <div class="card-body">
        <h1 class="novel-title">${book.title}</h1>
        <p class="novel-raw">${book.author} · ${book.tags.join(" · ")}</p>

        <div class="cover-block">
          <div class="cover-main" style="background:${book.color}">
            <div class="blur-bg" style="background:${book.color}"></div>
            <div class="cover-front">
              <div class="tint"></div>
              <span class="cover-icon">${icon("book-open", 28)}</span>
              <h3>${book.title}</h3>
            </div>
          </div>
          <div class="cover-side">
            <div class="stats-grid">
              <div class="stat-box">
                <span class="stat-val">${book.chapters.length}</span>
                <span class="stat-label">${icon("book-open", 11)} Chapters</span>
              </div>
              <div class="stat-box">
                <span class="stat-val dot ${done ? "green" : ""}">${p}%</span>
                <span class="stat-label">${icon("bookmark", 11)} Read</span>
              </div>
              <div class="stat-box">
                <span class="stat-val dot ${done ? "green" : ""}">${done ? "Done" : "Ongoing"}</span>
                <span class="stat-label">${icon("clock", 11)} Status</span>
              </div>
            </div>
            <div class="actions-row">
              <a class="btn primary flex-1" href="reader.html?book=${encodeURIComponent(book.id)}"><i data-icon="book-open" data-size="15"></i> ${p > 0 ? "Continue reading" : "Start reading"}</a>
              <button class="btn${followed ? " active" : ""}" id="followBtn">${icon("heart", 15)} ${followed ? "Following" : "Follow"}</button>
              <span class="vote-chip">${icon("heart", 12)} ${book.followers || 0}</span>
            </div>
            <div class="genre-row">${book.tags.map(t => `<span class="tag">${t}</span>`).join("")}</div>
            <p class="blurb">${book.blurb}</p>
          </div>
        </div>

        <div class="upc">
          <div class="upc-label"><span>READING PROGRESS</span><span class="upc-val">${r.done.length} of ${book.chapters.length} chapters · ${p}%</span></div>
          <div class="progress-bar"><i style="width:${p}%"></i></div>
        </div>

        <h3 class="section-title">${icon("library", 17)} Chapters</h3>
        <p class="section-sub">${r.done.length} of ${book.chapters.length} completed</p>
        <ol class="chapter-list" id="chapterList"></ol>
      </div>
    </div>`;

  const list = document.getElementById("chapterList");
  book.chapters.forEach((ch, i) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "reader.html?book=" + encodeURIComponent(book.id) + "&ch=" + i;
    const done = r.done.includes(i);
    if (done) a.classList.add("done");
    a.innerHTML = `${done ? icon("check", 14) : icon("chevron-right", 14)} <span class="idx">${String(i + 1).padStart(2, "0")}</span> <span class="ch-title">${ch.title}</span>`;
    li.appendChild(a);
    list.appendChild(li);
  });

  document.getElementById("followBtn").addEventListener("click", () => {
    let follows = getFollows();
    if (follows.includes(book.id)) follows = follows.filter(f => f !== book.id);
    else follows.push(book.id);
    saveFollows(follows);
    const b = document.getElementById("followBtn");
    b.innerHTML = icon("heart", 15) + (follows.includes(book.id) ? " Following" : " Follow");
    b.classList.toggle("active", follows.includes(book.id));
  });

  document.querySelectorAll("[data-icon]").forEach(el => {
    if (!el.innerHTML.trim()) el.innerHTML = icon(el.dataset.icon || "", +(el.dataset.size || 18));
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await FoxDb.ready;
  const params = new URLSearchParams(window.location.search);
  const book = bookById(params.get("book"));
  if (!book) {
    window.location.href = "index.html";
    return;
  }
  document.title = book.title + " — Fox-V";
  renderNovelPage(book);
});