import fetch from "node-fetch";

const BASE = "https://api.nasa.gov/neo/rest/v1";

export async function neowsFeed(start, end) {
  const url = `${BASE}/feed?start_date=${start}&end_date=${end}&api_key=${process.env.NASA_API_KEY || "DEMO_KEY"}`;
  const r = await fetch(url);
  return r.json();
}

export async function neowsLookup(id) {
  const url = `${BASE}/neo/${id}?api_key=${process.env.NASA_API_KEY || "DEMO_KEY"}`;
  const r = await fetch(url);
  return r.json();
}