// Proyeksi koordinat dataset ke bidang datar (equirectangular, bujur dikoreksi cos(lintang)).
// Dipakai plot di landing, /points.svg, dan mini-peta di kartu direktori, supaya posisinya sama.
import { sppgList } from './sppg';

export const PLOT_W = 600;
const PAD = 10;
const lats = sppgList.map(s => s.lat);
const lngs = sppgList.map(s => s.lng);
const minLat = Math.min(...lats);
const maxLat = Math.max(...lats);
const minLng = Math.min(...lngs);
const maxLng = Math.max(...lngs);
const kx = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
const scale = (PLOT_W - PAD * 2) / ((maxLng - minLng) * kx);
export const PLOT_H = Math.round((maxLat - minLat) * scale + PAD * 2);

export const toXY = (lat: number, lng: number) => ({
  x: +(PAD + (lng - minLng) * kx * scale).toFixed(1),
  y: +(PAD + (maxLat - lat) * scale).toFixed(1),
});

// Parameter proyeksi untuk membalik x/y plot ke lintang/bujur di browser (penanda kursor di landing),
// tanpa harus mengirim seluruh dataset ke klien.
export const PLOT_PROJ = { pad: PAD, minLng, maxLat, kx, scale, w: PLOT_W };

// Posisi dalam persen bidang plot (untuk menaruh titik di atas gambar /points.svg).
export const toPct = (lat: number, lng: number) => {
  const { x, y } = toXY(lat, lng);
  return { left: +((x / PLOT_W) * 100).toFixed(2), top: +((y / PLOT_H) * 100).toFixed(2) };
};
