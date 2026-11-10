# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Dosen Penilai & Civitas Akademik:** Mengevaluasi pemenuhan standar arsitektur web modern, aksesibilitas, visualisasi geospasial, dan kelengkapan teknis dalam kerangka Tugas Besar Pemrograman Web (TPBW Kelompok 14).
- **Mahasiswa & Peneliti:** Menganalisis sebaran spasial dan pemerataan lokasi titik kandidat Satuan Pelayanan Pemenuhan Gizi (SPPG) Program Makan Bergizi Gratis (MBG) di wilayah Bandung Raya.

## Product Purpose

Menyediakan WebGIS interaktif yang akurat, transparan, dan mudah dinavigasi untuk memvisualisasikan data geografis 63 titik kandidat SPPG se-Bandung Raya. Keberhasilan produk dinilai dari kemampuan pengguna mengeksplorasi persebaran per kabupaten/kota, meneliti status verifikasi data, serta mengakses rincian koordinat lokasi tanpa adanya pemalsuan data sintetis.

## Positioning

Satu-satunya WebGIS kandidat SPPG Bandung Raya yang berpegang teguh pada integritas data riil (*data integrity first*): menyajikan atribut faktual apa adanya dari hasil ekstraksi pilot tanpa mengarang angka kapasitas porsi, penerima fiktif, maupun insiden buatan.

## Operating Context

- Diuji dan dijalankan secara lokal (`npm run dev`) serta dibangun sebagai situs statis performan tinggi (`npm run build`).
- Digunakan dalam konteks akademik dan evaluasi proyek kuliah dengan layar desktop dan mobile.
- Mengandalkan konektivitas peta tile publik (CARTO Dark Matter, OpenStreetMap, Citra Satelit Esri) dengan fallback penanganan data offline.

## Capabilities and Constraints

- **Kapabilitas Utama:**
  - Peta interaktif Leaflet dengan filter multi-kategori (wilayah kab/kota, status verifikasi data).
  - Multi-basemap switcher (CARTO Dark Matter sebagai default, OpenStreetMap, Esri Satellite).
  - Direktori pencarian lokal instan dan modal detail kandidat dengan tautan langsung ke Google Maps.
  - Kartu telemetri ringkasan dan analitik distribusi wilayah (Chart.js).
  - Sidebar responsif Flowbite yang adaptif untuk desktop dan layar sentuh mobile.
- **Batasan & Larangan (Strict Constraints):**
  - **Integritas Data:** Semua titik berstatus "kandidat". Kolom kapasitas, jumlah penerima, sekolah mitra, dan status operasional **tidak ada** di dataset sumber, sehingga dilarang keras dibuatkan nilai tiruan (*synthetic data*).
  - **Identitas Titik:** Penanda dan referensi data wajib mengacu pada `candidate_id` unik yang stabil.
  - **Lisensi:** Pemanfaatan data ditujukan khusus untuk keperluan akademik internal.

## Brand Commitments

- **Identitas Proyek:** SPPG Bandung Raya (WebGIS Pemetaan Kandidat SPPG).
- **Entitas Pengembang:** Kelompok 14 — Tugas Besar Pemrograman Web.
- **Tipografi:** Keluarga huruf Inter (bersih, netral, sangat mudah dibaca untuk data tabular dan peta) dipadukan dengan JetBrains Mono untuk metrik numerik dan kode.

## Evidence on Hand

- `sppg_kandidat_bersih (1).csv`: Dataset sumber berisi 63 titik kandidat di Bandung Raya.
- `src/data/sppg.ts`: Dataset terkompilasi hasil validasi skrip `scripts/convert_data.js`.
- `Pemetaan SPPG se-Bandung Raya dan Data Kejadian (1).pdf`: Dokumen acuan studi pilot.
- `src/data/summary.ts`: Modul kalkulasi tunggal (*single source of truth*) agregasi data wilayah dan status.

## Product Principles

1. **Integritas di Atas Estetika Semata:** Lebih baik menampilkan status "belum diverifikasi" daripada mengarang angka keterisian atau kapasitas palsu demi mengisi UI.
2. **Keterbacaan & Navigasi Cepat:** Memudahkan penilai dan pengguna menemukan informasi titik, kecamatan, dan status hanya dalam 1-2 klik/interaksi.
3. **Aksesibilitas Universal (WCAG 2.1 AA):** Kontras rasio teks tinggi, navigasi keyboard penuh, fokus ring yang jelas, dan peran ARIA yang valid.
4. **Performa Ringan & Andal:** Dibangun dengan Astro SSG untuk waktu muat instan tanpa beban runtime JavaScript yang berlebihan.

## Accessibility & Inclusion

- Standar target WCAG 2.1 Level AA untuk kontras warna teks dan elemen interaktif.
- Dukungan navigasi keyboard penuh (skip link, tab navigation, fokus visible, escape modal/drawer).
- Touch target minimum 44x44px pada mode mobile dan pembaca layar (*screen reader*) ramah atribut ARIA.
