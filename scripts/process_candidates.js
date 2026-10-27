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
const headers = rows[0].map(h => h.replace(/^\uFEFF/, '').trim());
const dataRows = rows.slice(1);

console.log('Total valid candidates:', dataRows.length);

const sppgList = dataRows.map((r, index) => {
  const id = index + 1;
  const candidateId = r[0].trim();
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
  const fileAsal = r[12] ? r[12].trim() : '';

  // Determine operational status
  const isPerluReview = statusValidasi === 'perlu_review';
  const status = isPerluReview ? 'Dalam Evaluasi' : 'Aktif';

  // Capacity & recipients
  // Deterministic realistic capacities: 350 - 650
  const kapasitasBase = 350 + ((id * 37) % 300);
  const kapasitas = Math.round(kapasitasBase / 10) * 10;
  const penerima = status === 'Aktif' ? Math.round((kapasitas * (0.82 + ((id * 13) % 15) / 100))) : 0;
  const sekolahMitra = status === 'Aktif' ? 3 + ((id * 7) % 5) : 0;
  const jenisPenerima = id % 3 === 0 ? 'SD/MI, SMP/MTs, SMA' : (id % 2 === 0 ? 'SD/MI, Pondok Pesantren' : 'SD/MI, SMP/MTs');
  
  const bulanList = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus'];
  const bergabung = `${bulanList[id % bulanList.length]} 2025`;

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
    fileAsal,
    kapasitas,
    penerima,
    sekolahMitra,
    jenisPenerima,
    pengelola: `Pengelola Unit ${nama.replace(/^SPPG\s+/i, '')}`,
    telepon: `0812-${1000 + ((id * 173) % 8999)}-${2000 + ((id * 97) % 7999)}`,
    bergabung,
    catatanGizi: catatanReview || 'Kandidat dapur SPPG hasil verifikasi direktori spasial Bandung Raya'
  };
});

console.log('Sample SPPG #1:', JSON.stringify(sppgList[0], null, 2));
console.log('Sample SPPG #13 (perlu review):', JSON.stringify(sppgList[12], null, 2));
console.log('Wilayah summary:', sppgList.reduce((acc, s) => {
  acc[s.wilayah] = (acc[s.wilayah] || 0) + 1;
  return acc;
}, {}));
