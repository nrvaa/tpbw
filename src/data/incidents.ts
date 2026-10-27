// Fitur pemantauan kejadian (keracunan, keluhan, gangguan distribusi).
// Dinonaktifkan: belum ada dataset kejadian yang terverifikasi. Data kejadian lama
// adalah templat sintetis dari generator dan sudah dihapus, jangan dikembalikan.
// Cara mengaktifkan lagi: README.md bagian "Mengaktifkan data kejadian".
export const INCIDENT_FEATURE_ENABLED = false;

export interface Incident {
  id: number;
  tanggal: string; // YYYY-MM-DD
  candidateId: string; // merujuk SPPG.candidateId di src/data/sppg.ts (stabil, bukan nomor urut)
  sppgNama: string;
  wilayah: string;
  jenis: 'Keracunan' | 'Keluhan' | 'Gangguan Distribusi';
  tingkatUrgensi: 'Tinggi' | 'Sedang' | 'Rendah';
  deskripsi: string;
  terdampak: number;
  status: 'Ditangani' | 'Dalam Penanganan' | 'Belum Ditangani';
  tindakan: string;
  sumber: string; // rujukan laporan resmi/berita yang bisa dicek, wajib diisi
}

export const incidentList: Incident[] = [];

// Semua UI kejadian (navigasi, statistik, tabel, grafik, filter, warna penanda) memakai flag ini.
export const incidentsEnabled = INCIDENT_FEATURE_ENABLED && incidentList.length > 0;
