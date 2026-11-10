// Background kontur topografi untuk landing dan dashboard, dibuat saat build menjadi /contours.svg.
// Alasan visual: Bandung Raya adalah cekungan yang dikelilingi pegunungan, jadi garis kontur
// merujuk ke medan yang dipetakan. Setiap garis ke-5 lebih tegas (kontur indeks, konvensi peta topo).
const W = 1600;
const H = 1000;
const CX = 1000;
const CY = 430;
const STEP = 34;
const RINGS = 30;
const SEGMENTS = 80;

function ring(k: number): string {
  const R = 30 + k * STEP;
  const pts: [number, number][] = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const t = (i / SEGMENTS) * Math.PI * 2;
    // Fase bergeser pelan per ring agar bentuknya berubah seperti medan, tanpa garis saling memotong.
    const r = R * (1
      + 0.13 * Math.sin(2 * t + 0.6)
      + 0.07 * Math.sin(3 * t + 1.9 + k * 0.08)
      + 0.04 * Math.sin(5 * t + 0.3 + k * 0.15)
      + 0.02 * Math.sin(7 * t + 2.2 - k * 0.1));
    pts.push([CX + r * Math.cos(t) * 1.25, CY + r * Math.sin(t)]);
  }
  // Kurva halus: kuadratik melalui titik tengah antar titik.
  const mid = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2].map(v => v.toFixed(0)).join(' ');
  let d = `M${mid(pts[SEGMENTS - 1], pts[0])}`;
  for (let i = 0; i < SEGMENTS; i++) {
    const p = pts[i];
    d += `Q${p[0].toFixed(0)} ${p[1].toFixed(0)} ${mid(p, pts[(i + 1) % SEGMENTS])}`;
  }
  return d + 'Z';
}

export function GET() {
  const paths = Array.from({ length: RINGS }, (_, k) => {
    const index = k % 5 === 4;
    return `<path d="${ring(k)}" stroke-opacity="${index ? 0.42 : 0.2}" stroke-width="${index ? 1.4 : 0.9}"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="#8a7a68">${paths}</g></svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
}
