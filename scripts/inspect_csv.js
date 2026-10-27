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
        i++; // skip escaped quote
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
const parsed = parseCSV(raw);
const headers = parsed[0];
const dataRows = parsed.slice(1);

console.log('Headers:', headers);
console.log('Total data rows:', dataRows.length);

const wilayahCounts = {};
dataRows.forEach(r => {
  const w = r[3]; // kabupaten_kota
  wilayahCounts[w] = (wilayahCounts[w] || 0) + 1;
});
console.log('Wilayah counts:', wilayahCounts);

dataRows.slice(0, 5).forEach((r, idx) => {
  console.log(`\nRow ${idx + 1}:`);
  headers.forEach((h, i) => {
    console.log(`  ${h}: ${r[i]}`);
  });
});
