// Animasi landing dengan anime.js v4 (dibundel dari npm, bukan CDN).
// Semua elemen merujuk ke tema survei/pemetaan:
// - background kontur: tergambar dari pusat cekungan ke luar, lalu "bernapas" pelan, sesekali
//   dilewati gelombang ember (seperti sapuan survei), dan bergeser sedikit mengikuti kursor;
// - kursor: kursor bawaan diganti reticle juru ukur; di atas plot ia membaca koordinat asli dari proyeksi plot
//   dan menyorot titik SPPG terdekat;
// - judul hero: huruf naik dari balik garis; angka statistik menghitung naik saat terlihat.
// Reduced motion: tidak ada yang dijalankan (konten statis tetap utuh). Layar sentuh: tanpa
// reticle dan parallax kursor.
import { animate, createAnimatable, createDrawable, createTimeline, splitText, stagger } from 'animejs';

const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export function initLandingAnime() {
  if (reduce()) return;
  initBackground();
  initHeadline();
  initCountUp();
  if (finePointer()) initReticle();
}

// ---- Background kontur ----
function initBackground() {
  const bg = document.querySelector<HTMLElement>('.lp-bg');
  const svg = bg?.querySelector<SVGSVGElement>('svg');
  const rings = bg ? [...bg.querySelectorAll<SVGPathElement>('path')] : [];
  if (!bg || !svg || !rings.length) return;

  // Tergambar dari ring terdalam (pusat cekungan) ke luar.
  bg.classList.add('is-drawing');
  animate(createDrawable(rings), {
    draw: ['0 0', '0 1'],
    duration: 1600,
    delay: stagger(45),
    ease: 'inOut(3)',
    onComplete: () => bg.classList.remove('is-drawing'),
  });

  // Napas: skala dan rotasi sangat kecil pada satu layer (hanya transform, murah untuk GPU).
  animate(svg, {
    scale: [1, 1.045],
    rotate: [-0.6, 0.8],
    duration: 18000,
    ease: 'inOutSine',
    alternate: true,
    loop: true,
  });

  // Gelombang survei: warna garis menyala ember berurutan dari pusat, tiap ~9 detik.
  const wave = createTimeline({ loop: true, loopDelay: 7000, delay: 2600 });
  wave.add(rings, {
    stroke: [{ to: '#dc5000', duration: 500 }, { to: '#8a7a68', duration: 1100 }],
    delay: stagger(60),
    ease: 'inOutSine',
  });

  // Parallax kursor: layer bergeser maks ±18px berlawanan arah kursor.
  if (finePointer()) {
    const drift = createAnimatable(bg, { x: 1400, y: 1400, ease: 'out(4)' });
    window.addEventListener('pointermove', e => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      drift.x(-nx * 36);
      drift.y(-ny * 36);
    }, { passive: true });
  }
}

// ---- Judul hero: huruf naik dari balik garis tiap kata ----
function initHeadline() {
  const h1 = document.querySelector<HTMLElement>('#judul');
  if (!h1) return;
  const split = splitText(h1, { words: { wrap: 'clip' }, chars: true });
  h1.classList.add('is-split');
  animate(split.chars, {
    y: ['110%', '0%'],
    opacity: [0, 1],
    duration: 900,
    delay: stagger(22, { start: 150 }),
    ease: 'out(4)',
  });
}

// ---- Angka menghitung naik saat pertama terlihat ----
function initCountUp() {
  const els = [...document.querySelectorAll<HTMLElement>('[data-count]')];
  if (!els.length || !('IntersectionObserver' in window)) return;
  const run = (el: HTMLElement) => {
    const end = Number(el.dataset.count);
    if (!Number.isFinite(end) || end === 0) return;
    const state = { v: 0 };
    el.textContent = '0';
    animate(state, {
      v: end,
      duration: 1400,
      ease: 'out(3)',
      onUpdate: () => { el.textContent = String(Math.round(state.v)); },
    });
  };
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      run(e.target as HTMLElement);
    });
  }, { threshold: 0.6 });
  els.forEach(el => io.observe(el));
}

// ---- Kursor kustom: reticle juru ukur (menggantikan kursor bawaan, hanya perangkat mouse) ----
function initReticle() {
  const reticle = document.querySelector<HTMLElement>('.lp-reticle');
  const readout = reticle?.querySelector<HTMLElement>('.lp-reticle-readout');
  const plot = document.querySelector<SVGSVGElement>('.lp-plot svg');
  if (!reticle || !readout) return;

  // Reticle menggantikan kursor bawaan, jadi posisinya harus menempel tanpa jeda (bukan dikejar
  // dengan easing). Titik ember di tengah = titik klik. Kursor bawaan baru disembunyikan setelah
  // skrip ini jalan (kelas has-cursor), jadi bila JS gagal kursor biasa tetap ada.
  let px = 0;
  let py = 0;
  let queued = false;
  const place = () => {
    queued = false;
    reticle.style.transform = `translate3d(${px}px, ${py}px, 0)`;
  };
  document.documentElement.classList.add('has-cursor');
  const proj = plot?.dataset.proj ? JSON.parse(plot.dataset.proj) : null;
  const circles = plot ? [...plot.querySelectorAll<SVGCircleElement>('circle')].map(c => ({
    el: c, x: Number(c.getAttribute('cx')), y: Number(c.getAttribute('cy')),
  })) : [];
  let near: SVGCircleElement | null = null;
  let shown = false;

  const setNear = (c: SVGCircleElement | null) => {
    if (c === near) return;
    near?.classList.remove('is-near');
    c?.classList.add('is-near');
    near = c;
  };

  window.addEventListener('pointermove', e => {
    px = e.clientX;
    py = e.clientY;
    if (!queued) {
      queued = true;
      requestAnimationFrame(place);
    }
    if (!shown) {
      reticle.classList.add('is-on');
      shown = true;
    }

    const target = e.target as Element;
    reticle.classList.toggle('is-link', !!target.closest('a, button, summary'));

    // Di atas plot: balik proyeksi ke lintang/bujur asli dan sorot titik terdekat (radius 14px).
    if (plot && proj) {
      const r = plot.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      reticle.classList.toggle('is-plot', inside);
      if (inside) {
        const k = proj.w / r.width;
        const x = (e.clientX - r.left) * k;
        const y = (e.clientY - r.top) * k;
        const lat = proj.maxLat - (y - proj.pad) / proj.scale;
        const lng = proj.minLng + (x - proj.pad) / (proj.kx * proj.scale);
        readout.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        let best: SVGCircleElement | null = null;
        let bestD = (14 * k) ** 2;
        for (const c of circles) {
          const d = (c.x - x) ** 2 + (c.y - y) ** 2;
          if (d < bestD) { bestD = d; best = c.el; }
        }
        setNear(best);
      } else {
        setNear(null);
      }
    }
  }, { passive: true });

  document.documentElement.addEventListener('pointerleave', () => {
    reticle.classList.remove('is-on');
    shown = false;
    setNear(null);
  });
}
