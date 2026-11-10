// Mengganti tampilan <select data-dropdown="Label grup"> dengan menu kustom (lihat dropdown.css).
// <select> asli tetap menjadi sumber nilai: memilih item mengubah select.value dan memicu 'change',
// dan perubahan select.value dari kode lain (reset filter, tombol wilayah) ikut memperbarui tampilan.
// Ikon per <option>: data-icon="map|globe|moon|pin|list" atau data-dot="#hex" (warna status).

const ICONS: Record<string, string> = {
  list: 'M4 6h16M4 12h16M4 18h16',
  pin: 'M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
  map: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  globe: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  moon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
};
const svg = (d: string, cls: string) =>
  `<svg class="${cls}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="${d}"/></svg>`;
const CHEVRON = 'M19 9l-7 7-7-7';
const CHECK = 'M5 13l4 4L19 7';

const valueDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!;
const openMenus = new Set<() => void>();

function enhance(select: HTMLSelectElement, n: number) {
  const groupLabel = select.dataset.dropdown || '';
  const fieldLabel = (select.id && document.querySelector(`label[for="${select.id}"]`)?.textContent?.trim()) || groupLabel;
  const menuId = `${select.id || `dd-${n}`}-menu`;

  const root = document.createElement('div');
  root.className = 'dd';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'dd-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', menuId);
  trigger.innerHTML = `<span class="dd-value"></span>${svg(CHEVRON, 'dd-chevron')}`;

  const menu = document.createElement('div');
  menu.className = 'dd-menu';
  menu.id = menuId;
  menu.hidden = true;
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-label', fieldLabel);
  menu.innerHTML = `<div class="dd-label" aria-hidden="true">${groupLabel}</div><div class="dd-group"></div>`;
  const group = menu.querySelector('.dd-group')!;

  const items = [...select.options].map((opt, i) => {
    const item = document.createElement('div');
    item.className = 'dd-item';
    item.id = `${menuId}-${i}`;
    item.tabIndex = -1;
    item.setAttribute('role', 'option');
    item.dataset.value = opt.value;
    const icon = opt.dataset.dot
      ? `<span class="dd-icon dd-dot" style="--dot:${opt.dataset.dot}" aria-hidden="true"></span>`
      : svg(ICONS[opt.dataset.icon || select.dataset.icon || 'list'] || ICONS.list, 'dd-icon');
    item.innerHTML = `${icon}<span class="dd-text"></span>${svg(CHECK, 'dd-check')}`;
    item.querySelector('.dd-text')!.textContent = opt.textContent;
    group.appendChild(item);
    return item;
  });

  const render = () => {
    const current = valueDesc.get!.call(select) as string;
    const opt = [...select.options].find(o => o.value === current);
    trigger.querySelector('.dd-value')!.textContent = opt?.textContent || '';
    trigger.setAttribute('aria-label', `${fieldLabel}: ${opt?.textContent || ''}`);
    items.forEach(it => {
      const on = it.dataset.value === current;
      it.classList.toggle('is-active', on);
      it.setAttribute('aria-selected', String(on));
    });
  };

  let isOpen = false;
  const close = (focusTrigger = false) => {
    if (!isOpen) return;
    isOpen = false;
    openMenus.delete(close);
    menu.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    setTimeout(() => { if (!isOpen) menu.hidden = true; }, 170);
    if (focusTrigger) trigger.focus();
  };
  const open = () => {
    openMenus.forEach(fn => fn());
    isOpen = true;
    openMenus.add(close);
    menu.hidden = false;
    menu.dataset.align = trigger.getBoundingClientRect().left + 260 > window.innerWidth ? 'right' : 'left';
    trigger.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => menu.classList.add('is-open'));
    (items.find(it => it.classList.contains('is-active')) || items[0])?.focus();
  };
  const choose = (value: string) => {
    if (value !== valueDesc.get!.call(select)) {
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    close(true);
  };

  trigger.addEventListener('click', () => (isOpen ? close() : open()));
  trigger.addEventListener('keydown', e => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      open();
    }
  });
  menu.addEventListener('click', e => {
    const item = (e.target as HTMLElement).closest<HTMLElement>('.dd-item');
    if (item) choose(item.dataset.value || '');
  });
  menu.addEventListener('keydown', e => {
    const idx = items.indexOf(document.activeElement as HTMLDivElement);
    const move = (to: number) => { e.preventDefault(); items[(to + items.length) % items.length]?.focus(); };
    if (e.key === 'ArrowDown') move(idx + 1);
    else if (e.key === 'ArrowUp') move(idx - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(items.length - 1);
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (idx >= 0) choose(items[idx].dataset.value || ''); }
    else if (e.key === 'Escape') { e.preventDefault(); close(true); }
    else if (e.key === 'Tab') close();
  });

  // Perubahan nilai dari kode lain (mis. reset filter) ikut memperbarui tampilan.
  Object.defineProperty(select, 'value', {
    configurable: true,
    get() { return valueDesc.get!.call(this); },
    set(v: string) { valueDesc.set!.call(this, v); render(); },
  });
  select.addEventListener('change', render);

  root.append(trigger, menu);
  select.after(root);
  select.hidden = true;
  select.tabIndex = -1;
  // Ikon panah bawaan di samping <select> tidak diperlukan lagi.
  select.parentElement?.querySelectorAll(':scope > svg').forEach(s => ((s as SVGElement).style.display = 'none'));
  render();
}

export function initDropdowns() {
  document.querySelectorAll<HTMLSelectElement>('select[data-dropdown]').forEach(enhance);
  document.addEventListener('pointerdown', e => {
    if (!(e.target as HTMLElement).closest('.dd')) openMenus.forEach(fn => fn());
  });
}
