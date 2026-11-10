// Semua titik kandidat sebagai gambar kecil (/points.svg), dibuat saat build.
// Latar mini-peta di kartu direktori: titik kartu itu ditumpuk di atasnya, jadi terlihat
// letaknya di antara kandidat lain tanpa merender 219 lingkaran di setiap kartu.
import { sppgList } from '../data/sppg';
import { PLOT_W, PLOT_H, toXY } from '../data/projection';

export function GET() {
  const dots = sppgList
    .map(s => {
      const { x, y } = toXY(s.lat, s.lng);
      return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="6"/>`;
    })
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PLOT_W} ${PLOT_H}"><g fill="#ffedd7" fill-opacity="0.28">${dots}</g></svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
}
