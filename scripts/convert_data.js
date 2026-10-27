// Import CSV kandidat SPPG -> src/data/sppg.ts.
// Hanya menyalin kolom yang ada di sumber. Tidak membuat nilai baru
// (kapasitas, penerima, sekolah, kontak, status operasional, insiden).
//
// Pemakaian:
//   node scripts/convert_data.js [path.csv] [--out=path.ts] [--dry-run] [--allow-partial]
//
// Seluruh CSV divalidasi sebelum menulis. Bila ada baris tidak valid atau duplikat,
// import dibatalkan, dataset lama tidak diubah, dan exit code 1.
// --allow-partial: tulis hanya baris yang valid. Pakai hanya setelah laporan dibaca
// dan penolakan baris disetujui.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_CSV = 'sppg_kandidat_bersih (1).csv';
export const OUTPUT_TS = 'src/data/sppg.ts';

const COLUMNS = [
  'candidate_id', 'nama_sppg', 'alamat', 'kabupaten_kota', 'kecamatan',
  'latitude', 'longitude', 'link_maps', 'status_validasi', 'catatan_review',
  'sumber', 'place_id', 'file_asal',
];
const REQUIRED = ['candidate_id', 'nama_sppg', 'kabupaten_kota', 'latitude', 'longitude', 'status_validasi'];
export const KNOWN_STATUS = ['belum_diverifikasi', 'perlu_review', 'terverifikasi'];

// ponytail: bbox kasar Bandung Raya (Kota/Kab. Bandung, Cimahi, KBB, Sumedang).
// Titik di luar bbox hanya ditandai, tidak dibuang. Ganti dengan uji poligon batas
// administrasi bila data batas wilayah tersedia.
export const BBOX = { minLat: -7.35, maxLat: -6.55, minLng: 107.15, maxLng: 108.05 };

const NUMBER_RE = /^[+-]?\d+(\.\d+)?$/;
// candidate_id dipakai sebagai identitas di UI (atribut data-id, relasi kejadian).
const ID_RE = /^[A-Za-z0-9_-]+$/;

export function parseCSV(content) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((ch === '\r' || ch === '\n') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      row.push(field);
      if (row.some(f => f.trim())) rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (inQuotes) throw new Error('CSV rusak: tanda kutip tidak tertutup');
  if (field || row.length) {
    row.push(field);
    if (row.some(f => f.trim())) rows.push(row);
  }
  return rows;
}

const parseCoord = (raw, limit) => {
  if (!NUMBER_RE.test(raw)) return null;
  const n = Number(raw);
  return Math.abs(n) <= limit ? n : null;
};

// Mengembalikan { records, invalid, duplicates, warnings }. Tidak ada baris yang hilang
// tanpa dilaporkan: setiap baris yang tidak masuk `records` tercatat di `invalid`/`duplicates`.
export function convertRows(rows) {
  if (!rows.length) throw new Error('CSV kosong');
  const header = rows[0].map(h => h.replace(/^\uFEFF/, '').trim());
  const missing = COLUMNS.filter(c => !header.includes(c));
  if (missing.length) throw new Error(`Kolom CSV tidak ditemukan: ${missing.join(', ')}`);
  const col = Object.fromEntries(COLUMNS.map(c => [c, header.indexOf(c)]));

  const records = [];
  const invalid = [];
  const duplicates = [];
  const warnings = [];
  const seenCandidate = new Map();
  const seenPlace = new Map();
  const seenCoord = new Map();

  rows.slice(1).forEach((r, i) => {
    const line = i + 2; // nomor baris CSV (header = 1)
    if (r.length !== header.length) {
      invalid.push({ line, candidateId: '', nama: '', reason: `jumlah kolom ${r.length}, seharusnya ${header.length}` });
      return;
    }
    const get = c => r[col[c]].trim();
    const candidateId = get('candidate_id');
    const nama = get('nama_sppg');

    const reasons = [];
    const empty = REQUIRED.filter(c => !get(c));
    if (empty.length) reasons.push(`kolom wajib kosong: ${empty.join(', ')}`);
    if (candidateId && !ID_RE.test(candidateId)) {
      reasons.push(`candidate_id hanya boleh huruf, angka, "-", "_": "${candidateId}"`);
    }
    const latRaw = get('latitude');
    const lngRaw = get('longitude');
    const lat = parseCoord(latRaw, 90);
    const lng = parseCoord(lngRaw, 180);
    if (latRaw && lat === null) reasons.push(`latitude harus angka desimal -90..90: "${latRaw}"`);
    if (lngRaw && lng === null) reasons.push(`longitude harus angka desimal -180..180: "${lngRaw}"`);
    const statusValidasi = get('status_validasi');
    if (statusValidasi && !KNOWN_STATUS.includes(statusValidasi)) {
      reasons.push(`status_validasi tidak dikenal: "${statusValidasi}" (diizinkan: ${KNOWN_STATUS.join(', ')})`);
    }
    if (reasons.length) {
      invalid.push({ line, candidateId, nama, reason: reasons.join('; ') });
      return;
    }

    const placeId = get('place_id');
    const dupId = seenCandidate.get(candidateId);
    const dupPlace = placeId ? seenPlace.get(placeId) : undefined;
    if (dupId || dupPlace) {
      duplicates.push({ line, candidateId, field: dupId ? 'candidate_id' : 'place_id', duplicateOfLine: dupId ?? dupPlace });
      return;
    }
    seenCandidate.set(candidateId, line);
    if (placeId) seenPlace.set(placeId, line);

    const sameCoord = seenCoord.get(`${lat},${lng}`);
    if (sameCoord) {
      warnings.push({ line, nama, reason: `koordinat sama persis dengan baris ${sameCoord}; perlu review, jangan digabung otomatis` });
    } else {
      seenCoord.set(`${lat},${lng}`, line);
    }
    if (lat < BBOX.minLat || lat > BBOX.maxLat || lng < BBOX.minLng || lng > BBOX.maxLng) {
      warnings.push({ line, nama, reason: `koordinat di luar bbox Bandung Raya (${lat}, ${lng})` });
    }
    if (!get('alamat') || !get('kecamatan')) {
      warnings.push({ line, nama, reason: 'alamat/kecamatan kosong' });
    }
    if (!/^https:\/\/(www\.)?google\.[a-z.]+\/maps\//.test(get('link_maps'))) {
      warnings.push({ line, nama, reason: 'link_maps bukan URL Google Maps https; UI akan memakai tautan dari koordinat' });
    }

    records.push({
      candidateId,
      nama,
      wilayah: get('kabupaten_kota'),
      kecamatan: get('kecamatan'),
      alamat: get('alamat'),
      lat,
      lng,
      linkMaps: get('link_maps'),
      statusValidasi,
      catatanReview: get('catatan_review'),
      sumber: get('sumber'),
      placeId,
      fileAsal: get('file_asal'),
    });
  });

  return { records, invalid, duplicates, warnings };
}

