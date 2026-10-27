import fs from 'fs';

const txt = fs.readFileSync('data.js', 'utf8');
const fn = new Function(txt + '\nreturn { sppgData, incidentData };');
const { sppgData, incidentData } = fn();

console.log('SPPG count:', sppgData.length);
console.log('Incident count:', incidentData.length);
const invalidSppgIds = incidentData.filter(i => !sppgData.some(s => s.id === i.sppgId));
console.log('Invalid incident sppgIds:', invalidSppgIds.length);
const wilayahBreakdown = sppgData.reduce((acc, s) => {
  acc[s.wilayah] = (acc[s.wilayah] || 0) + 1;
  return acc;
}, {});
console.log('Wilayah breakdown:', wilayahBreakdown);
console.log('Sample SPPG 1:', sppgData[0].nama, sppgData[0].wilayah, sppgData[0].kecamatan, sppgData[0].lat, sppgData[0].lng);
console.log('Sample SPPG 63:', sppgData[62].nama, sppgData[62].wilayah, sppgData[62].kecamatan, sppgData[62].lat, sppgData[62].lng);
