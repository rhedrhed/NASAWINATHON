import fetch from "node-fetch";

const BASE = "https://api.nasa.gov/neo/rest/v1";
const KEY = process.env.NASA_API_KEY || "DEMO_KEY"; // replace in .env for higher limits

export async function neowsFeed(start, end) {
  if (!start || !end) throw new Error("start_date and end_date are required");
  const url = `${BASE}/feed?start_date=${start}&end_date=${end}&api_key=${KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`NeoWs feed error: ${r.status}`);
  return r.json();
}

export async function neowsLookup(id) {
  if (!id) throw new Error("NEO id is required");
  const url = `${BASE}/neo/${id}?api_key=${KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`NeoWs lookup error: ${r.status}`);
  return r.json();
}