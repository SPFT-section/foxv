"use strict";

(function () {
  const API_BASE = "/api/translate";
  const GTX = "https://translate.googleapis.com/translate_a/single";
  const LANG_KEY = "foxv.lang";
  const CACHE_PREFIX = "foxv.tr.";

  function getLang() {
    return localStorage.getItem(LANG_KEY) || "en";
  }
  function setLang(l) {
    localStorage.setItem(LANG_KEY, l);
  }

  function cacheKey(book, idx, lang) {
    return CACHE_PREFIX + book + "." + idx + "." + lang;
  }

  function getCached(k) {
    try {
      const v = JSON.parse(localStorage.getItem(k));
      if (v && Array.isArray(v.paras)) return v.paras;
    } catch (e) {}
    return null;
  }

  function setCached(k, paras) {
    try {
      const keys = Object.keys(localStorage).filter(x => x.startsWith(CACHE_PREFIX));
      if (keys.length > 60) {
        keys.sort((a, b) => (JSON.parse(localStorage.getItem(a) || "{}").ts || 0) - (JSON.parse(localStorage.getItem(b) || "{}").ts || 0));
        keys.slice(0, keys.length - 60).forEach(old => localStorage.removeItem(old));
      }
      localStorage.setItem(k, JSON.stringify({ ts: Date.now(), paras }));
    } catch (e) {}
  }

  async function gtxOne(text, lang) {
    const chunks = [];
    if (text.length > 4000) {
      const pieces = text.split(/(?<=[.!?])\s+/);
      let cur = "";
      for (const s of pieces) {
        if ((cur + s).length > 4000 && cur) {
          chunks.push(cur.trim());
          cur = s;
        } else cur += " " + s.trim();
      }
      if (cur.trim()) chunks.push(cur.trim());
    } else {
      chunks.push(text);
    }
    const parts = await Promise.all(chunks.map(async c => {
      const url = new URL(GTX);
      url.searchParams.set("client", "gtx");
      url.searchParams.set("sl", "auto");
      url.searchParams.set("tl", lang);
      url.searchParams.set("dt", "t");
      url.searchParams.set("q", c);
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error("gtx " + res.status);
      const body = await res.json();
      return body[0].map(seg => seg[0] || "").join("");
    }));
    return parts.join("");
  }

  async function gtx(paragraphs, lang) {
    const out = await Promise.all(paragraphs.map(p => gtxOne(p, lang)));
    return out;
  }

  async function apiTranslate(paragraphs, lang) {
    const res = await fetch(
      API_BASE + "?tl=" + encodeURIComponent(lang) + "&sl=auto&q=" + encodeURIComponent(paragraphs.join("\n")),
      { signal: AbortSignal.timeout(30000) }
    );
    if (!res.ok) throw new Error("api " + res.status);
    const body = await res.json();
    return String(body.text || "").split("\n").filter(s => s.trim().length > 0);
  }

  async function translateChapter(book, idx, paragraphs) {
    const lang = getLang();
    if (lang === "en") return null;
    const k = cacheKey(book, idx, lang);
    const hit = getCached(k);
    if (hit) return hit;

    let paras;
    const primary = (getSettings().engine === "google-api") ? "api" : "gtx";
    try {
      paras = primary === "gtx" ? await gtx(paragraphs, lang) : await apiTranslate(paragraphs, lang);
    } catch (e1) {
      try {
        paras = primary === "gtx" ? await apiTranslate(paragraphs, lang) : await gtx(paragraphs, lang);
      } catch (e2) {
        throw new Error("no translation engine available");
      }
    }
    if (!Array.isArray(paras) || paras.length === 0 || paras.join("").trim().length === 0) {
      throw new Error("empty translation");
    }
    if (paras.length < paragraphs.length) {
      while (paras.length < paragraphs.length) paras.push(paragraphs[paras.length] || "");
    }
    paras = paras.slice(0, paragraphs.length);
    setCached(k, paras);
    return paras;
  }

  function render(el, paras) {
    el.innerHTML = "";
    const s = getSettings();
    paras.forEach(p => {
      const d = document.createElement("p");
      d.textContent = formatQuotes(p, s.quotes);
      el.appendChild(d);
    });
    el.style.fontSize = store.fontSize + "px";
    el.style.fontFamily = FONTS[s.font] || FONTS.georgia;
    el.style.lineHeight = s.lineHeight || 1.95;
    el.style.color = s.customText || "";
  }

  async function hydrate(book, idx, paragraphs, el) {
    const chip = document.getElementById("trChip");
    const lang = getLang();
    if (lang === "en") {
      render(el, paragraphs);
      if (chip) chip.hidden = true;
      return;
    }
    if (chip) {
      chip.textContent = "Translating to " + lang + "…";
      chip.hidden = false;
    }
    try {
      const paras = await translateChapter(book, idx, paragraphs);
      render(el, paras || paragraphs);
      if (chip) {
        chip.textContent = "Translated with Google Translate (" + lang + ")";
        chip.hidden = false;
      }
    } catch (err) {
      render(el, paragraphs);
      if (chip) chip.textContent = "Translation unavailable — showing original";
    }
  }

  window.FoxTr = { getLang, setLang, hydrate };
})();