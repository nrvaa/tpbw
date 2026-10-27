// Jalankan: npm test
// Tes yang menulis file selalu memakai direktori sementara. Dataset proyek tidak pernah ditulis.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseCSV, convertRows, runImport, renderTs, DEFAULT_CSV, OUTPUT_TS } from './convert_data.js';

const HEADER = 'candidate_id,nama_sppg,alamat,kabupaten_kota,kecamatan,latitude,longitude,link_maps,status_validasi,catatan_review,sumber,place_id,file_asal';
let seq = 0;
const row = (o = {}) => {
  seq++;
  const r = {
    id: `c${seq}`, nama: `SPPG ${seq}`, lat: (-6.9 - seq / 1000).toFixed(6), lng: '107.6',
    link: 'https://www.google.com/maps/place/x', status: 'belum_diverifikasi', place: `P${seq}`, ...o,
  };
  return `${r.id},${r.nama},"Jl. X, Bandung",Kota Bandung,Coblong,${r.lat},${r.lng},${r.link},${r.status},,Google Maps,${r.place},f.csv`;
};
const csv = (...rows) => [HEADER, ...rows].join('\n');
const convert = text => convertRows(parseCSV(text));

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'tpbw-import-'));
const readPublished = file => {
  const ts = fs.readFileSync(file, 'utf8');
  const start = ts.indexOf('sppgList: SPPG[] = ') + 'sppgList: SPPG[] = '.length;
  return JSON.parse(ts.slice(start, ts.lastIndexOf('];') + 1));
};

test('CSV valid menghasilkan record dengan kolom sumber saja', () => {
  const { records, invalid, duplicates } = convert(csv(row({ id: 'abc' })));
  assert.equal(invalid.length + duplicates.length, 0);
  assert.equal(records.length, 1);
  assert.equal(records[0].candidateId, 'abc');
  assert.equal(records[0].alamat, 'Jl. X, Bandung');
  for (const k of ['id', 'kapasitas', 'penerima', 'sekolahMitra', 'telepon', 'bergabung', 'pengelola', 'status']) {
    assert.ok(!(k in records[0]), `atribut "${k}" tidak boleh ada`);
  }
});

test('jumlah record mengikuti CSV, berapa pun ukurannya', () => {
  for (const n of [1, 63, 150]) {
    const { records } = convert(csv(...Array.from({ length: n }, () => row())));
    assert.equal(records.length, n);
  }
});

test('koordinat kosong, bukan angka, atau di luar rentang ditolak', () => {
  const cases = [
    ['', '107.6', /latitude/],
    ['-6.9', '', /longitude/],
    ['abc', '107.6', /latitude harus angka/],
    ['-6.9', '107.6.1', /longitude harus angka/],
    ['-6.9', '"107,6"', /longitude harus angka/],
    ['1e2', '107.6', /latitude harus angka/],
    ['-91', '107.6', /latitude harus angka desimal -90\.\.90/],
    ['90.5', '107.6', /latitude/],
    ['-6.9', '180.1', /longitude harus angka desimal -180\.\.180/],
    ['-6.9', '-181', /longitude/],
  ];
  for (const [lat, lng, re] of cases) {
    const { records, invalid } = convert(csv(row({ lat, lng })));
    assert.equal(records.length, 0, `lat="${lat}" lng="${lng}" harus ditolak`);
    assert.equal(invalid.length, 1);
    assert.match(invalid[0].reason, re);
  }
});

test('status_validasi tidak dikenal ditolak, tidak pernah diterima sebagai status lain', () => {
  for (const status of ['aktif', 'Terverifikasi', 'verified', 'perlu review']) {
    const { records, invalid } = convert(csv(row({ status })));
    assert.equal(records.length, 0, `"${status}" tidak boleh diimpor`);
    assert.match(invalid[0].reason, /status_validasi tidak dikenal/);
  }
  const ok = convert(csv(row({ status: 'belum_diverifikasi' }), row({ status: 'perlu_review' }), row({ status: 'terverifikasi' })));
  assert.deepEqual(ok.records.map(r => r.statusValidasi), ['belum_diverifikasi', 'perlu_review', 'terverifikasi']);
});

test('duplikat candidate_id dilaporkan', () => {
  const { records, duplicates } = convert(csv(row({ id: 'dup' }), row({ id: 'dup' })));
  assert.equal(records.length, 1);
  assert.deepEqual(duplicates.map(d => [d.line, d.field, d.duplicateOfLine]), [[3, 'candidate_id', 2]]);
});

test('duplikat Google place_id dilaporkan', () => {
  const { records, duplicates } = convert(csv(row({ place: 'SAME' }), row({ place: 'SAME' })));
  assert.equal(records.length, 1);
  assert.deepEqual(duplicates.map(d => [d.line, d.field, d.duplicateOfLine]), [[3, 'place_id', 2]]);
});

