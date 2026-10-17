// Optional larger-text setting for phones (accessibility). Stored per device.
const KEY = 'kims_text_size';
const SIZES = { normal: '100%', large: '112.5%', xlarge: '125%' };

export function getTextSize() {
  try { const v = localStorage.getItem(KEY); return SIZES[v] ? v : 'normal'; } catch { return 'normal'; }
}
export function applyTextSize(size = getTextSize()) {
  document.documentElement.style.fontSize = SIZES[size] || SIZES.normal;
}
export function setTextSize(size) {
  try { localStorage.setItem(KEY, size); } catch { /* ignore */ }
  applyTextSize(size);
}
export const TEXT_SIZES = [
  { id: 'normal', label: 'A', aria: 'Normal text' },
  { id: 'large', label: 'A+', aria: 'Larger text' },
  { id: 'xlarge', label: 'A++', aria: 'Largest text' },
];
