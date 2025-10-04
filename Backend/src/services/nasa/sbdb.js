import fetch from "node-fetch";

// JPL Small-Body Database APIs
// Lookup: orbital/physical params
export async function sbdbLookup(s) {
  if (!s) throw new Error("Query param 's' (name/designation) is required");
  const url = `https://ssd-api.jpl.nasa.gov/sbdb.api?s=${encodeURIComponent(s)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`SBDB lookup error: ${r.status}`);
  return r.json();
}

// Close-Approach Data (CAD)
// Example params: { "date-min":"2025-01-01", "date-max":"2026-01-01", "dist-max":"10LD" }
export async function sbdbCAD(params = {}) {
  const q = new URLSearchParams(params);
  const url = `https://ssd-api.jpl.nasa.gov/cad.api?${q.toString()}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`SBDB CAD error: ${r.status}`);
  return r.json();
}