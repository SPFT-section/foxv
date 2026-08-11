"use strict";

let currentBook = null;
let chapterIdx = 0;

function bookById(id) {
  return NOVELS.find(b => b.id === id) || null;
}

function setChapterRoute(idx) {
  const url = new URL(window.location.href);
  url.searchParams.set("ch", String(idx));
  history.replaceState(null, "", url);
}

function applyFormatting(el) {
  const s = getSettings();
  el.style.fontFamily = FONTS[s.font] || FONTS.georgia;
  el.style.lineHeight = s.lineHeight || 1.95;
  el.style.color = s.customText || "";
  document.body.style.background = s.customBg || "";
}

function formatBody(paras) {
  const s = getSettings();
  return paras.map(p => `<p>${formatQuotes(p, s.quotes)}</p>`).join("");
}

function renderSidebar(book) {
  const list = document.getElementById("chapterList");
  list.innerHTML = "";
  const r = getRead(book.id);
  book.chapters.forEach((c, i) => {
    const li = document.createElement("li");
    if (r.done.includes(i)) li.classList.add("done");
    const a = document.createElement("a");
    a.href = "reader.html?book=" + encodeURIComponent(book.id) + "&ch=" + i;
    a.textContent = c.title;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      showChapter(i);
    });
    li.appendChild(a);
    list.appendChild(li);
  });
  document.getElementById("sidebarTitle").textContent = book.title + " — Chapters";
}

function updateActive(idx) {
  document.querySelectorAll("#chapterList li a").forEach((a, i) =>
    a.classList.toggle("active", i === idx)
  );
}

function showChapter(idx, opts) {
  if (!currentBook) return;
  const book = currentBook;
  chapterIdx = Math.max(0, Math.min(idx, book.chapters.length - 1));
  const ch = book.chapters[chapterIdx];
  const r = getRead(book.id);
  r.chapter = chapterIdx;
  saveReads();
  FoxDb.pushLocal();
  setChapterRoute(chapterIdx);

  document.getElementById("readerMeta").textContent = `${book.title} — ${book.author}`;
  document.getElementById("readerTitle").textContent = ch.title;
  const textEl = document.getElementById("readerText");
  textEl.innerHTML = formatBody(ch.body);
  textEl.style.fontSize = store.fontSize + "px";
  applyFormatting(textEl);
  updateActive(chapterIdx);
  if (!(opts && opts.noTranslate)) FoxTr.hydrate(book.id, chapterIdx, ch.body, textEl);

  const prev = document.getElementById("prevBtn");
  prev.href = "reader.html?book=" + encodeURIComponent(book.id) + "&ch=" + (chapterIdx - 1);
  prev.style.pointerEvents = chapterIdx === 0 ? "none" : "auto";
  prev.style.opacity = chapterIdx === 0 ? ".45" : "1";

  const last = chapterIdx === book.chapters.length - 1;
  document.getElementById("nextBtn").innerHTML =
    (last ? icon("check", 15) : icon("arrow-right", 15)) + (last ? " Finish ✓" : " Next");

  const done = document.getElementById("markDone");
  done.innerHTML =
    icon("check", 13) + (r.done.includes(chapterIdx) ? " Marked done ✓" : " Mark chapter done");
}

function reapplyCurrentChapter() {
  if (!currentBook) return;
  const ch = currentBook.chapters[chapterIdx];
  const textEl = document.getElementById("readerText");
  textEl.innerHTML = formatBody(ch.body);
  textEl.style.fontSize = store.fontSize + "px";
  applyFormatting(textEl);
  FoxTr.hydrate(currentBook.id, chapterIdx, ch.body, textEl);
}

function init() {
  const params = new URLSearchParams(window.location.search);
  const book = bookById(params.get("book"));
  if (!book) {
    window.location.href = "index.html";
    return;
  }
  currentBook = book;
  const r = getRead(book.id);
  let start = parseInt(params.get("ch"), 10);
  if (isNaN(start)) start = Math.min(r.chapter, book.chapters.length - 1);
  renderSidebar(book);
  showChapter(start);

  document.getElementById("nextBtn").addEventListener("click", () => {
    if (chapterIdx < currentBook.chapters.length - 1) {
      showChapter(chapterIdx + 1);
    } else {
      markDone(currentBook.id, chapterIdx);
      FoxDb.pushLocal();
      renderSidebar(currentBook);
      updateActive(chapterIdx);
      alert("You finished " + currentBook.title + "!");
    }
  });

  document.getElementById("markDone").addEventListener("click", () => {
    markDone(currentBook.id, chapterIdx);
    FoxDb.pushLocal();
    renderSidebar(currentBook);
    updateActive(chapterIdx);
    document.getElementById("markDone").innerHTML = icon("check", 13) + " Marked done ✓";
  });

  document.getElementById("themeSel").addEventListener("change", (e) => {
    const root = document.documentElement;
    const val = e.target.value;
    if (val === "sepia") {
      root.classList.remove("dark");
      root.dataset.theme = "sepia";
    } else if (val === "dark") {
      root.classList.add("dark");
      root.dataset.theme = "";
    } else if (val === "light") {
      root.classList.remove("dark");
      root.dataset.theme = "";
    } else {
      applyTheme();
    }
  });

  const langSel = document.getElementById("langSel");
  if (langSel) {
    langSel.value = FoxTr.getLang();
    langSel.addEventListener("change", () => {
      FoxTr.setLang(langSel.value);
      reapplyCurrentChapter();
    });
  }

  const s = getSettings();

  const fontSel = document.getElementById("fontSel");
  if (fontSel) {
    fontSel.value = s.font;
    fontSel.addEventListener("change", () => {
      s.font = fontSel.value;
      saveSettings(s);
      reapplyCurrentChapter();
    });
  }

  const quotesSel = document.getElementById("quotesSel");
  if (quotesSel) {
    quotesSel.value = s.quotes;
    quotesSel.addEventListener("change", () => {
      s.quotes = quotesSel.value;
      saveSettings(s);
      reapplyCurrentChapter();
    });
  }

  const lineHeight = document.getElementById("lineHeight");
  if (lineHeight) {
    lineHeight.value = s.lineHeight;
    lineHeight.addEventListener("input", () => {
      s.lineHeight = parseFloat(lineHeight.value);
      saveSettings(s);
      const el = document.getElementById("readerText");
      el.style.lineHeight = s.lineHeight;
    });
  }

  const bgColor = document.getElementById("bgColor");
  if (bgColor) {
    bgColor.addEventListener("change", () => {
      s.customBg = bgColor.value;
      saveSettings(s);
      document.body.style.background = s.customBg;
    });
  }

  const textColor = document.getElementById("textColor");
  if (textColor) {
    textColor.addEventListener("change", () => {
      s.customText = textColor.value;
      saveSettings(s);
      document.getElementById("readerText").style.color = s.customText;
    });
  }

  const retranslate = document.getElementById("retranslateBtn");
  if (retranslate) {
    retranslate.addEventListener("click", () => {
      const prefix = "foxv.tr." + currentBook.id + "." + chapterIdx + ".";
      const doomed = Object.keys(localStorage).filter(k => k.startsWith(prefix));
      doomed.forEach(k => localStorage.removeItem(k));
      reapplyCurrentChapter();
    });
  }

  applyFormatting(document.getElementById("readerText"));
  applyFormatting(document.body);
}

document.addEventListener("DOMContentLoaded", async () => {
  await FoxDb.ready;
  init();
});