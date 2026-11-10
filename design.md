# Design — SPPG Bandung Raya & Monitoring Kejadian

A locked design system for this app. Every page redesign reads this file before emitting code. Do not regenerate per page — extend or amend this file when the system needs to grow.

## Genre
modern-minimal (Sleek dark command center / telemetry dashboard)

## Macrostructure family
Workbench (Side navigation rail + high-utility overview telemetry + interactive Leaflet GIS view + data tables with filter & detail views)

- Marketing/Overview: Workbench dashboard with stat cards and telemetry charts
- App/GIS page: Interactive map with custom high-contrast SVG markers & popups
- Incident Management: Real-time incident list, multi-criteria filtering, and incident report modal
- Directory page: SPPG Cards and data grid with quick pan-to-map integration

## Theme
Walnut/cream/ember, sama untuk landing (`/`) dan dashboard (`/peta`). Sumber: `tokens.css` (dashboard) dan `src/styles/landing.css` (landing).
- Background: walnut `#100904`, permukaan bark-brown `#382416`, garis cork `#40372e` / driftwood `#6c5f51`
- Teks: warm cream `#ffedd7`; teks sekunder campuran cream (>= 4.5:1). Driftwood hanya untuk garis/teks besar.
- Aksen: ember `#dc5000` dengan teks hitam. Dashboard memakai ember lebih terang `oklch(72% 0.16 48)` untuk teks kecil.
- Status verifikasi: cream = belum diverifikasi, ember = perlu review, sage `oklch(80% 0.1 135)` = terverifikasi.
- Background halaman: kontur topografi (`/contours.svg`, cekungan Bandung) + cahaya bark-brown dari atas.

## Typography
- Display: Hanken Grotesk 700 (pengganti gratis Halyard Display)
- Body: Arial
- Mono: JetBrains Mono, hanya untuk koordinat dan angka tabel

## Motion
- Dial: MOTION 2. Elemen `[data-reveal]` muncul saat masuk layar (0.7s, `cubic-bezier(0.16, 1, 0.3, 1)`, stagger 80ms), batang/plot/grafik beranimasi saat terlihat, transisi silang antar halaman (`@view-transition`).
- Tanpa loop tanpa henti. Reduced motion: semua animasi mati, konten langsung tampil.

## Spacing
4-point named scale defined in `tokens.css`.

## CTA voice
- Primary CTA: ember pill dengan teks hitam (landing) / `.btn-split` panel cream-ember (dashboard)
- Secondary: tautan bergaris bawah atau tombol berbingkai cork

## Exports
See `tokens.css` for source custom properties.
