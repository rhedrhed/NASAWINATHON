import fetch from "node-fetch";


const IMG = "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer";

export async function sampleElevation(lon, lat) {
  if (Number.isNaN(lon) || Number.isNaN(lat)) throw new Error("lon and lat must be numbers");
  const geometry = JSON.stringify({ x: lon, y: lat, spatialReference: { wkid: 4326 } });

  const q = new URLSearchParams({
    geometry,
    geometryType: "esriGeometryPoint",
    returnGeometry: "false",
    f: "json"
  });

  const url = `${IMG}/getSamples?${q.toString()}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`USGS elevation error: ${r.status}`);
  return r.json();
}
