// Ringkasan yang dihitung langsung dari sppgList. Jangan menulis angka total secara manual.
import { sppgList, type SPPG, type StatusValidasi } from './sppg';

interface StatusInfo {
  label: string;
  badge: string; // kelas Tailwind (literal, agar terdeteksi saat build)
  dot: string;
  marker: string; // warna hex penanda Leaflet
}

// Status verifikasi data, BUKAN status operasional dapur.
// Warna sama dengan landing page: cream = belum, ember = perlu review, sage = terverifikasi.
// Kelas slate/amber/emerald dipetakan ulang ke palet walnut di global.css (@theme).
export const STATUS_VALIDASI: Record<StatusValidasi, StatusInfo> = {
  belum_diverifikasi: {
    label: 'Belum diverifikasi',
    badge: 'bg-slate-500/15 text-slate-300 border border-slate-500/30',
    dot: 'bg-slate-400',
    marker: '#ffedd7',
  },
  perlu_review: {
    label: 'Perlu review manual',
    badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    dot: 'bg-amber-500',
    marker: '#dc5000',
  },
  terverifikasi: {
    label: 'Terverifikasi',
    badge: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
    dot: 'bg-emerald-500',
    marker: '#a7c08a',
  },
};

const UNKNOWN_STATUS: StatusInfo = {
  label: 'Tidak diketahui',
  badge: 'bg-gray-500/15 text-gray-300 border border-gray-500/30',
  dot: 'bg-gray-500',
  marker: '#6c5f51',
};

export const statusInfo = (s: string): StatusInfo => STATUS_VALIDASI[s as StatusValidasi] ?? UNKNOWN_STATUS;

export const shortWilayah = (w: string) => w.replace(/^Kabupaten /, 'Kab. ');

function countBy(items: SPPG[], key: (s: SPPG) => string): [string, number][] {
  const m = new Map<string, number>();
  for (const s of items) {
    const k = key(s);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'id'));
}

export const wilayahCounts = countBy(sppgList, s => s.wilayah);
// Nama kecamatan bisa sama di kab/kota berbeda, jadi dikunci bersama wilayahnya.
// Titik tanpa kecamatan (alamat kosong di CSV) tidak dihitung sebagai kecamatan tersendiri.
export const kecamatanCounts = countBy(sppgList.filter(s => s.kecamatan), s => `${s.kecamatan} · ${shortWilayah(s.wilayah)}`);
export const statusCounts = countBy(sppgList, s => s.statusValidasi);

const countStatus = (s: StatusValidasi) => sppgList.filter(x => x.statusValidasi === s).length;

export const summary = {
  totalKandidat: sppgList.length,
  totalWilayah: wilayahCounts.length,
  totalKecamatan: kecamatanCounts.length,
  belumDiverifikasi: countStatus('belum_diverifikasi'),
  perluReview: countStatus('perlu_review'),
  terverifikasi: countStatus('terverifikasi'),
};

const MAPS_HOST = /^(www\.)?google\.(com|co\.id)$/;

// Hanya meneruskan URL https Google Maps. Selain itu dibuat ulang dari koordinat dataset.
export function mapsUrl(s: Pick<SPPG, 'linkMaps' | 'lat' | 'lng'>): string {
  try {
    const u = new URL(s.linkMaps);
    if (u.protocol === 'https:' && MAPS_HOST.test(u.hostname) && u.pathname.startsWith('/maps')) return u.href;
  } catch {
    // URL tidak valid, pakai fallback koordinat
  }
  return `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`;
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (v: unknown) => String(v).replace(/[&<>"']/g, c => HTML_ESCAPES[c]);

export const formatCoord = (n: number) => n.toFixed(6);
