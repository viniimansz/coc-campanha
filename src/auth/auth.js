import { sb } from '../lib/supabaseClient.js';

export async function doLogin() {
    const email = (document.getElementById('login-email').value || '').trim();
    const pass = document.getElementById('login-password').value || '';
    if (!email) return showError('Endereço em branco', 'Nenhum registro pode ser recuperado sem um endereço de correio.', 'hint');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('Endereço ilegível', 'Este endereço não corresponde a nenhum formato reconhecido pelo Arquivo.', 'hint');
    if (!pass) return showError('A senha silencia', 'Sem a palavra-chave, os portões permanecem fechados.', 'hint');
    const btn = document.querySelector('#tab-login .btn-primary');
    if (btn) { btn.disabled = true; btn.dataset.orig = btn.textContent; btn.textContent = 'Abrindo os portões…'; }
    const { error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (btn) { btn.disabled = false; btn.textContent = btn.dataset.orig; }
    if (error) showError('O Arquivo o rejeita', humanizeAuthError(error.message, 'login'), 'hint');
  }

export async function doRegister() {
    const name = (document.getElementById('reg-name').value || '').trim();
    const email = (document.getElementById('reg-email').value || '').trim();
    const pass = document.getElementById('reg-password').value || '';
    if (name.length < 2) return showError('Sem nome, sem dossiê', 'Diga como devemos catalogá-lo — ao menos duas letras.', 'hint');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('Endereço ilegível', 'Este endereço não corresponde a nenhum formato reconhecido.', 'hint');
    if (pass.length < 6) return showError('Senha frágil demais', 'Escolha ao menos seis caracteres. Coisas antigas escutam senhas curtas.', 'hint');
    const btn = document.querySelector('#tab-register .btn-primary');
    if (btn) { btn.disabled = true; btn.dataset.orig = btn.textContent; btn.textContent = 'Selando seu dossiê…'; }
    const { error } = await sb.auth.signUp({ email, password: pass, options: { data: { display_name: name } } });
    if (btn) { btn.disabled = false; btn.textContent = btn.dataset.orig; }
    if (error) return showError('Registro recusado', humanizeAuthError(error.message, 'register'), 'hint');
    showSuccess('Dossiê aberto', 'Verifique seu correio e confirme antes de adentrar o Arquivo.');
  }

export async function doLogout() { await sb.auth.signOut(); }

export function humanizeAuthError(msg, ctx) {
    const m = (msg || '').toLowerCase();
    if (m.includes('invalid login') || m.includes('invalid credentials')) return 'Email ou senha não conferem com nenhum registro. Repasse o que digitou — o Arquivo é implacável com aproximações.';
    if (m.includes('email not confirmed')) return 'Seu dossiê existe, mas ainda não foi selado. Confirme o email que enviamos antes de retornar.';
    if (m.includes('already registered') || m.includes('user already')) return 'Já existe um dossiê com este endereço. Tente entrar, ou recupere-o pelo correio.';
    if (m.includes('rate limit') || m.includes('too many')) return 'Excesso de tentativas. Aguarde alguns instantes antes de bater à porta outra vez.';
    if (m.includes('password')) return 'A senha não atende às exigências do Arquivo. Use ao menos seis caracteres.';
    if (m.includes('network') || m.includes('fetch')) return 'Perdemos contato com o Arquivo. Verifique sua conexão e tente novamente.';
    return msg || 'Um erro insondável foi registrado. Tente novamente em instantes.';
  }

export function clearAuthError() {
    const el = document.getElementById('auth-error');
    if (!el) return;
    el.style.display = 'none';
    el.className = 'error-msg';
    el.innerHTML = '';
  }

export function showError(title, body, hint) {
    const el = document.getElementById('auth-error');
    if (!el) return;
    el.className = 'error-msg dramatic';
    el.innerHTML = '<span class="err-eyebrow">✦ ' + escapeHtml(title) + '</span><span class="err-body">' + escapeHtml(body || '') + '</span>' + (hint ? '<span class="err-hint">Revise os campos acima e tente novamente.</span>' : '');
    el.style.display = 'block';
  }

export function showSuccess(title, body) {
    const el = document.getElementById('auth-error');
    if (!el) return;
    el.className = 'error-msg dramatic success';
    el.innerHTML = '<span class="err-eyebrow">✦ ' + escapeHtml(title) + '</span><span class="err-body">' + escapeHtml(body || '') + '</span>';
    el.style.display = 'block';
  }

export function togglePwd(id, btn) {
    const inp = document.getElementById(id);
    if (!inp) return;
    inp.type = inp.type === 'password' ? 'text' : 'password';
    if (btn) btn.textContent = inp.type === 'password' ? '👁' : '🙈';
  }

export function updatePwdStrength() {
    const inp = document.getElementById('reg-password');
    const meter = document.getElementById('pwd-meter');
    if (!inp || !meter) return;
    const v = inp.value || '';
    let score = 0;
    if (v.length >= 6) score++;
    if (v.length >= 10) score++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
    if (/\d/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    meter.className = 'pwd-meter ' + (['','weak','weak','medium','strong','excellent'][score] || '');
  }

export function switchTab(tab) {
    document.getElementById('tab-login').classList.toggle('hidden', tab !== 'login');
    document.getElementById('tab-register').classList.toggle('hidden', tab !== 'register');
    document.querySelectorAll('.tab-btn').forEach((b, i) => {
      b.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register'));
    });
  }
