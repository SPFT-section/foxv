"use strict";

(function () {
  const API_BASE = "https://foxv-api.onrender.com";
  const UID_KEY = "foxv.uid";

  function getUid() {
    let uid = localStorage.getItem(UID_KEY);
    if (!uid) {
      uid = (crypto.randomUUID ? crypto.randomUUID() : "u-" + Math.random().toString(36).slice(2) + Date.now().toString(36));
      localStorage.setItem(UID_KEY, uid);
    }
    return uid;
  }

  let readyResolve;
  const ready = new Promise(res => { readyResolve = res; });

  async function loadRemote() {
    try {
      const res = await fetch(API_BASE + "/api/progress/" + encodeURIComponent(getUid()), { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error("bad status");
      const data = await res.json();
      if (data && data.data) {
        const remote = data.data;
        for (const id of Object.keys(remote)) {
          const rr = remote[id];
          const local = store.reads[id] || { chapter: 0, done: [] };
          local.chapter = rr.chapter != null ? rr.chapter : local.chapter;
          local.done = Array.from(new Set([...(rr.done || []), ...local.done]));
          store.reads[id] = local;
        }
        saveReads();
      }
    } catch (e) { /* offline or API down: keep local cache */ }
  }

  let saveTimer = null;
  function pushLocal() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      fetch(API_BASE + "/api/progress/" + encodeURIComponent(getUid()), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: store.reads }),
        signal: AbortSignal.timeout(8000)
      }).catch(() => {});
    }, 800);
  }

  Promise.resolve().then(async () => {
    await loadRemote();
    readyResolve();
  });

  window.FoxDb = { ready, pushLocal, getUid };
})();