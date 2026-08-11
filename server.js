"use strict";

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("render.com")
    ? { rejectUnauthorized: false }
    : undefined
});

const TX_KEY = process.env.GOOGLE_TRANSLATE_KEY || "";

const MAX_CHUNK = 4400;
const cache = new Map();

async function translateChunk(text, target, source) {
  const key = `${source}:${target}:${text}`;
  if (cache.has(key)) return cache.get(key);

  let out;
  if (TX_KEY) {
    const url = new URL("https://translation.googleapis.com/language/translate/v2");
    url.searchParams.set("key", TX_KEY);
    url.searchParams.set("target", target);
    if (source) url.searchParams.set("source", source);
    url.searchParams.set("format", "text");
    url.searchParams.set("q", text);
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error("translate api error " + res.status);
    const body = await res.json();
    out = body.data.translations.map(t => t.translatedText).join(" ");
  } else {
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", source || "auto");
    url.searchParams.set("tl", target);
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", text);
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error("translate proxy error " + res.status);
    const body = await res.json();
    out = body[0].map(seg => seg[0]).join("");
  }

  if (cache.size > 400) cache.clear();
  cache.set(key, out);
  return out;
}

async function sqlInit() {
  const query = `
    CREATE TABLE IF NOT EXISTS progress (
      user_id TEXT PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  return pool.query(query);
}
sqlInit().catch(err => console.error("migration failed:", err.message));

const app = express();
app.use(cors());
app.use(express.json({ limit: "256kb" }));
app.use(express.static(__dirname + "/public"));

app.get("/health", (req, res) => res.json({ ok: true }));

app.get("/api/progress/:uid", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT data FROM progress WHERE user_id = $1", [req.params.uid]);
    res.json({ data: rows.length ? rows[0].data : {} });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/progress/:uid", async (req, res) => {
  try {
    const data = req.body && typeof req.body.data === "object" ? req.body.data : {};
    await pool.query(
      `INSERT INTO progress (user_id, data, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = now()`,
      [req.params.uid, JSON.stringify(data)]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function translateParagraph(p, target, source) {
  if (p.length <= MAX_CHUNK) {
    return translateChunk(p, target, source);
  }
  const sentences = p.match(/[^.!?]+[.!?]+["']?|\S[^.!?]*$/g) || [];
  const pieces = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > MAX_CHUNK && cur) {
      pieces.push(cur.trim());
      cur = s;
    } else {
      cur += " " + s.trim();
    }
  }
  if (cur.trim()) pieces.push(cur.trim());
  const out = await Promise.all(pieces.map(x => translateChunk(x, target, source)));
  return out.join("");
}

app.get("/api/translate", async (req, res) => {
  try {
    const tl = String(req.query.tl || "").trim();
    const sl = String(req.query.sl || "auto").trim();
    const q = String(req.query.q || "").trim();
    if (!tl || !q) return res.status(400).json({ error: "tl and q are required" });
    if (q.length > 20000) return res.status(413).json({ error: "text too long" });

    const paragraphs = q.split("\n").filter(s => s.trim().length > 0);
    const results = await Promise.all(paragraphs.map(p => translateParagraph(p, tl, sl)));
    res.json({ text: results.join("\n"), engine: TX_KEY ? "google-cloud-v2" : "gte-gtx" });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "not found" });
  res.sendFile(__dirname + "/public/index.html");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`fox-v api listening on ${port}`));