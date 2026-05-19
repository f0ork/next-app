import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { embedText } from "./embeddings";

export interface KBEntry {
  id: string;
  title: string;
  content: string;
  summary: string;
  category: string;
  tags: string[];
  source: string;
  sourceType: "text" | "url" | "file";
  createdAt: string;
  updatedAt: string;
  embedding?: number[];
}

interface VectorEntry {
  id: string;
  vector: number[];
}

let db: Database.Database | null = null;
let vectors: VectorEntry[] = [];
let vectorsLoaded = false;

const DATA_DIR = process.env.KB_DATA_DIR ?? "./data/kb";

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function getVectorPath(): string {
  return path.join(DATA_DIR, "vectors.json");
}

function loadVectors(): VectorEntry[] {
  if (vectorsLoaded) return vectors;
  const p = getVectorPath();
  if (fs.existsSync(p)) {
    try { vectors = JSON.parse(fs.readFileSync(p, "utf-8")); } catch { vectors = []; }
  }
  vectorsLoaded = true;
  return vectors;
}

function saveVectors() {
  ensureDir(DATA_DIR);
  fs.writeFileSync(getVectorPath(), JSON.stringify(vectors));
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}

export function getDb(): Database.Database {
  if (db) return db;
  ensureDir(DATA_DIR);
  db = new Database(path.join(DATA_DIR, "knowledge.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT DEFAULT '',
      category TEXT DEFAULT '未分类',
      tags TEXT DEFAULT '[]',
      source TEXT DEFAULT '',
      sourceType TEXT DEFAULT 'text',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_category ON entries(category);
    CREATE INDEX IF NOT EXISTS idx_created ON entries(createdAt);
  `);
  return db;
}

export async function saveEntry(entry: KBEntry): Promise<void> {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO entries (id, title, content, summary, category, tags, source, sourceType, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.id, entry.title, entry.content, entry.summary, entry.category,
    JSON.stringify(entry.tags), entry.source, entry.sourceType,
    entry.createdAt, entry.updatedAt
  );

  const vector = entry.embedding ?? (await embedText(entry.summary + " " + entry.title));
  const vecs = loadVectors();
  const idx = vecs.findIndex((v) => v.id === entry.id);
  const entry_vec: VectorEntry = { id: entry.id, vector };
  if (idx >= 0) vecs[idx] = entry_vec;
  else vecs.push(entry_vec);
  saveVectors();
}

export function getEntry(id: string): KBEntry | undefined {
  const row = getDb().prepare("SELECT * FROM entries WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToEntry(row) : undefined;
}

export function listEntries(limit = 100): KBEntry[] {
  return (getDb().prepare("SELECT * FROM entries ORDER BY updatedAt DESC LIMIT ?").all(limit) as Array<Record<string, unknown>>).map(rowToEntry);
}

export function deleteEntry(id: string): boolean {
  const result = getDb().prepare("DELETE FROM entries WHERE id = ?").run(id);
  vectors = loadVectors().filter((v) => v.id !== id);
  saveVectors();
  return result.changes > 0;
}

export async function searchVectors(query: string, topK = 5): Promise<Array<{ id: string; score: number }>> {
  const queryVec = await embedText(query);
  const vecs = loadVectors();
  const scored = vecs
    .map((v) => ({ id: v.id, score: cosineSimilarity(queryVec, v.vector) }))
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export function getCategories(): Array<{ name: string; count: number }> {
  return getDb().prepare(
    "SELECT category as name, COUNT(*) as count FROM entries GROUP BY category ORDER BY count DESC"
  ).all() as Array<{ name: string; count: number }>;
}

export function getStats(): { totalEntries: number; categories: number; lastUpdated: string | null } {
  const db = getDb();
  const total = (db.prepare("SELECT COUNT(*) as c FROM entries").get() as { c: number }).c;
  const cats = (db.prepare("SELECT COUNT(DISTINCT category) as c FROM entries").get() as { c: number }).c;
  const last = db.prepare("SELECT MAX(updatedAt) as t FROM entries").get() as { t: string | null };
  return { totalEntries: total, categories: cats, lastUpdated: last.t };
}

export function exportAll(): KBEntry[] {
  return listEntries(10000);
}

export async function importEntries(entries: KBEntry[]): Promise<number> {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO entries (id, title, content, summary, category, tags, source, sourceType, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const vecs = loadVectors();
  let count = 0;

  for (const entry of entries) {
    stmt.run(
      entry.id, entry.title, entry.content, entry.summary, entry.category,
      JSON.stringify(entry.tags), entry.source, entry.sourceType,
      entry.createdAt, entry.updatedAt
    );
    const vector = entry.embedding ?? (await embedText(entry.summary + " " + entry.title));
    const idx = vecs.findIndex((v) => v.id === entry.id);
    const entry_vec: VectorEntry = { id: entry.id, vector };
    if (idx >= 0) vecs[idx] = entry_vec;
    else vecs.push(entry_vec);
    count++;
  }
  saveVectors();
  return count;
}

export async function findDuplicates(): Promise<Array<[string, string]>> {
  const vecs = loadVectors();
  const duplicates: Array<[string, string]> = [];
  for (let i = 0; i < vecs.length; i++) {
    for (let j = i + 1; j < vecs.length; j++) {
      if (cosineSimilarity(vecs[i].vector, vecs[j].vector) > 0.95) {
        duplicates.push([vecs[i].id, vecs[j].id]);
      }
    }
  }
  return duplicates;
}

export async function cleanupOldEntries(daysOld = 90): Promise<number> {
  const db = getDb();
  const cutoff = new Date(Date.now() - daysOld * 86400000).toISOString();
  const stale = db.prepare("SELECT id FROM entries WHERE updatedAt < ? AND category != 'pinned'").all(cutoff) as Array<{ id: string }>;
  for (const { id } of stale) deleteEntry(id);
  return stale.length;
}

function rowToEntry(row: Record<string, unknown>): KBEntry {
  return {
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    summary: row.summary as string,
    category: row.category as string,
    tags: typeof row.tags === "string" ? JSON.parse(row.tags) : [],
    source: row.source as string,
    sourceType: row.sourceType as "text" | "url" | "file",
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}
