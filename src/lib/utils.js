export function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

export function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
  }

export function defaultAvatarSvg() {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#d4c7a8"/><text x="50" y="65" font-size="46" text-anchor="middle">🦑</text></svg>';
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  }

export const esc = escapeHtml;

// Só aceita imagens/arquivos do Storage do Supabase ou data:image gerado pelo app.
// Qualquer outra coisa (javascript:, aspas, parênteses) vira string vazia.
const STORAGE_URL = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/[\w\-./%?=&]+$/i;
export function safeUrl(u) {
  if (!u) return '';
  const s = String(u);
  if (STORAGE_URL.test(s)) return s;
  if (/^data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+$/.test(s)) return s;
  return '';
}

// Valor seguro para usar como argumento dentro de onclick="fn(...)".
export function jsArg(v) { return escapeHtml(JSON.stringify(v ?? '')); }
