// Background kontur sebagai file statis /contours.svg (dipakai /peta lewat motion.css).
// Bentuk garis dari src/data/contours.ts, sama dengan background animasi di landing.
import { CONTOUR_W, CONTOUR_H, contourRings } from '../data/contours';

export function GET() {
  const paths = contourRings
    .map(r => `<path d="${r.d}" stroke-opacity="${r.index ? 0.42 : 0.2}" stroke-width="${r.index ? 1.4 : 0.9}"/>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CONTOUR_W} ${CONTOUR_H}" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="#8a7a68">${paths}</g></svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
}
