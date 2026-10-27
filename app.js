/* =============================================================
   APP.JS — SPPG Bandung Raya Controller & Telemetry Engine
   ============================================================= */

// State
let currentSection = 'dashboard';
let mapInstance = null;
let markersGroup = null;
let allMarkers = [];

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initDashboardTelemetry();
  initNavigation();
  initRecentIncidentsTable();
  initCharts();
  initMap();
  initIncidentsSection();
  initSPPGListSection();
});

/* =============================================================
   1. NAVIGATION
   ============================================================= */
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.getAttribute('data-section');
      if (section) navigateTo(section);
    });
  });

  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
}

function navigateTo(sectionId) {
  currentSection = sectionId;

  // Update nav item active states
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-section') === sectionId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update content section visible
  document.querySelectorAll('.content-section').forEach(sec => {
    sec.classList.remove('active');
  });

  const targetSec = document.getElementById('section-' + sectionId);
  if (targetSec) {
    targetSec.classList.add('active');
  }

  // Update topbar title
  const topbarTitle = document.getElementById('topbar-title');
  if (topbarTitle) {
    const titles = {
      dashboard: 'Dashboard Overview & Telemetri',
      map: 'Peta Geospasial SPPG Bandung Raya',
      incidents: 'Data Kejadian & Mutu MBG',
      'sppg-list': 'Direktori Satuan Pelayanan Pemenuhan Gizi'
    };
    topbarTitle.textContent = titles[sectionId] || 'SPPG Bandung Raya';
  }

  // Trigger map resize if switching to map
  if (sectionId === 'map' && mapInstance) {
    setTimeout(() => { mapInstance.invalidateSize(); }, 200);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* =============================================================
   2. DASHBOARD TELEMETRY INITIALIZATION
   ============================================================= */
function initDashboardTelemetry() {
  if (typeof sppgData === 'undefined' || typeof incidentData === 'undefined') return;

  const totalSppg = sppgData.length;
  const aktifSppg = sppgData.filter(s => s.status === 'Aktif').length;
  const nonAktifSppg = totalSppg - aktifSppg;

  const totalPenerima = sppgData.reduce((acc, curr) => acc + (curr.penerima || 0), 0);
  const totalKapasitas = sppgData.reduce((acc, curr) => acc + (curr.kapasitas || 0), 0);
  const cadanganPorsi = Math.max(0, totalKapasitas - totalPenerima);
  const utilizationRate = totalKapasitas > 0 ? ((totalPenerima / totalKapasitas) * 100).toFixed(1) : '85.2';

  const totalIncidents = incidentData.length;
  const resolvedIncidents = incidentData.filter(i => i.status === 'Ditangani').length;
  const pendingIncidents = totalIncidents - resolvedIncidents;
  const resolveRate = totalIncidents > 0 ? Math.round((resolvedIncidents / totalIncidents) * 100) : 75;

  const keracunanCount = incidentData.filter(i => i.jenis === 'Keracunan').length;
  const keluhanCount = incidentData.filter(i => i.jenis === 'Keluhan').length;
  const gangguanCount = incidentData.filter(i => i.jenis === 'Gangguan Distribusi').length;

  // Set Hero Portions Elements
  setText('val-penerima', totalPenerima.toLocaleString('id-ID'));
  setText('val-kapasitas', totalKapasitas.toLocaleString('id-ID') + ' Porsi');
  setText('val-cadangan', '+' + cadanganPorsi.toLocaleString('id-ID') + ' Cadangan');
  setText('val-meter-ratio', `${totalPenerima.toLocaleString('id-ID')} / ${totalKapasitas.toLocaleString('id-ID')} (${utilizationRate}%)`);
  setText('val-utilization-badge', `${utilizationRate}% Utilitas Kapasitas`);

  const fillBar = document.getElementById('meter-fill-bar');
  if (fillBar) fillBar.style.width = `${utilizationRate}%`;

  // Set Infrastructure Readiness Elements
  const totalSchools = sppgData.reduce((acc, curr) => acc + (curr.sekolahMitra || 0), 0);
  setText('val-total-sppg', aktifSppg.toString());
  setText('val-total-registered', `/ ${totalSppg}`);
  setText('val-aktif-count', aktifSppg.toString());
  setText('val-nonaktif-count', nonAktifSppg.toString());
  setText('val-sppg-rate', `${Math.round((aktifSppg / totalSppg) * 100)}% Siap Masak`);
  setText('val-total-schools', totalSchools.toString());
  setText('val-sekolah-mitra', `${totalSchools} titik sekolah & pesantren`);

  // Regional portion chips
  const bdgPenerima = sppgData.filter(s => s.wilayah === 'Kota Bandung').reduce((a, b) => a + (b.penerima || 0), 0);
  const kabBdgPenerima = sppgData.filter(s => s.wilayah === 'Kabupaten Bandung').reduce((a, b) => a + (b.penerima || 0), 0);
  const cimahiPenerima = sppgData.filter(s => s.wilayah === 'Kota Cimahi').reduce((a, b) => a + (b.penerima || 0), 0);
  setText('chip-bdg', bdgPenerima.toLocaleString('id-ID'));
  setText('chip-kabdg', kabBdgPenerima.toLocaleString('id-ID'));
  setText('chip-cimahi', cimahiPenerima.toLocaleString('id-ID'));

  // Set Incident Triage Elements
  setText('val-kejadian', totalIncidents.toString());
  setText('val-triage-resolved', `${resolvedIncidents} Ditangani (${resolveRate}%)`);
  setText('val-triage-pending', `${pendingIncidents} Perlu Tindak Lanjut`);
  setText('btn-count-keracunan', `${keracunanCount} Keracunan`);
  setText('btn-count-keluhan', `${keluhanCount} Keluhan`);
  setText('btn-count-distribusi', `${gangguanCount} Logistik`);

  // Incident Mini stats
  setText('count-keracunan', keracunanCount.toString());
  const cK = document.getElementById('count-keracunan');
  if (cK) cK.querySelector('.mini-val') && (cK.querySelector('.mini-val').textContent = keracunanCount);
  const cKl = document.getElementById('count-keluhan');
  if (cKl) cKl.querySelector('.mini-val') && (cKl.querySelector('.mini-val').textContent = keluhanCount);
  const cG = document.getElementById('count-gangguan');
  if (cG) cG.querySelector('.mini-val') && (cG.querySelector('.mini-val').textContent = gangguanCount);
  const cTot = document.getElementById('count-total-inc');
  if (cTot) cTot.querySelector('.mini-val') && (cTot.querySelector('.mini-val').textContent = totalIncidents);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function filterByIncidentType(jenis) {
  navigateTo('incidents');
  const jenisSelect = document.getElementById('filter-jenis');
  if (jenisSelect) {
    jenisSelect.value = jenis;
    filterIncidents();
  }
}

/* =============================================================
   3. CHARTS INITIALIZATION (Chart.js)
   ============================================================= */
function initCharts() {
  if (typeof Chart === 'undefined') return;

  Chart.defaults.color = 'oklch(50% 0.016 255)';
  Chart.defaults.font.family = "'JetBrains Mono', monospace";
  Chart.defaults.font.size = 11;

  // Chart 1: Bar Chart Sebaran Wilayah
  const ctxWilayah = document.getElementById('chartSPPGWilayah');
  if (ctxWilayah) {
    const wilayahOrder = ['Kota Bandung', 'Kabupaten Bandung', 'Kota Cimahi'];
    const wilayahLabelsShort = ['Kota Bandung', 'Kab. Bandung', 'Kota Cimahi'];
    const sppgCounts = wilayahOrder.map(w => sppgData.filter(s => s.wilayah === w).length);
    const penerimaHundreds = wilayahOrder.map(w => {
      const sum = sppgData.filter(s => s.wilayah === w).reduce((a, b) => a + (b.penerima || 0), 0);
      return Math.round((sum / 100) * 10) / 10;
    });

    new Chart(ctxWilayah, {
      type: 'bar',
      data: {
        labels: wilayahLabelsShort,
        datasets: [
          {
            label: 'Jumlah SPPG',
            data: sppgCounts,
            backgroundColor: 'oklch(64% 0.21 250 / 0.55)',
            borderColor: 'oklch(64% 0.21 250)',
            borderWidth: 1,
            borderRadius: 3,
          },
          {
            label: 'Penerima (x100)',
            data: penerimaHundreds,
            backgroundColor: 'oklch(72% 0.19 146 / 0.55)',
            borderColor: 'oklch(72% 0.19 146)',
            borderWidth: 1,
            borderRadius: 3,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 8, boxHeight: 8, padding: 12 } }
        },
        scales: {
          x: { grid: { color: 'oklch(26% 0.018 255 / 0.35)' }, ticks: { color: 'oklch(50% 0.016 255)' } },
          y: { grid: { color: 'oklch(26% 0.018 255 / 0.35)' }, ticks: { color: 'oklch(50% 0.016 255)' } }
        }
      }
    });
  }

  // Chart 2: Donut Chart Jenis Kejadian
  const ctxKejadian = document.getElementById('chartKejadianType');
  if (ctxKejadian) {
    new Chart(ctxKejadian, {
      type: 'doughnut',
      data: {
        labels: ['Keracunan', 'Keluhan', 'Distribusi'],
        datasets: [{
          data: [6, 7, 7],
          backgroundColor: ['oklch(66% 0.24 27)', 'oklch(78% 0.17 78)', 'oklch(64% 0.21 250)'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: { legend: { display: false } }
      }
    });
  }

  // Chart 3: Line Chart Tren Kejadian Bulanan 2025
  const ctxTrend = document.getElementById('chartTrendKejadian');
  if (ctxTrend) {
    new Chart(ctxTrend, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt'],
        datasets: [
          {
            label: 'Keracunan',
            data: [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
            borderColor: 'oklch(66% 0.24 27)',
            backgroundColor: 'transparent',
            tension: 0.3,
            fill: false,
            borderWidth: 1.5,
            pointRadius: 3,
            pointBackgroundColor: 'oklch(66% 0.24 27)'
          },
          {
            label: 'Keluhan',
            data: [0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
            borderColor: 'oklch(78% 0.17 78)',
            backgroundColor: 'transparent',
            tension: 0.3,
            fill: false,
            borderWidth: 1.5,
            pointRadius: 3,
            pointBackgroundColor: 'oklch(78% 0.17 78)'
          },
          {
            label: 'Distribusi',
            data: [0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
            borderColor: 'oklch(64% 0.21 250)',
            backgroundColor: 'transparent',
            tension: 0.3,
            fill: false,
            borderWidth: 1.5,
            pointRadius: 3,
            pointBackgroundColor: 'oklch(64% 0.21 250)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 8, boxHeight: 8, font: { size: 11, family: 'JetBrains Mono, monospace' }, color: 'oklch(66% 0.020 255)', padding: 12 } }
        },
        scales: {
          x: { grid: { color: 'oklch(26% 0.018 255 / 0.4)' }, ticks: { color: 'oklch(50% 0.016 255)', font: { size: 11, family: 'JetBrains Mono, monospace' } } },
          y: { grid: { color: 'oklch(26% 0.018 255 / 0.4)' }, ticks: { color: 'oklch(50% 0.016 255)', font: { size: 11, family: 'JetBrains Mono, monospace' } } }
        }
      }
    });
  }

  // Chart 4: Status SPPG Pie
  const ctxStatus = document.getElementById('chartStatusSPPG');
  if (ctxStatus) {
    const aktifCount = sppgData.filter(s => s.status === 'Aktif').length;
    const evaluasiCount = sppgData.length - aktifCount;
    new Chart(ctxStatus, {
      type: 'doughnut',
      data: {
        labels: ['Aktif Siap Operasional', 'Dalam Evaluasi/Review'],
        datasets: [{
          data: [aktifCount, evaluasiCount],
          backgroundColor: ['oklch(72% 0.19 146)', 'oklch(78% 0.17 78 / 0.6)'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: { legend: { display: false } }
      }
    });
  }
}

/* =============================================================
   4. RECENT INCIDENTS TABLE
   ============================================================= */
function initRecentIncidentsTable() {
  const tbody = document.getElementById('tbody-recent');
  if (!tbody || typeof incidentData === 'undefined') return;

  const recent = incidentData.slice(0, 5);
  tbody.innerHTML = recent.map(inc => `
    <tr>
      <td class="num" style="font-size: 13px; color: var(--text-secondary);">${inc.tanggal}</td>
      <td><strong style="color: var(--text-primary); font-size: 14px;">${inc.sppgNama}</strong></td>
      <td style="font-size: 13px;">${inc.wilayah}</td>
      <td><span class="badge ${getBadgeClass(inc.jenis)}">${inc.jenis}</span></td>
      <td class="num" style="font-size: 13px;">${inc.terdampak} jiwa</td>
      <td><span class="badge ${getStatusBadgeClass(inc.status)}">${inc.status}</span></td>
    </tr>
  `).join('');
}

function getBadgeClass(jenis) {
  if (jenis === 'Keracunan') return 'badge-error badge-outline';
  if (jenis === 'Keluhan') return 'badge-warning badge-outline';
  return 'badge-primary badge-outline';
}

function getStatusBadgeClass(status) {
  if (status === 'Ditangani') return 'badge-success badge-outline';
  if (status === 'Dalam Penanganan') return 'badge-warning badge-outline';
  return 'badge-ghost';
}

/* =============================================================
   5. LEAFLET MAP & GIS
   ============================================================= */
function initMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl || typeof L === 'undefined' || typeof sppgData === 'undefined') return;

  mapInstance = L.map('map', {
    center: [-6.9175, 107.6191],
    zoom: 11
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=cb1_4oqq_1_6432e1ac4153b1217ab5d340', {
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://openstreetmap.org">OSM</a> contributors',
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(mapInstance);

  markersGroup = L.layerGroup().addTo(mapInstance);
  renderMapMarkers(sppgData);
}

function renderMapMarkers(list) {
  if (!markersGroup || typeof L === 'undefined') return;
  markersGroup.clearLayers();
  allMarkers = [];

  list.forEach(s => {
    const isIncident = typeof hasIncident === 'function' ? hasIncident(s.id) : false;
    let markerColor = s.status === 'Aktif' ? '#22c55e' : '#64748b';
    if (isIncident) markerColor = '#ef4444';

    const customIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `<div style="
        width: 14px; height: 14px;
        background: ${markerColor};
        border-radius: 50%;
        border: 2px solid #ffffff;
        box-shadow: 0 0 10px ${markerColor};
      "></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    const marker = L.marker([s.lat, s.lng], { icon: customIcon });

    const popupContent = `
      <div style="font-family: 'Inter', sans-serif; color: #f0f4ff; min-width: 220px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 13px; color: #94a3b8;">${s.kecamatan}</span>
          <span style="font-size: 13px; font-weight: 600; color: ${s.status === 'Aktif' ? '#4ade80' : '#fbbf24'};">${s.status}</span>
        </div>
        <h4 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 700; margin-bottom: 4px; color: #ffffff; line-height: 1.3;">${s.nama}</h4>
        <p style="font-size: 13px; color: #94a3b8; margin-bottom: 8px; line-height: 1.4;">${s.alamat}</p>
        <div style="display: flex; justify-content: space-between; font-size: 13px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px; margin-bottom: 8px;">
          <span>Kapasitas: <strong>${s.kapasitas}</strong></span>
          <span>Penerima: <strong style="color: #4ade80;">${s.penerima}</strong></span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button onclick="showSPPGDetail(${s.id})" style="background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.3); color: #4ade80; font-size: 13px; padding: 4px 10px; border-radius: 4px; cursor: pointer;">Detail</button>
          ${s.linkMaps ? `<a href="${s.linkMaps}" target="_blank" rel="noopener noreferrer" style="background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.3); color: #60a5fa; font-size: 13px; padding: 4px 10px; border-radius: 4px; text-decoration: none;">Google Maps ↗</a>` : ''}
        </div>
      </div>
    `;

    marker.bindPopup(popupContent);
    markersGroup.addLayer(marker);
    allMarkers.push({ data: s, marker });
  });
}

function filterMap() {
  if (typeof sppgData === 'undefined') return;

  const w = document.getElementById('map-filter-wilayah')?.value || 'all';
  const st = document.getElementById('map-filter-status')?.value || 'all';
  const kj = document.getElementById('map-filter-kejadian')?.value || 'none';

  let filtered = sppgData.filter(s => {
    const matchW = w === 'all' || s.wilayah === w;
    const matchS = st === 'all' || s.status === st;
    let matchK = true;
    if (kj === 'all') {
      matchK = typeof hasIncident === 'function' ? hasIncident(s.id) : true;
    } else if (kj !== 'none') {
      const incs = typeof getIncidentsForSPPG === 'function' ? getIncidentsForSPPG(s.id) : [];
      matchK = incs.some(i => i.jenis === kj);
    }
    return matchW && matchS && matchK;
  });

  renderMapMarkers(filtered);
}

/* =============================================================
   6. INCIDENTS SECTION & TABLE
   ============================================================= */
function initIncidentsSection() {
  renderIncidentsTable(typeof incidentData !== 'undefined' ? incidentData : []);
}

function filterIncidents() {
  if (typeof incidentData === 'undefined') return;

  const search = (document.getElementById('search-kejadian')?.value || '').toLowerCase();
  const jenis = document.getElementById('filter-jenis')?.value || 'all';
  const wilayah = document.getElementById('filter-wilayah-inc')?.value || 'all';
  const status = document.getElementById('filter-status-inc')?.value || 'all';

  const filtered = incidentData.filter(i => {
    const matchSearch = !search || i.sppgNama.toLowerCase().includes(search) || i.wilayah.toLowerCase().includes(search) || i.deskripsi.toLowerCase().includes(search);
    const matchJenis = jenis === 'all' || i.jenis === jenis;
    const matchWilayah = wilayah === 'all' || i.wilayah === wilayah;
    const matchStatus = status === 'all' || i.status === status;
    return matchSearch && matchJenis && matchWilayah && matchStatus;
  });

  renderIncidentsTable(filtered);
}

function renderIncidentsTable(list) {
  const tbody = document.getElementById('tbody-incidents');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--text-muted);">Tidak ada data kejadian yang sesuai filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((inc, index) => `
    <tr onclick="showIncidentDetail(${inc.id})" style="cursor: pointer;">
      <td class="num" style="font-size: 13px; color: var(--text-muted);">#${index + 1}</td>
      <td class="num" style="font-size: 13px; color: var(--text-secondary);">${inc.tanggal}</td>
      <td><strong style="color: var(--text-primary); font-size: 14px;">${inc.sppgNama}</strong></td>
      <td style="font-size: 13px;">${inc.wilayah}</td>
      <td><span class="badge badge-sm ${getBadgeClass(inc.jenis)}">${inc.jenis}</span></td>
      <td style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px;">${inc.deskripsi}</td>
      <td class="num" style="font-size: 13px;">${inc.terdampak} org</td>
      <td><span class="badge badge-sm ${getStatusBadgeClass(inc.status)}">${inc.status}</span></td>
    </tr>
  `).join('');
}

/* =============================================================
   7. SPPG DIRECTORY SECTION & CARDS
   ============================================================= */
function initSPPGListSection() {
  renderSPPGCards(typeof sppgData !== 'undefined' ? sppgData : []);
}

function filterSPPGList() {
  if (typeof sppgData === 'undefined') return;

  const search = (document.getElementById('search-sppg')?.value || '').toLowerCase();
  const wilayah = document.getElementById('filter-wilayah-sppg')?.value || 'all';
  const status = document.getElementById('filter-status-sppg')?.value || 'all';

  const filtered = sppgData.filter(s => {
    const matchSearch = !search || s.nama.toLowerCase().includes(search) || s.kecamatan.toLowerCase().includes(search);
    const matchWilayah = wilayah === 'all' || s.wilayah === wilayah;
    const matchStatus = status === 'all' || s.status === status;
    return matchSearch && matchWilayah && matchStatus;
  });

  renderSPPGCards(filtered);
}

function renderSPPGCards(list) {
  const container = document.getElementById('sppg-cards-grid');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 32px; color: var(--text-muted);">Tidak ada SPPG yang sesuai dengan pencarian.</div>`;
    return;
  }

  container.innerHTML = list.map(s => `
    <div class="sppg-card bento-card card-spotlight" onclick="showSPPGDetail(${s.id})" style="cursor: pointer;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <span class="badge badge-sm ${s.status === 'Aktif' ? 'badge-success' : 'badge-warning'}">${s.status}</span>
        <span style="font-size: 13px; color: var(--text-muted);">${s.kecamatan}, ${s.wilayah}</span>
      </div>
      <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15px; font-weight: 700; margin-bottom: 4px; color: var(--text-primary); line-height: 1.3;">${s.nama}</h3>
      <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4;">${s.alamat}</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-top: 1px solid var(--border); padding-top: 10px; font-size: 13px;">
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 13px;">Kapasitas</span>
          <strong style="color: var(--text-primary); font-size: 14px;">${s.kapasitas} porsi</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 13px;">Penerima</span>
          <strong style="color: #4ade80; font-size: 14px;">${s.penerima} siswa</strong>
        </div>
      </div>
    </div>
  `).join('');
}

/* =============================================================
   8. MODAL HANDLERS
   ============================================================= */
function showSPPGDetail(id) {
  if (typeof sppgData === 'undefined') return;
  const s = sppgData.find(item => item.id === id);
  if (!s) return;

  const incidents = typeof getIncidentsForSPPG === 'function' ? getIncidentsForSPPG(s.id) : [];

  const html = `
    <div style="padding:10px 0;">
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:10px;">
        <span class="sppg-status-tag ${s.status === 'Aktif' ? 'aktif' : 'evaluasi'}">${s.status}</span>
        ${s.candidateId ? `<span style="font-size:11px;font-family:var(--font-mono);color:var(--color-ink-dim);">ID: ${s.candidateId}</span>` : ''}
      </div>
      <h2 style="font-family:var(--font-display);font-size:17px;font-weight:800;color:var(--color-ink);margin-bottom:4px;letter-spacing:-0.025em;">${s.nama}</h2>
      <p style="font-size:12px;color:var(--color-ink-muted);margin-bottom:16px;line-height:1.5;">${s.alamat}</p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
        <div style="background:var(--color-paper-2);padding:12px;border-radius:var(--radius-sm);border:1px solid var(--color-rule);">
          <span style="font-size:10px;font-family:var(--font-mono);color:var(--color-ink-dim);text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:4px;">Kapasitas</span>
          <p style="font-size:18px;font-family:var(--font-mono);font-weight:500;color:var(--color-ink);">${s.kapasitas} <span style="font-size:12px;color:var(--color-ink-muted);">porsi/hari</span></p>
        </div>
        <div style="background:var(--color-paper-2);padding:12px;border-radius:var(--radius-sm);border:1px solid var(--color-rule);">
          <span style="font-size:10px;font-family:var(--font-mono);color:var(--color-ink-dim);text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:4px;">Penerima</span>
          <p style="font-size:18px;font-family:var(--font-mono);font-weight:500;color:var(--color-ink);">${s.penerima} <span style="font-size:12px;color:var(--color-ink-muted);">porsi/hari</span></p>
        </div>
      </div>

      <div style="font-size:13px;color:var(--color-ink-muted);line-height:1.7;margin-bottom:16px;">
        <p><span style="color:var(--color-ink-dim);font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:0.04em;">Pengelola</span><br>${s.pengelola || '-'}</p>
        <p style="margin-top:8px;"><span style="color:var(--color-ink-dim);font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:0.04em;">Kecamatan</span><br>${s.kecamatan} (${s.wilayah})</p>
        <p style="margin-top:8px;"><span style="color:var(--color-ink-dim);font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:0.04em;">Sekolah Mitra</span><br>${s.sekolahMitra} sekolah binaan</p>
        ${s.catatanReview ? `<p style="margin-top:10px;padding:8px 10px;background:var(--color-warning-dim);border-left:2px solid var(--color-warning);border-radius:var(--radius-xs);font-size:12px;color:var(--color-warning);"><strong>Catatan:</strong> ${s.catatanReview}</p>` : ''}
      </div>

      ${s.linkMaps ? `
        <div style="margin-bottom:16px;">
          <a href="${s.linkMaps}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;text-decoration:none;color:var(--color-accent);border:1px solid var(--color-rule-strong);background:var(--color-accent-dim);padding:6px 12px;border-radius:var(--radius-sm);font-size:12px;font-family:var(--font-mono);">
            Lihat di Google Maps
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </a>
        </div>
      ` : ''}

      ${incidents.length > 0 ? `
        <div style="border-top:1px solid var(--color-rule);padding-top:12px;">
          <p style="font-size:11px;font-family:var(--font-mono);color:var(--color-danger);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Riwayat Kejadian (${incidents.length})</p>
          ${incidents.map(inc => `
            <div style="background:var(--color-danger-dim);border:1px solid oklch(66% 0.24 27 / 0.2);border-radius:var(--radius-sm);padding:8px 10px;margin-bottom:6px;font-size:12px;">
              <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:11px;color:var(--color-danger);margin-bottom:3px;">
                <span>${inc.jenis}</span><span>${inc.tanggal}</span>
              </div>
              <p style="color:var(--color-ink-muted);line-height:1.4;">${inc.deskripsi}</p>
            </div>
          `).join('')}
        </div>
      ` : `<p style="font-size:12px;color:var(--color-ink-dim);border-top:1px solid var(--color-rule);padding-top:12px;">Tidak ada riwayat insiden tercatat.</p>`}
    </div>
  `;

  openModal(html);
}

function showIncidentDetail(id) {
  if (typeof incidentData === 'undefined') return;
  const inc = incidentData.find(item => item.id === id);
  if (!inc) return;

  const html = `
    <div style="padding:10px 0;">
      <div style="margin-bottom:10px;">
        <span style="font-size:11px;font-family:var(--font-mono);color:var(--color-ink-dim);text-transform:uppercase;letter-spacing:0.05em;">${inc.jenis}</span>
      </div>
      <h2 style="font-family:var(--font-display);font-size:17px;font-weight:800;color:var(--color-ink);margin-bottom:4px;letter-spacing:-0.025em;">${inc.sppgNama}</h2>
      <p style="font-size:12px;font-family:var(--font-mono);color:var(--color-ink-dim);margin-bottom:16px;">${inc.tanggal} &middot; ${inc.wilayah}</p>

      <div style="background:var(--color-paper-2);border:1px solid var(--color-rule);border-radius:var(--radius-sm);padding:14px;margin-bottom:14px;">
        <span style="font-size:10px;font-family:var(--font-mono);color:var(--color-ink-dim);text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:6px;">Deskripsi</span>
        <p style="font-size:13px;color:var(--color-ink-2);line-height:1.6;">${inc.deskripsi}</p>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
        <div style="background:var(--color-paper-2);padding:12px;border-radius:var(--radius-sm);border:1px solid var(--color-rule);">
          <span style="font-size:10px;font-family:var(--font-mono);color:var(--color-ink-dim);text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:4px;">Terdampak</span>
          <strong style="font-size:18px;font-family:var(--font-mono);font-weight:500;color:var(--color-danger);">${inc.terdampak} <span style="font-size:12px;">jiwa</span></strong>
        </div>
        <div style="background:var(--color-paper-2);padding:12px;border-radius:var(--radius-sm);border:1px solid var(--color-rule);">
          <span style="font-size:10px;font-family:var(--font-mono);color:var(--color-ink-dim);text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:6px;">Status</span>
          <span class="badge badge-sm ${getStatusBadgeClass(inc.status)}">${inc.status}</span>
        </div>
      </div>

      <div style="background:var(--color-paper-2);border:1px solid var(--color-rule);border-radius:var(--radius-sm);padding:12px;">
        <span style="font-size:10px;font-family:var(--font-mono);color:var(--color-ink-dim);text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:6px;">Tindakan</span>
        <p style="font-size:13px;color:var(--color-ink-muted);line-height:1.5;">${inc.tindakan || 'Sedang dalam koordinasi tim terkait.'}</p>
      </div>
    </div>
  `;

  openModal(html);
}

function openModal(content) {
  const modal = document.getElementById('modal-overlay');
  const modalContent = document.getElementById('modal-content');
  if (modal && modalContent) {
    modalContent.innerHTML = content;
    modal.classList.add('open');
    document.addEventListener('keydown', handleModalEscape);
  }
}

function closeModal() {
  const modal = document.getElementById('modal-overlay');
  if (modal) modal.classList.remove('open');
  document.removeEventListener('keydown', handleModalEscape);
}

function handleModalEscape(e) {
  if (e.key === 'Escape') closeModal();
}
