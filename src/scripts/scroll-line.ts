// Garis landing yang tergambar mengikuti scroll (adaptasi Skiper 19, tanpa framer-motion).
// Ujung garis dijaga di sekitar 70% tinggi layar, jadi saat scroll garis terlihat memanjang di
// depan mata. Reduced motion: garis langsung utuh.
//
// Garis ini berputar naik-turun. Kalau panjangnya hanya diambil dari "titik terendah yang sudah
// lewat", setiap putaran yang naik kembali tergambar sekaligus begitu target melewatinya, dan garis
// terlihat patah/melompat. Karena itu tiap sampel diberi kunci yang selalu naik (titik terendah +
// sedikit kemiringan per panjang), lalu panjang yang tampil dikejar pelan per frame.
const SAMPLES = 600;
const TIP = 0.7;
const MIN_VISIBLE = 0.15;
const SLOPE_SHARE = 0.35;
const FOLLOW = 0.16; // porsi selisih yang dikejar tiap frame (makin kecil makin halus)

export function initScrollLine(path: SVGPathElement | null) {
  if (!path) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const svg = path.ownerSVGElement;
  if (!svg) return;

  const length = path.getTotalLength();
  const viewH = svg.viewBox.baseVal.height || 1;
  path.style.strokeDasharray = `${length}`;

  // Kemiringan: seluruh panjang garis tersebar ke ~35% tinggi viewBox tambahan, sehingga putaran
  // yang naik tetap tergambar bertahap sepanjang scroll, bukan sekaligus.
  const slope = (viewH * SLOPE_SHARE) / SAMPLES;
  const lens: number[] = [];
  const keys: number[] = [];
  let lowest = -Infinity;
  for (let i = 0; i <= SAMPLES; i++) {
    const l = (length * i) / SAMPLES;
    lowest = Math.max(lowest, path.getPointAtLength(l).y);
    lens.push(l);
    keys.push(lowest + i * slope);
  }

  // Panjang untuk target (unit viewBox), diinterpolasi di antara dua sampel.
  const lengthAt = (target: number) => {
    if (target <= keys[0]) return 0;
    if (target >= keys[SAMPLES]) return length;
    let lo = 0;
    let hi = SAMPLES;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (keys[mid] <= target) lo = mid;
      else hi = mid;
    }
    const t = (target - keys[lo]) / (keys[hi] - keys[lo] || 1);
    return lens[lo] + (lens[hi] - lens[lo]) * t;
  };

  const wanted = () => {
    const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    if (atEnd) return length;
    const box = svg.getBoundingClientRect();
    const scale = box.height / viewH;
    const target = (window.innerHeight * TIP - box.top) / scale;
    // Target diregangkan dengan porsi yang sama agar di dasar garis tetap selesai.
    return Math.max(lengthAt(target * (1 + SLOPE_SHARE)), length * MIN_VISIBLE);
  };

  let shown = wanted();
  let goal = shown;
  let running = false;
  let lastOffset = NaN;

  const paint = () => {
    const offset = Math.round(length - shown);
    if (offset === lastOffset) return;
    lastOffset = offset;
    path.style.strokeDashoffset = `${offset}`;
  };

  const step = () => {
    goal = wanted();
    const diff = goal - shown;
    if (Math.abs(diff) < 0.5) {
      shown = goal;
      paint();
      running = false;
      return;
    }
    shown += diff * FOLLOW;
    paint();
    requestAnimationFrame(step);
  };

  const kick = () => {
    if (running) return;
    running = true;
    requestAnimationFrame(step);
  };

  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick);
  paint();
}