test('koordinat kembar diberi peringatan review, tidak digabung', () => {
  const { records, warnings } = convert(csv(row({ lat: '-6.9', lng: '107.6' }), row({ lat: '-6.9', lng: '107.6' })));
  assert.equal(records.length, 2);
  assert.ok(warnings.some(w => w.line === 3 && /koordinat sama persis dengan baris 2/.test(w.reason)));
});

test('titik valid di luar bbox Bandung Raya diimpor dengan peringatan', () => {
  const { records, warnings } = convert(csv(row({ lat: '-6.2', lng: '106.8' })));
  assert.equal(records.length, 1);
  assert.deepEqual(records[0].lat, -6.2);
  assert.ok(warnings.some(w => /di luar bbox/.test(w.reason)));
});

test('urutan baris CSV tidak mengubah identitas kandidat', () => {
  const rows = [row({ id: 'aa' }), row({ id: 'bb' }), row({ id: 'cc' })];
  const byId = recs => Object.fromEntries(recs.map(r => [r.candidateId, r]));
  const a = convert(csv(...rows)).records;
  const b = convert(csv(...[...rows].reverse())).records;
  assert.deepEqual(byId(a), byId(b));
});

test('import gagal tidak menimpa dataset lama dan exit tidak sukses', () => {
  const dir = tmpDir();
  const out = path.join(dir, 'sppg.ts');
  const src = path.join(dir, 'bad.csv');
  fs.writeFileSync(out, 'DATASET LAMA');
  fs.writeFileSync(src, csv(row(), row({ lat: 'rusak' }), row({ status: 'aktif' })));

  const res = runImport({ csvPath: src, outPath: out });
  assert.equal(res.ok, false);
  assert.equal(res.written, false);
  assert.equal(fs.readFileSync(out, 'utf8'), 'DATASET LAMA');
  assert.deepEqual(fs.readdirSync(dir).sort(), ['bad.csv', 'sppg.ts']); // tidak ada sisa file .tmp

  fs.writeFileSync(src, csv(row({ id: 'x' }), row({ id: 'x' })));
  assert.equal(runImport({ csvPath: src, outPath: out }).ok, false);
  assert.equal(fs.readFileSync(out, 'utf8'), 'DATASET LAMA');
  fs.rmSync(dir, { recursive: true });
});

test('--dry-run tidak menulis; --allow-partial menulis hanya baris valid', () => {
  const dir = tmpDir();
  const out = path.join(dir, 'sppg.ts');
  const src = path.join(dir, 'mix.csv');
  fs.writeFileSync(out, 'DATASET LAMA');
  fs.writeFileSync(src, csv(row({ id: 'ok1' }), row({ lat: '' })));

  assert.equal(runImport({ csvPath: src, outPath: out, dryRun: true }).written, false);
  assert.equal(fs.readFileSync(out, 'utf8'), 'DATASET LAMA');

  const res = runImport({ csvPath: src, outPath: out, allowPartial: true });
  assert.equal(res.written, true);
  assert.deepEqual(readPublished(out).map(r => r.candidateId), ['ok1']);
  fs.rmSync(dir, { recursive: true });
});

test('import sukses ke file sementara sama dengan renderTs', () => {
  const dir = tmpDir();
  const out = path.join(dir, 'sppg.ts');
  const src = path.join(dir, 'good.csv');
  fs.writeFileSync(src, csv(row({ id: 'g1' }), row({ id: 'g2' })));
  const res = runImport({ csvPath: src, outPath: out });
  assert.equal(res.written, true);
  assert.equal(fs.readFileSync(out, 'utf8'), renderTs(res.records, src));
  fs.rmSync(dir, { recursive: true });
});

test('src/data/sppg.ts sama persis dengan CSV sumber (ID, koordinat, atribut)', () => {
  const { records, invalid, duplicates } = convert(fs.readFileSync(DEFAULT_CSV, 'utf8'));
  assert.equal(invalid.length + duplicates.length, 0, 'CSV proyek harus bersih');
  const published = readPublished(OUTPUT_TS);
  assert.equal(published.length, records.length);
  assert.equal(new Set(published.map(r => r.candidateId)).size, published.length, 'candidateId harus unik');
  assert.deepEqual(published, records);
});

test('koordinat 63 kandidat awal tidak berubah dari nilai CSV mentah', () => {
  const raw = parseCSV(fs.readFileSync(DEFAULT_CSV, 'utf8'));
  const h = raw[0].map(x => x.replace(/^\uFEFF/, '').trim());
  const [ci, la, lo] = ['candidate_id', 'latitude', 'longitude'].map(c => h.indexOf(c));
  const published = new Map(readPublished(OUTPUT_TS).map(r => [r.candidateId, r]));
  const rows = raw.slice(1);
  assert.ok(rows.length >= 63, 'kandidat awal tidak boleh berkurang');
  for (const r of rows) {
    const p = published.get(r[ci].trim());
    assert.ok(p, `kandidat ${r[ci]} hilang`);
    assert.equal(p.lat, Number(r[la]));
    assert.equal(p.lng, Number(r[lo]));
  }
});
