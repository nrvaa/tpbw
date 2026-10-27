// Jalankan: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCSV, convertRows, DEFAULT_CSV, OUTPUT_TS } from './convert_data.js';

const HEADER = 'candidate_id,nama_sppg,alamat,kabupaten_kota,kecamatan,latitude,longitude,link_maps,status_validasi,catatan_review,sumber,place_id,file_asal';
const row = (o = {}) => {
  const r = { id: 'a1', nama: 'SPPG A', lat: '-6.9', lng: '107.6', link: 'https://www.google.com/maps/place/x', status: 'belum_diverifikasi', place: 'P1', ...o };
  return `${r.id},${r.nama},"Jl. X, Bandung",Kota Bandung,Coblong,${r.lat},${r.lng},${r.link},${r.status},,Google Maps,${r.place},f.csv`;
};

test('salin kolom sumber tanpa menambah atribut sintetis', () => {
  const { records } = convertRows(parseCSV(`${HEADER}\n${row()}`));
  assert.equal(records.length, 1);
  assert.equal(records[0].alamat, 'Jl. X, Bandung');
  for (const k of ['kapasitas', 'penerima', 'sekolahMitra', 'telepon', 'bergabung', 'pengelola', 'status']) {
    assert.ok(!(k in records[0]), `atribut sintetis "${k}" tidak boleh ada`);
  }
});

test('koordinat rusak dilaporkan, bukan dibuang diam-diam', () => {
  const { records, invalid } = convertRows(parseCSV(`${HEADER}\n${row({ lat: 'abc' })}\n${row({ id: 'b', place: 'P2', lng: '' })}`));
  assert.equal(records.length, 0);
  assert.equal(invalid.length, 2);
  assert.deepEqual(invalid.map(x => x.line), [2, 3]);
});

test('duplikat candidate_id atau place_id ditolak dan dilaporkan', () => {
  const csv = [HEADER, row(), row({ nama: 'SPPG A lagi' }), row({ id: 'c', place: 'P1' })].join('\n');
  const { records, duplicates } = convertRows(parseCSV(csv));
  assert.equal(records.length, 1);
  assert.equal(duplicates.length, 2);
});

test('titik di luar Bandung Raya dan status tak dikenal hanya diberi peringatan', () => {
  const { records, warnings } = convertRows(parseCSV(`${HEADER}\n${row({ lat: '-6.2', lng: '106.8', status: 'aktif' })}`));
  assert.equal(records.length, 1);
  assert.equal(warnings.length, 2);
});

test('src/data/sppg.ts identik dengan CSV sumber (63 kandidat, koordinat tidak berubah)', () => {
  const { records } = convertRows(parseCSV(fs.readFileSync(DEFAULT_CSV, 'utf8')));
  const ts = fs.readFileSync(OUTPUT_TS, 'utf8');
  const start = ts.indexOf('sppgList: SPPG[] = ') + 'sppgList: SPPG[] = '.length;
  const published = JSON.parse(ts.slice(start, ts.lastIndexOf('];') + 1));
  assert.equal(published.length, 63);
  assert.deepEqual(published, records);
});
