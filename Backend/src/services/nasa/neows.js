import fetch from "node-fetch";

const BASE = "https://api.nasa.gov/neo/rest/v1";
const KEY = process.env.NASA_API_KEY;

if (!KEY) {
  console.error("❌ NASA_API_KEY is not set in .env! Please add it and restart the server.");
  process.exit(1);
}

console.log("Using NASA API Key:", KEY);

const FALLBACK_FEED = {
  disclaimer: "Fallback data due to NASA API error",
  element_count: 0,
  near_earth_objects: {}
};

const FALLBACK_LOOKUP = {
  disclaimer: "Fallback data due to NASA API error",
  id: "0000",
  name: "Fallback Asteroid",
  absolute_magnitude_h: 0,
  estimated_diameter: {
    meters: { estimated_diameter_min: 10, estimated_diameter_max: 20 }
  },
  is_potentially_hazardous_asteroid: false,
  close_approach_data: []
};

export async function neowsFeed(start, end) {
  if (!start || !end) throw new Error("start_date and end_date are required");

  const url = `${BASE}/feed?start_date=${start}&end_date=${end}&api_key=${KEY}`;
  console.log("Fetching NEOWS feed:", url);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`NeoWs feed error: ${res.status}, body: ${text}`);
    }
    return res.json();
  } catch (err) {
    console.error("NEOWS fetch failed:", err.message);
    return FALLBACK_FEED;
  }
}

export async function neowsLookup(id) {
  if (!id) throw new Error("NEO id is required");

  const url = `${BASE}/neo/${id}?api_key=${KEY}`;
  console.log(`Fetching NEOWS lookup for ID: ${id}`);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`NeoWs lookup error: ${res.status}, body: ${text}`);
    }
    return res.json();
  } catch (err) {
    console.error(`NEOWS lookup failed for ID ${id}:`, err.message);
    return FALLBACK_LOOKUP;
  }
}
