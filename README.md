# tpbw

WebGIS sebaran titik kandidat Satuan Pelayanan Pemenuhan Gizi (SPPG) se-Bandung Raya.
Astro 5, Tailwind CSS 4, Leaflet, Chart.js.

```sh
npm install
npm run dev          # server lokal
npm run build        # build statis ke dist/
npm test             # uji importer + kecocokan dataset dengan CSV
npm run import:data  # CSV -> src/data/sppg.ts (tambahkan --dry-run untuk laporan saja)
```

## Data

- `sppg_kandidat_bersih (1).csv`: sumber. 63 kandidat dari eksperimen ekstraksi Google Maps (pilot).
- `src/data/sppg.ts`: hasil `npm run import:data`. Jangan diedit manual.
- `src/data/summary.ts`: semua angka di UI (total, per wilayah, per kecamatan, status) dihitung di sini dari `sppgList`.
- `src/data/incidents.ts`: fitur kejadian, saat ini nonaktif dan kosong.

### Batasan dan asal data

- Semua titik berstatus kandidat. Belum diverifikasi oleh BGN, pemda, atau pengelola SPPG.
- `status_validasi` adalah status verifikasi data, bukan status operasional. `belum_diverifikasi` tidak berarti "Aktif".
- Kapasitas, jumlah penerima, sekolah mitra, kontak, dan status operasional tidak ada di sumber, jadi tidak ditampilkan. Jangan diisi dengan nilai buatan.
- Lisensi: data berasal dari Google Maps. Ketentuan Google Maps Platform membatasi penyimpanan dan redistribusi konten di luar layanan Google, termasuk menampilkannya di atas peta non-Google (OSM/CARTO/Esri). Sebelum situs dipublikasikan, pastikan izinnya atau ganti dengan titik hasil verifikasi lapangan/sumber resmi. Untuk sekarang, gunakan hanya untuk keperluan akademik internal.

### Menambah atau memperbarui data

1. Tambahkan baris ke CSV dengan kolom yang sama (`candidate_id`, `nama_sppg`, `alamat`, `kabupaten_kota`, `kecamatan`, `latitude`, `longitude`, `link_maps`, `status_validasi`, `catatan_review`, `sumber`, `place_id`, `file_asal`).
2. Isi `sumber` dengan asal data yang bisa ditelusuri. Gunakan `status_validasi` = `terverifikasi` hanya setelah dicek independen (survei lapangan, dokumen resmi).
3. `npm run import:data -- --dry-run` lalu periksa laporannya.
4. `npm run import:data`, lalu `npm test` dan `npm run build`.

Aturan importer (`scripts/convert_data.js`):

- Seluruh CSV divalidasi dulu sebelum menulis. Penulisan memakai file sementara lalu rename, jadi `sppg.ts` tidak pernah tertinggal setengah jadi.
- Baris ditolak bila: kolom wajib kosong, latitude/longitude bukan angka desimal atau di luar -90..90 / -180..180, `status_validasi` bukan `belum_diverifikasi`/`perlu_review`/`terverifikasi`, atau `candidate_id`/`place_id` ganda. Setiap penolakan dicetak dengan nomor barisnya.
- Bila ada satu saja baris ditolak, import dibatalkan, `sppg.ts` tidak diubah, dan exit code 1. Opsi `--allow-partial` menulis hanya baris yang valid. Pakai hanya setelah laporannya dibaca dan penolakan baris disetujui.
- Peringatan (tetap diimpor): titik di luar bbox Bandung Raya, koordinat sama persis dengan titik lain (perlu review, jangan digabung otomatis), alamat/kecamatan kosong, `link_maps` bukan URL Google Maps.
- Opsi `--out=path.ts` menulis ke lokasi lain (dipakai tes agar dataset proyek tidak tersentuh).

Identitas titik adalah `candidate_id`, bukan nomor urut baris. Penanda peta, kartu direktori, modal, dan relasi kejadian memakai `candidateId`, jadi menyusun ulang atau menyisipkan baris CSV tidak menggeser data. Jangan mengubah `candidate_id` kandidat yang sudah ada. Kandidat baru wajib punya `candidate_id` unik (huruf, angka, `-`, `_`).

Validasi wilayah saat ini memakai bbox kasar (`BBOX` di `scripts/convert_data.js`). Untuk validasi yang lebih ketat, uji titik terhadap poligon batas kecamatan (misalnya GeoJSON batas administrasi BIG) dan bandingkan dengan kolom `kecamatan`/`kabupaten_kota`. Contoh kasus yang perlu ini: kandidat `272135b64708` bernama "Kota Cimahi" tetapi alamatnya di Kota Bandung.

## Mengaktifkan data kejadian

Data kejadian lama (20 catatan keracunan/keluhan/gangguan distribusi) adalah templat sintetis yang ditempelkan ke nama SPPG nyata. Sudah dihapus dan generatornya dibuang. Jangan dikembalikan.

Bila dataset kejadian terverifikasi tersedia:

1. Isi `incidentList` di `src/data/incidents.ts`. Setiap entri wajib punya `sumber` (laporan resmi atau berita yang bisa dicek) dan `candidateId` yang cocok dengan `candidateId` di `sppg.ts`.
2. Ubah `INCIDENT_FEATURE_ENABLED` menjadi `true`.
3. `npm run build`. Navigasi "Data Kejadian", tabel, filter, grafik rasio, filter lapisan peta, warna penanda, dan riwayat di detail lokasi akan muncul otomatis. Semuanya disembunyikan selama flag `false` atau daftar masih kosong.

## Implementasi lama (dihapus)

Versi vanilla JavaScript sebelum migrasi ke Astro (`index.html`, `app.js`, `data.js`, `style.css` di root) sudah dihapus. Berkas itu tidak dipakai build Astro, dan `data.js` berisi data sintetis (kapasitas, penerima, kontak, 20 kejadian palsu) yang ditempelkan ke nama SPPG nyata. Riwayatnya masih ada di Git (commit `d297481` dan sebelumnya) bila perlu dirujuk. Jangan dikembalikan.
