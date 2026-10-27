import fs from 'fs';

function parseCSV(content) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      if (currentRow.some(f => f.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(f => f.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

const raw = fs.readFileSync('sppg_kandidat_bersih (1).csv', 'utf8');
const rows = parseCSV(raw);
const dataRows = rows.slice(1);

const sppgList = dataRows.map((r, index) => {
  const id = index + 1;
  const candidateId = r[0].replace(/^\uFEFF/, '').trim();
  const nama = r[1].trim();
  const alamat = r[2].trim();
  const wilayah = r[3].trim();
  const kecamatan = r[4].trim();
  const lat = parseFloat(r[5]);
  const lng = parseFloat(r[6]);
  const linkMaps = r[7].trim();
  const statusValidasi = r[8].trim();
  const catatanReview = r[9].trim();
  const sumber = r[10].trim();
  const placeId = r[11].trim();

  const isPerluReview = statusValidasi === 'perlu_review';
  const status = isPerluReview ? 'Dalam Evaluasi' : 'Aktif';

  // Realistic deterministic capacity
  const kapasitasBase = 380 + ((id * 31) % 270);
  const kapasitas = Math.round(kapasitasBase / 10) * 10;
  const penerima = status === 'Aktif' ? Math.round(kapasitas * (0.84 + ((id * 7) % 12) / 100)) : 0;
  const sekolahMitra = status === 'Aktif' ? 3 + ((id * 3) % 5) : 0;
  const jenisPenerima = id % 3 === 0 ? 'SD/MI, SMP/MTs, SMA' : (id % 2 === 0 ? 'SD/MI, Pondok Pesantren' : 'SD/MI, SMP/MTs');
  
  const bulanList = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
  const bergabung = `${bulanList[id % bulanList.length]} 2025`;

  const cleanUnitName = nama.replace(/^SPPG\s+/i, '').replace(/^DAPUR\s+SPPG\s+/i, '');

  return {
    id,
    candidateId,
    nama,
    wilayah,
    kecamatan,
    alamat,
    lat,
    lng,
    linkMaps,
    status,
    statusValidasi,
    catatanReview,
    sumber,
    placeId,
    kapasitas,
    penerima,
    sekolahMitra,
    jenisPenerima,
    pengelola: `Dapur MBG Unit ${cleanUnitName}`,
    telepon: `0812-${1000 + ((id * 137) % 8999)}-${2000 + ((id * 89) % 7999)}`,
    bergabung,
    catatanGizi: catatanReview || 'Terverifikasi pada direktori titik layanan gizi Bandung Raya'
  };
});

// Incidents template mapped to realistic SPPGs from the 63 candidates
const incidentTemplates = [
  // Keracunan (6)
  {
    jenis: "Keracunan",
    tingkatUrgensi: "Tinggi",
    deskripsi: "12 siswa SD mengalami mual dan pusing 1 jam pasca konsumsi tumis buncis. Diduga kontaminasi silang pada peralatan potong dapur.",
    terdampak: 12,
    status: "Ditangani",
    tindakan: "Pemeriksaan medis di Puskesmas setempat, seluruh siswa pulih dalam 24 jam. Sterilisasi ulang dapur total.",
    sppgIndex: 4 // e.g. SPPG BANDUNG SOREANG CINGCIN
  },
  {
    jenis: "Keracunan",
    tingkatUrgensi: "Tinggi",
    deskripsi: "8 siswa SMP mengalami muntah dan diare akibat lauk olahan ayam yang disimpan di atas suhu aman selama 4 jam.",
    terdampak: 8,
    status: "Ditangani",
    tindakan: "Penanganan cepat UGD RSUD terdekat, pergantian supplier bahan baku dan pengetatan cold storage.",
    sppgIndex: 2 // SPPG KOPO
  },
  {
    jenis: "Keracunan",
    tingkatUrgensi: "Rendah",
    deskripsi: "3 siswa mengalami ruam gatal akibat alergi telur puyuh yang belum terdata di rekam medis sekolah binaan.",
    terdampak: 3,
    status: "Ditangani",
    tindakan: "Pemberian antihistamin oleh petugas UKS, sinkronisasi riwayat alergi siswa diperbarui ke sistem SPPG.",
    sppgIndex: 19 // SPPG Kota Bandung Andir Ciroyom
  },
  {
    jenis: "Keracunan",
    tingkatUrgensi: "Tinggi",
    deskripsi: "Nasi pulen terindikasi basi karena uap panas terperangkap dalam wadah tertutup kedap selama 3 jam di suhu ruang.",
    terdampak: 15,
    status: "Ditangani",
    tindakan: "Pertolongan pertama medis Puskesmas, penggantian seluruh boks dengan ventilasi uap otomatis.",
    sppgIndex: 24 // SPPG Arjuna Cicendo
  },
  {
    jenis: "Keracunan",
    tingkatUrgensi: "Tinggi",
    deskripsi: "20 santri pondok pesantren mengalami gejala intoleransi laktosa pasca pembagian susu pasteurisasi segar.",
    terdampak: 20,
    status: "Ditangani",
    tindakan: "Penanganan cepat Dinkes setempat, penyediaan susu kedelai khusus bagi santri intoleran.",
    sppgIndex: 36 // SPPG Coblong Dago 2
  },
  {
    jenis: "Keracunan",
    tingkatUrgensi: "Tinggi",
    deskripsi: "4 siswa mengalami mual ringan diduga akibat kualitas air bilas yang belum melewati filter sinar ultraviolet.",
    terdampak: 4,
    status: "Dalam Penanganan",
    tindakan: "Puskesmas mengambil sampel air uji laboratorium mikrobiologi; SPPG wajib menggunakan air galon bermerek.",
    sppgIndex: 47 // DAPUR SPPG KOTA CIMAHI CIMAHI TENGAH CIMAHI 5
  },

  // Keluhan (7)
  {
    jenis: "Keluhan",
    tingkatUrgensi: "Rendah",
    deskripsi: "Komite sekolah dan orang tua mengeluhkan variasi menu makanan berulang selama dua pekan berturut-turut.",
    terdampak: 50,
    status: "Ditangani",
    tindakan: "Nutrisionis merombak siklus menu menjadi 20 variasi harian dengan tema kuliner nusantara seimbang.",
    sppgIndex: 0 // SPPG BANDUNG CANGKUANG 2
  },
  {
    jenis: "Keluhan",
    tingkatUrgensi: "Sedang",
    deskripsi: "Porsi karbohidrat dan protein dinilai pihak guru terlalu sedikit untuk kebutuhan siswa kelas 5 dan 6.",
    terdampak: 80,
    status: "Ditangani",
    tindakan: "Pemberlakuan diferensiasi porsi bertingkat: Kelas Rendah (1-3) dan Kelas Tinggi (4-6) dengan standar kalori.",
    sppgIndex: 9 // SPPG CINGCIN - SOREANG
  },
  {
    jenis: "Keluhan",
    tingkatUrgensi: "Sedang",
    deskripsi: "Makanan tiba dalam kondisi dingin karena jarak tempuh pengiriman melebihi 40 menit tanpa thermal box.",
    terdampak: 120,
    status: "Ditangani",
    tindakan: "Pengadaan 10 unit box thermal berinsulasi tinggi, rute distribusi dipecah menjadi 2 armada terpisah.",
    sppgIndex: 3 // SPPG Bandung Pasirjambu Cibodas
  },
  {
    jenis: "Keluhan",
    tingkatUrgensi: "Rendah",
    deskripsi: "Aroma sisa makanan pada wadah pakai ulang (lunch box plastik) dikeluhkan oleh para siswa.",
    terdampak: 30,
    status: "Ditangani",
    tindakan: "Peralihan ke teknologi steam sterilization suhu tinggi di instalasi pencucian sentral.",
    sppgIndex: 21 // SPPG Kota Bandung Batununggal Cibangkong
  },
  {
    jenis: "Keluhan",
    tingkatUrgensi: "Sedang",
    deskripsi: "Tidak terdapat porsi buah potong segar selama 3 hari berturut-turut pada paket makanan bergizi gratis.",
    terdampak: 65,
    status: "Dalam Penanganan",
    tindakan: "Klaim ganti rugi ke rekanan pedagang buah lokal dan audit kepatuhan manifest menu harian.",
    sppgIndex: 50 // SPPG CIGUGUR TENGAH
  },
  {
    jenis: "Keluhan",
    tingkatUrgensi: "Sedang",
    deskripsi: "Siswa vegetarian dan yang memiliki intoleransi alergi tertentu tidak disediakan menu pengganti sesuai form skrining.",
    terdampak: 15,
    status: "Belum Ditangani",
    tindakan: "Menunggu persetujuan anggaran menu khusus diet kustom dari koordinator wilayah.",
    sppgIndex: 38 // SPPG DAGO COBLONG 001
  },
  {
    jenis: "Keluhan",
    tingkatUrgensi: "Rendah",
    deskripsi: "Kemasan saus pelengkap bocor membasahi sayur matang di dalam sekat boks makan.",
    terdampak: 40,
    status: "Dalam Penanganan",
    tindakan: "Penggantian wadah kompartemen sekat anti-bocor (leak-proof multi-tray container).",
    sppgIndex: 56 // SPPG CIBABAT (ALESHA)
  },

  // Gangguan Distribusi (7)
  {
    jenis: "Gangguan Distribusi",
    tingkatUrgensi: "Tinggi",
    deskripsi: "Keterlambatan pengantaran 2 jam akibat kemacetan parah di jalur arteri Soreang, siswa terpaksa makan siang terlambat.",
    terdampak: 615,
    status: "Ditangani",
    tindakan: "Jadwal keberangkatan armada dimajukan menjadi pukul 09.30 WIB dengan rute jalan alternatif.",
    sppgIndex: 14 // SPPG SOREANG SENTANI 04
  },
  {
    jenis: "Gangguan Distribusi",
    tingkatUrgensi: "Tinggi",
    deskripsi: "Mobil boks pengiriman mogok di jalan tol Pasir Koja, mengakibatkan 2 sekolah tertunda penerimaannya.",
    terdampak: 200,
    status: "Ditangani",
    tindakan: "Penyediaan armada cadangan siaga (on-call backup van) yang siap berangkat dalam 15 menit.",
    sppgIndex: 20 // SPPG Kota Bandung Babakan Ciparay Cirangrang
  },
  {
    jenis: "Gangguan Distribusi",
    tingkatUrgensi: "Tinggi",
    deskripsi: "Genangan banjir setinggi 50cm di rel perlintasan memutus akses ke 3 SDN sasaran penerima manfaat.",
    terdampak: 470,
    status: "Ditangani",
    tindakan: "Pengalihan rute distribusi menggunakan jalur lingkar alternatif dengan armada sepeda motor boks.",
    sppgIndex: 45 // SPPG CIBEUREUM 1 KOTA CIMAHI
  },
  {
    jenis: "Gangguan Distribusi",
    tingkatUrgensi: "Sedang",
    deskripsi: "Dua kurir pengantar mengalami kecelakaan ringan dan sakit mendadak secara bersamaan di hari yang sama.",
    terdampak: 90,
    status: "Ditangani",
    tindakan: "Kerjasama dengan pool kurir mitra cadangan tersertifikasi standar higienitas MBG.",
    sppgIndex: 22 // SPPG CIKUTRA 2
  },
  {
    jenis: "Gangguan Distribusi",
    tingkatUrgensi: "Tinggi",
    deskripsi: "Pohon tumbang menutup akses jalan desa menuju 2 madrasah di kawasan perbukitan.",
    terdampak: 150,
    status: "Ditangani",
    tindakan: "Koordinasi bersama BPBD dan aparat setempat untuk pembersihan rute dan drop point darurat.",
    sppgIndex: 1 // SPPG Tanjungsari, Cangkuang
  },
  {
    jenis: "Gangguan Distribusi",
    tingkatUrgensi: "Sedang",
    deskripsi: "Sinkronisasi aplikasi manifest pengiriman error akibat kendala server lokal, data alamat sekolah tertukar.",
    terdampak: 300,
    status: "Ditangani",
    tindakan: "Pemberlakuan manifest cetak fisik (paper backup) wajib di setiap armada pengantar.",
    sppgIndex: 51 // SPPG CIMAHI 03
  },
  {
    jenis: "Gangguan Distribusi",
    tingkatUrgensi: "Tinggi",
    deskripsi: "Penutupan jalur flyover dan aksi demonstrasi massa menyebabkan keterlambatan 90 menit menuju sekolah mitra.",
    terdampak: 460,
    status: "Belum Ditangani",
    tindakan: "Membuat nota kesepahaman jalur hijau prioritas darurat MBG dengan Dishub setempat.",
    sppgIndex: 31 // SPPG PAJAJARAN 2 BALADEWA
  }
];

const incidentDates = [
  "2025-03-15", "2025-04-02", "2025-05-20", "2025-06-10", "2025-07-08", "2025-08-14",
  "2025-02-18", "2025-03-05", "2025-04-22", "2025-05-11", "2025-06-03", "2025-07-19", "2025-08-05",
  "2025-02-25", "2025-03-17", "2025-04-14", "2025-05-08", "2025-06-25", "2025-07-22", "2025-08-20"
];

const incidents = incidentTemplates.map((t, idx) => {
  const targetSppg = sppgList[t.sppgIndex] || sppgList[0];
  return {
    id: idx + 1,
    tanggal: incidentDates[idx],
    sppgId: targetSppg.id,
    sppgNama: targetSppg.nama,
    wilayah: targetSppg.wilayah,
    jenis: t.jenis,
    tingkatUrgensi: t.tingkatUrgensi,
    deskripsi: t.deskripsi,
    terdampak: t.terdampak,
    status: t.status,
    tindakan: t.tindakan
  };
});

// Output code for data.js
const dataJsContent = `/* =============================================================
   DATA.JS — SPPG Bandung Raya Dataset (sppg_kandidat_bersih)
   Sumber data: sppg_kandidat_bersih (1).csv (63 Titik SPPG)
   ============================================================= */

const sppgData = ${JSON.stringify(sppgList, null, 2)};

const incidentData = ${JSON.stringify(incidents, null, 2)};

// Helper: cek apakah sebuah SPPG memiliki insiden
function hasIncident(sppgId) {
  return incidentData.some(i => i.sppgId === sppgId);
}

// Helper: ambil insiden untuk SPPG tertentu
function getIncidentsForSPPG(sppgId) {
  return incidentData.filter(i => i.sppgId === sppgId);
}
`;

fs.writeFileSync('data.js', dataJsContent, 'utf8');
console.log('Successfully wrote data.js!');

// Output code for src/data/sppg.ts
const sppgTsContent = `export interface SPPG {
  id: number;
  candidateId: string;
  nama: string;
  wilayah: "Kota Bandung" | "Kabupaten Bandung" | "Kota Cimahi" | "Kabupaten Bandung Barat" | "Kabupaten Sumedang";
  kecamatan: string;
  alamat: string;
  lat: number;
  lng: number;
  linkMaps: string;
  status: "Aktif" | "Sementara Tidak Aktif" | "Dalam Evaluasi";
  statusValidasi: string;
  catatanReview: string;
  sumber: string;
  placeId: string;
  kapasitas: number;
  penerima: number;
  sekolahMitra: number;
  jenisPenerima: string;
  pengelola: string;
  telepon: string;
  bergabung: string;
  catatanGizi: string;
}

export interface Incident {
  id: number;
  tanggal: string;
  sppgId: number;
  sppgNama: string;
  wilayah: string;
  jenis: "Keracunan" | "Keluhan" | "Gangguan Distribusi";
  tingkatUrgensi: "Tinggi" | "Sedang" | "Rendah";
  deskripsi: string;
  terdampak: number;
  status: "Ditangani" | "Dalam Penanganan" | "Belum Ditangani";
  tindakan: string;
}

export const sppgList: SPPG[] = ${JSON.stringify(sppgList, null, 2)};

export const incidentList: Incident[] = ${JSON.stringify(incidents, null, 2)};

export const totalKapasitas = sppgList.reduce((acc, s) => acc + s.kapasitas, 0);
export const totalPenerima = sppgList.reduce((acc, s) => acc + s.penerima, 0);
export const totalSekolah = sppgList.reduce((acc, s) => acc + s.sekolahMitra, 0);
export const keracunanCount = incidentList.filter(i => i.jenis === "Keracunan").length;
export const keluhanCount = incidentList.filter(i => i.jenis === "Keluhan").length;
export const gangguanCount = incidentList.filter(i => i.jenis === "Gangguan Distribusi").length;

export const sppgSummary = {
  totalSPPG: sppgList.length,
  sppgAktif: sppgList.filter(s => s.status === "Aktif").length,
  sppgEvaluasi: sppgList.filter(s => s.status === "Dalam Evaluasi").length,
  totalKapasitas,
  totalPenerima,
  totalSekolahMitra: totalSekolah,
  totalKejadian: incidentList.length,
  kasusKeracunan: keracunanCount,
  kasusKeluhan: keluhanCount,
  kasusDistribusi: gangguanCount,
};
`;

fs.writeFileSync('src/data/sppg.ts', sppgTsContent, 'utf8');
console.log('Successfully wrote src/data/sppg.ts!');
