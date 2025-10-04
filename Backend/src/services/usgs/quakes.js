import fetch from "node-fetch";

const BASE = "https://earthquake.usgs.gov/fdsnws/event/1/query";

// Pass through common params: format=geojson, starttime, endtime, minmagnitude, etc.
export async function quakesGeoJSON(params = {}) {
  const q = new URLSearchParams({ format: "geojson", ...params });
  const url = `${BASE}?${q.toString()}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`USGS quakes error: ${r.status}`);
  return r.json();
}