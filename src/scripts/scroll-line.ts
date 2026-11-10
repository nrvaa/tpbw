// Garis landing yang tergambar mengikuti progres scroll (adaptasi Skiper 19, tanpa framer-motion).
// Panjang terlihat: 10% di atas halaman sampai 100% di bawah. Reduced motion: garis langsung utuh.
export function initScrollLine(path: SVGPathElement | null) {
  if (!path) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const length = path.getTotalLength();
  path.style.strokeDasharray = `${length}`;

  let ticking = false;
  const update = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1;
    const visible = 0.1 + 0.9 * progress;
    path.style.strokeDashoffset = `${length * (1 - visible)}`;
  };
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}
