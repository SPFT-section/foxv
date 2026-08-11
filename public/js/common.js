"use strict";

const THEME_KEY = "foxv.theme";
const FONT_KEY = "foxv.font";
const STORE_KEY = "foxv.v1";
const SETTINGS_KEY = "foxv.settings";
const FOLLOWS_KEY = "foxv.follows";
const FOLDERS_KEY = "foxv.folders";
const REQUESTS_KEY = "foxv.requests";

const DEFAULT_SETTINGS = {
  font: "nunito",
  lineHeight: 1.95,
  quotes: "smart",
  customBg: "",
  customText: "",
  engine: "google"
};

const FONTS = {
  nunito: "'Nunito Sans', 'Segoe UI', Roboto, Arial, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  palatino: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
  sans: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  mono: "'JetBrains Mono', Consolas, 'Courier New', monospace",
  comic: "'Comic Sans MS', 'Chalkboard SE', cursive"
};

const existing = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");

const store = {
  theme: localStorage.getItem(THEME_KEY) || "light",
  fontSize: parseInt(localStorage.getItem(FONT_KEY) || "18", 10),
  reads: existing
};

function saveReads() { localStorage.setItem(STORE_KEY, JSON.stringify(store.reads)); }

function getRead(bookId) {
  if (!store.reads[bookId]) store.reads[bookId] = { chapter: 0, done: [] };
  return store.reads[bookId];
}

function markDone(bookId, idx) {
  const r = getRead(bookId);
  if (!r.done.includes(idx)) { r.done.push(idx); saveReads(); }
}

function progressOf(book) {
  const r = getRead(book.id);
  return Math.round((r.done.length / book.chapters.length) * 100);
}

/* ---------- reader settings ---------- */
function getSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}) };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

/* ---------- community data ---------- */
function getFollows() {
  try { return JSON.parse(localStorage.getItem(FOLLOWS_KEY)) || []; } catch (e) { return []; }
}
function saveFollows(list) { localStorage.setItem(FOLLOWS_KEY, JSON.stringify(list)); }

function getFolders() {
  try { return JSON.parse(localStorage.getItem(FOLDERS_KEY)) || {}; } catch (e) { return {}; }
}
function saveFolders(f) { localStorage.setItem(FOLDERS_KEY, JSON.stringify(f)); }

function getRequests() {
  try { return JSON.parse(localStorage.getItem(REQUESTS_KEY)) || []; } catch (e) { return []; }
}
function saveRequests(list) { localStorage.setItem(REQUESTS_KEY, JSON.stringify(list)); }

function formatQuotes(text, style) {
  const smart = text.replace(/"([^"]*)"/g, (m, g) => "\u201C" + g + "\u201D");
  if (style === "smart" || style === "none") return smart;
  const pairs = { jp: ["\u300C", "\u300D"], kor: ["\u300E", "\u300F"], cn: ["\u3010", "\u3011"] };
  const [o, c] = pairs[style] || pairs.jp;
  return smart.replace(/\u201C([^\u201D]*)\u201D/g, (m, g) => o + g + c);
}

function applyTheme() {
  const root = document.documentElement;
  root.classList.toggle("dark", store.theme === "dark");
  root.dataset.theme = store.theme === "dark" ? "" : store.theme;
  const btn = document.getElementById("themeToggle");
  if (btn) btn.innerHTML = icon(store.theme === "dark" ? "sun" : "moon", 17);
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-icon]").forEach(el => {
    el.innerHTML = icon(el.dataset.icon || "", +(el.dataset.size || 18));
  });

  applyTheme();
  const btn = document.getElementById("themeToggle");
  if (btn) btn.addEventListener("click", () => {
    store.theme = store.theme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, store.theme);
    applyTheme();
  });
  const font = document.getElementById("fontSize");
  if (font) {
    font.value = store.fontSize;
    font.addEventListener("input", (e) => {
      store.fontSize = e.target.value;
      localStorage.setItem(FONT_KEY, store.fontSize);
      document.querySelectorAll(".chapter-text").forEach(t => t.style.fontSize = store.fontSize + "px");
    });
  }
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
});