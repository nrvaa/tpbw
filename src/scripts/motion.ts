// Pasangan dari src/styles/motion.css. Dipakai landing (/) dan dashboard (/peta).

export const prefersMotion = () =>
  'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Tandai elemen [data-reveal] dengan .is-in saat pertama kali masuk layar.
// threshold 0: elemen yang lebih tinggi dari layar (direktori 219 kartu) tetap terpicu.
// Dengan rasio > 0, elemen setinggi itu tidak pernah mencapai rasionya dan tidak pernah muncul.
export function initReveal() {
  document.documentElement.classList.add('reveal-ready');
  const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (!prefersMotion()) {
    els.forEach(el => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0 },
  );
  els.forEach(el => io.observe(el));
}

// Jalankan cb sekali saat el terlihat (dipakai agar animasi grafik terjadi saat dilihat, bukan di luar layar).
export function whenVisible(el: Element | null, cb: () => void) {
  if (!el || !prefersMotion()) return cb();
  const io = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) {
      io.disconnect();
      cb();
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
  io.observe(el);
}

// Scroll halus dengan Lenis (dimuat dari CDN di <head>). Mengembalikan null bila reduced motion
// atau Lenis gagal dimuat; halaman tetap bisa digulir biasa.
export function initSmoothScroll(): any {
  const Lenis = (window as any).Lenis;
  if (!Lenis || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  const lenis = new Lenis({
    // lerp lebih responsif daripada durasi tetap: scroll mengikuti roda tanpa terasa tertinggal.
    lerp: 0.12,
    smoothWheel: true,
    touchMultiplier: 1.5,
  });
  const raf = (time: number) => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);

  // Tautan #anchor ikut digulir halus oleh Lenis. Skip link dibiarkan native agar fokus pindah langsung.
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]:not([data-native-anchor])').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href') || '';
      const target = id.length > 1 ? document.querySelector(id) : null;
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -16 });
      history.pushState(null, '', id);
    });
  });
  return lenis;
}
