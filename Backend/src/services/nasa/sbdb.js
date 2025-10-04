import fetch from "node-fetch";

const BASE = "https://ssd-api.jpl.nasa.gov";
const KEY = process.env.NASA_API_KEY || "DEMO_KEY";

// Fallbacks
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

/**
 * Normalize input designation:
 * - If all digits → leave as is (numbered)
 * - Else remove spaces and uppercase (provisional)
 */
function normalizeDes(des) {
  des = des?.toString().trim();
  if (/^\d+$/.test(des)) return des;          // numbered
  return des.replace(/\s+/g, "").toUpperCase(); // provisional
}

/**
 * Lookup object info in SBDB
 */
export async function sbdbLookup(des) {
  if (!des) throw new Error("Parameter 'des' (search term) is required");

  const normalizedDes = normalizeDes(des);

  // Use sstr for reliability
  const url = `${BASE}/sbdb.api?sstr=${encodeURIComponent(normalizedDes)}&api_key=${KEY}`;
  console.log("SBDB lookup URL:", url);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`SBDB lookup error: ${res.status} - ${text}`);
    }

    const data = await res.json();

    if (data.code || data.error) {
      throw new Error(data.message || "SBDB lookup returned error");
    }

    return data;
  } catch (err) {
    console.error("SBDB lookup failed:", err.message);
    return FALLBACK_SBDB;
  }
}

/**
 * Get Close Approach Data (CAD)
 */
export async function sbdbCAD(params = {}) {
  const { des, "date-min": dateMin, "date-max": dateMax, "dist-max": distMax } = params;
  if (!des) throw new Error("Parameter 'des' is required for CAD");

  const normalizedDes = normalizeDes(des);

  // Build query dynamically, only include defined values
  const query = new URLSearchParams({ des: normalizedDes, api_key: KEY });
  if (dateMin) query.append("date-min", dateMin);
  if (dateMax) query.append("date-max", dateMax);
  if (distMax) query.append("dist-max", distMax);

  const url = `${BASE}/cad.api?${query.toString()}`;
  console.log("SBDB CAD URL:", url);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`SBDB CAD error: ${res.status} - ${text}`);
    }

    const data = await res.json();

    if (data.code || data.error) {
      throw new Error(data.message || "SBDB CAD returned error");
    }

    return data;
  } catch (err) {
    console.error("SBDB CAD failed:", err.message);
    return FALLBACK_CAD;
  }
}

