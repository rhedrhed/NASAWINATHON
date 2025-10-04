import fetch from "node-fetch";

const BASE = "https://ssd-api.jpl.nasa.gov";
const KEY = process.env.NASA_API_KEY || "DEMO_KEY";

const FALLBACK_SBDB = {
  disclaimer: "Fallback SBDB data (NASA API error or invalid query)",
  object: {
    full_name: "Apophis (Fallback)",
    des: "99942",
    orbit_id: "N/A",
    epoch: 2459200.5,
    elements: [],
  },
};

const FALLBACK_CAD = {
  disclaimer: "Fallback Close Approach Data (NASA API error)",
  count: 0,
  fields: [],
  data: [],
};

export async function sbdbLookup(s) {
  if (!s) throw new Error("Parameter 's' (search term) is required");
  const url = `${BASE}/sbdb.api?s=${encodeURIComponent(s)}&api_key=${KEY}`;

  try {
    const r = await fetch(url);
    if (!r.ok) {
      const text = await r.text();
      throw new Error(`SBDB lookup error: ${r.status} - ${text}`);
    }
    return r.json();
  } catch (err) {
    console.error("SBDB lookup failed:", err.message);
    return FALLBACK_SBDB;
  }
}

export async function sbdbCAD(params = {}) {
  const query = new URLSearchParams({ ...params, api_key: KEY });
  const url = `${BASE}/cad.api?${query.toString()}`;

  try {
    const r = await fetch(url);
    if (!r.ok) {
      const text = await r.text();
      throw new Error(`SBDB CAD error: ${r.status} - ${text}`);
    }
    return r.json();
  } catch (err) {
    console.error("SBDB CAD failed:", err.message);
    return FALLBACK_CAD;
  }
}