export function renderTs(records, csvPath) {
  return `// File ini dihasilkan oleh scripts/convert_data.js dari "${path.basename(csvPath)}".
// Jangan diedit manual; perbaiki CSV lalu jalankan \`npm run import:data\`.
// Seluruh baris adalah KANDIDAT hasil ekstraksi Google Maps (pilot) dan belum
// diverifikasi independen. Bukan data resmi BGN. Lihat README.md bagian "Data".

export type StatusValidasi = ${KNOWN_STATUS.map(s => `'${s}'`).join(' | ')};

export interface SPPG {
  // Identitas tetap dari kolom candidate_id. Tidak bergantung pada urutan baris CSV.
  candidateId: string;
  nama: string;
  wilayah: string;
  kecamatan: string;
  alamat: string;
  lat: number;
  lng: number;
  linkMaps: string;
  statusValidasi: StatusValidasi;
  catatanReview: string;
  sumber: string;
  placeId: string;
  fileAsal: string;
}

export const sppgList: SPPG[] = ${JSON.stringify(records, null, 2)};
`;
}

// Validasi penuh dulu, baru menulis. Tulis lewat file sementara + rename agar
// dataset lama tidak pernah tertinggal setengah jadi.
export function runImport({ csvPath = DEFAULT_CSV, outPath = OUTPUT_TS, dryRun = false, allowPartial = false } = {}) {
  const result = convertRows(parseCSV(fs.readFileSync(csvPath, 'utf8')));
  const rejected = result.invalid.length + result.duplicates.length;

  let blocked = null;
  if (!result.records.length) blocked = 'tidak ada baris valid';
  else if (rejected && !allowPartial) blocked = `${rejected} baris ditolak (tidak valid/duplikat)`;

  const written = !dryRun && !blocked;
  if (written) {
    const tmp = `${outPath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, renderTs(result.records, csvPath), 'utf8');
    fs.renameSync(tmp, outPath);
  }
  return { ...result, ok: !blocked, blocked, written };
}

function main(argv) {
  const out = argv.find(a => a.startsWith('--out='))?.slice('--out='.length) || OUTPUT_TS;
  const flags = argv.filter(a => a.startsWith('--') && !a.startsWith('--out='));
  const unknown = flags.filter(f => f !== '--dry-run' && f !== '--allow-partial');
  if (unknown.length) {
    console.error(`Opsi tidak dikenal: ${unknown.join(' ')}`);
    return 2;
  }
  const csvPath = argv.find(a => !a.startsWith('--')) ?? DEFAULT_CSV;
  const dryRun = flags.includes('--dry-run');
  const allowPartial = flags.includes('--allow-partial');

  let res;
  try {
    res = runImport({ csvPath, outPath: out, dryRun, allowPartial });
  } catch (err) {
    console.error(`Import dibatalkan: ${err.message}. ${out} tidak diubah.`);
    return 1;
  }

  console.log(`Sumber: ${csvPath}`);
  console.log(`Diterima: ${res.records.length} | Tidak valid: ${res.invalid.length} | Duplikat: ${res.duplicates.length} | Peringatan: ${res.warnings.length}`);
  res.invalid.forEach(x => console.error(`  [TIDAK VALID] baris ${x.line} ${x.candidateId || '-'} ${x.nama}: ${x.reason}`));
  res.duplicates.forEach(x => console.error(`  [DUPLIKAT] baris ${x.line} (${x.candidateId}): ${x.field} sama dengan baris ${x.duplicateOfLine}`));
  res.warnings.forEach(x => console.warn(`  [PERINGATAN] baris ${x.line} ${x.nama}: ${x.reason}`));

  if (!res.ok) {
    console.error(`Import dibatalkan: ${res.blocked}. ${out} tidak diubah.`);
    console.error('Perbaiki CSV, atau jalankan ulang dengan --allow-partial bila baris yang ditolak memang sengaja dilewati.');
    return 1;
  }
  if (allowPartial && res.invalid.length + res.duplicates.length) {
    console.warn('--allow-partial: baris yang ditolak di atas TIDAK ikut ditulis.');
  }
  console.log(res.written ? `Ditulis: ${out} (${res.records.length} kandidat)` : 'Dry run: tidak ada file yang ditulis.');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
