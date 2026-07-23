import { sb, GUARDIAN_EMAIL } from './lib/supabaseClient.js';
import { store } from './lib/store.js';
import { defaultAvatarSvg } from './lib/utils.js';
import { loadCampaigns } from './campaigns/campaigns.js';
import { loadMyCharacters } from './characters/characters.js';
import { loadProfile } from './profile/profile.js';
import { sb, GUARDIAN_EMAIL } from './lib/supabaseClient.js';

export async function init() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) { store.currentUser = session.user; enterApp(); }
    sb.auth.onAuthStateChange((event, session) => {
      if (session) { store.currentUser = session.user; enterApp(); }
      else { store.currentUser = null; showLogin(); }
    });
  }

export function enterApp() {
    store.isGuardian = store.currentUser.email === GUARDIAN_EMAIL;
    document.getElementById('login-screen').style.display = 'none';
    checkProfileSetup();
  }

export async function checkProfileSetup() {
    const { data } = await sb.from('profiles').select('*').eq('user_id', store.currentUser.id).maybeSingle();
    store.profileData = data || {};

    if (!store.profileData.display_name || !store.profileData.nickname) {
      document.getElementById('app').style.display = 'none';
      document.getElementById('setup-screen').style.display = 'flex';
      document.getElementById('setup-avatar-preview').src = store.profileData.avatar_url || defaultAvatarSvg();
      return;
    }

    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    finishEnteringApp();
  }

export function finishEnteringApp() {
    if (store.isGuardian) {
      document.getElementById('guardian-nav-btn').classList.remove('hidden');
      document.getElementById('guardian-badge-char').classList.remove('hidden');
      document.getElementById('notes-guardian-form').classList.remove('hidden');
      document.getElementById('mnav-guardian').classList.remove('hidden');
    }
    loadCampaigns().then(() => {
      loadMyCharacters();
    });
    loadProfile();
  }

export function handleSetupAvatarChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    store.profileAvatarFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => { document.getElementById('setup-avatar-preview').src = ev.target.result; };
    reader.readAsDataURL(file);
  }

export async function completeSetup() {
    const name = document.getElementById('setup-display-name').value.trim();
    const nickname = document.getElementById('setup-nickname').value.trim().replace(/^@/, '');
    const bio = document.getElementById('setup-bio').value.trim();

    if (!name || !nickname) {
      const el = document.getElementById('setup-error');
      el.textContent = 'Nome e nickname são obrigatórios.';
      el.style.display = 'block';
      return;
    }

    let avatarUrl = store.profileData.avatar_url || null;
    if (store.profileAvatarFile) {
      const ext = store.profileAvatarFile.name.split('.').pop();
      const path = `${store.currentUser.id}/profile-avatar.${ext}`;
      await sb.storage.from('characters').upload(path, store.profileAvatarFile, { upsert: true });
      const { data: urlData } = sb.storage.from('characters').getPublicUrl(path);
      avatarUrl = urlData.publicUrl + '?t=' + Date.now();
    }

    const { error } = await sb.from('profiles').upsert({
      user_id: store.currentUser.id,
      display_name: name,
      nickname: nickname,
      bio: bio,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (error) {
      const el = document.getElementById('setup-error');
      el.textContent = 'Erro: ' + error.message;
      el.style.display = 'block';
      return;
    }

    store.profileAvatarFile = null;
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    finishEnteringApp();
  }

export function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  }
