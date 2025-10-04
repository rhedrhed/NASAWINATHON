// Utility functions for NASA Horizons data

// Parse NASA Horizons ephemeris data
export function parseHorizonsData(text) {
  const lines = text.split('\n');
  const dataPoints = [];
  let inDataSection = false;

  for (const line of lines) {
    if (line.includes('$$SOE')) {
      inDataSection = true;
      continue;
    }
    if (line.includes('$$EOE')) {
      break;
    }
    if (inDataSection && line.trim()) {
      // Parse the data line
      // Format: JDTDB, Date, X, Y, Z, VX, VY, VZ, X_s, Y_s, Z_s, VX_s, VY_s, VZ_s
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 8) {
        const jdtdb = parseFloat(parts[0]);
        const date = parts[1];
        // parseFloat properly handles scientific notation like 1.465102866451570E+08
        const x = parseFloat(parts[2]);
        const y = parseFloat(parts[3]);
        const z = parseFloat(parts[4]);
        const vx = parseFloat(parts[5]);
        const vy = parseFloat(parts[6]);
        const vz = parseFloat(parts[7]);

        // Verify all values are valid numbers
        if (!isNaN(jdtdb) && !isNaN(x) && !isNaN(y) && !isNaN(z) && 
            !isNaN(vx) && !isNaN(vy) && !isNaN(vz)) {
          dataPoints.push({ jdtdb, date, x, y, z, vx, vy, vz });
        }
      }
    }
  }

  return dataPoints;
}

// Convert Julian Date to JavaScript Date
export function jdToDate(jd) {
  return new Date((jd - 2440587.5) * 86400000);
}

// Interpolate position between two data points
export function interpolatePosition(data, currentTime) {
  if (data.length === 0) return null;

  // Handle edge cases - clamp to data range
  if (currentTime < jdToDate(data[0].jdtdb).getTime()) {
    // Before first point - return first point
    const p = data[0];
    return { x: p.x, y: p.y, z: p.z };
  } else if (currentTime > jdToDate(data[data.length - 1].jdtdb).getTime()) {
    // After last point - return last point
    const p = data[data.length - 1];
    return { x: p.x, y: p.y, z: p.z };
  }

  // Find the two data points to interpolate between
  let beforeIdx = 0;
  let afterIdx = data.length - 1;

  for (let i = 0; i < data.length - 1; i++) {
    const pointTime = jdToDate(data[i].jdtdb).getTime();
    const nextPointTime = jdToDate(data[i + 1].jdtdb).getTime();

    if (currentTime >= pointTime && currentTime <= nextPointTime) {
      beforeIdx = i;
      afterIdx = i + 1;
      break;
    }
  }

  const p1 = data[beforeIdx];
  const p2 = data[afterIdx];
  const t1 = jdToDate(p1.jdtdb).getTime();
  const t2 = jdToDate(p2.jdtdb).getTime();
  const t = (currentTime - t1) / (t2 - t1);

  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
    z: p1.z + (p2.z - p1.z) * t
  };
}
