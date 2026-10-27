// Import CSV kandidat SPPG -> src/data/sppg.ts.
// Hanya menyalin kolom yang ada di sumber. Tidak membuat nilai baru
// (kapasitas, penerima, sekolah, kontak, status operasional, insiden).
//
// Pemakaian:
//   node scripts/convert_data.js [path.csv] [--dry-run]
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const DEFAULT_CSV = 'sppg_kandidat_bersih (1).csv';
export const OUTPUT_TS = 'src/data/sppg.ts';

const COLUMNS = [
  'candidate_id', 'nama_sppg', 'alamat', 'kabupaten_kota', 'kecamatan',
  'latitude', 'longitude', 'link_maps', 'status_validasi', 'catatan_review',
  'sumber', 'place_id', 'file_asal',
];
const REQUIRED = ['candidate_id', 'nama_sppg', 'kabupaten_kota', 'latitude', 'longitude', 'status_validasi'];
const KNOWN_STATUS = ['belum_diverifikasi', 'perlu_review', 'terverifikasi'];

// ponytail: bbox kasar Bandung Raya (Kota/Kab. Bandung, Cimahi, KBB, Sumedang).
// Titik di luar bbox hanya ditandai, tidak dibuang. Ganti dengan uji poligon batas
// administrasi bila data batas wilayah tersedia.
const BBOX = { minLat: -7.35, maxLat: -6.55, minLng: 107.15, maxLng: 108.05 };

const NUMBER_RE = /^-?\d+(\.\d+)?$/;

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

// Mengembalikan { records, invalid, duplicates, warnings }. Tidak ada baris yang hilang
// tanpa dilaporkan: setiap baris yang tidak masuk `records` tercatat di `invalid`/`duplicates`.
export function convertRows(rows) {
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

  rows.slice(1).forEach((r, i) => {
    const line = i + 2; // nomor baris CSV (header = 1)
    if (r.length !== header.length) {
      invalid.push({ line, reason: `jumlah kolom ${r.length}, seharusnya ${header.length}` });
      return;
    }
    const get = c => r[col[c]].trim();

    const empty = REQUIRED.filter(c => !get(c));
    if (empty.length) {
      invalid.push({ line, reason: `kolom wajib kosong: ${empty.join(', ')}` });
      return;
    }

    const latRaw = get('latitude');
    const lngRaw = get('longitude');
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!NUMBER_RE.test(latRaw) || !NUMBER_RE.test(lngRaw) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      invalid.push({ line, reason: `koordinat tidak valid: "${latRaw}", "${lngRaw}"` });
      return;
    }

    const candidateId = get('candidate_id');
    const placeId = get('place_id');
    const dupOf = seenCandidate.get(candidateId) ?? (placeId ? seenPlace.get(placeId) : undefined);
    if (dupOf) {
      duplicates.push({ line, candidateId, duplicateOfLine: dupOf });
      return;
    }
    seenCandidate.set(candidateId, line);
    if (placeId) seenPlace.set(placeId, line);

    const statusValidasi = get('status_validasi');
    const nama = get('nama_sppg');
    if (!KNOWN_STATUS.includes(statusValidasi)) {
      warnings.push({ line, nama, reason: `status_validasi tidak dikenal: "${statusValidasi}"` });
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
      id: records.length + 1,
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

function renderTs(records, csvPath) {
  return `// File ini dihasilkan oleh scripts/convert_data.js dari "${csvPath}".
// Jangan diedit manual; perbaiki CSV lalu jalankan \`npm run import:data\`.
// Seluruh baris adalah KANDIDAT hasil ekstraksi Google Maps (pilot) dan belum
// diverifikasi independen. Bukan data resmi BGN. Lihat README.md bagian "Data".

export type StatusValidasi = ${KNOWN_STATUS.map(s => `'${s}'`).join(' | ')};

export interface SPPG {
  id: number;
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

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const csvPath = args.find(a => !a.startsWith('--')) ?? DEFAULT_CSV;

  const { records, invalid, duplicates, warnings } = convertRows(parseCSV(fs.readFileSync(csvPath, 'utf8')));

  console.log(`Sumber: ${csvPath}`);
  console.log(`Diterima: ${records.length} | Tidak valid: ${invalid.length} | Duplikat: ${duplicates.length} | Peringatan: ${warnings.length}`);
  invalid.forEach(x => console.error(`  [TIDAK VALID] baris ${x.line}: ${x.reason}`));
  duplicates.forEach(x => console.error(`  [DUPLIKAT] baris ${x.line} (${x.candidateId}) sama dengan baris ${x.duplicateOfLine}`));
  warnings.forEach(x => console.warn(`  [PERINGATAN] baris ${x.line} ${x.nama}: ${x.reason}`));

  if (dryRun) {
    console.log('Dry run: tidak ada file yang ditulis.');
    return;
  }
  fs.writeFileSync(OUTPUT_TS, renderTs(records, csvPath), 'utf8');
  console.log(`Ditulis: ${OUTPUT_TS}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
