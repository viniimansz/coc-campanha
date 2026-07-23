import { sb } from '../lib/supabaseClient.js';
import { store } from '../lib/store.js';
import { showToast, defaultAvatarSvg } from '../lib/utils.js';
import { loadMyCharacters } from '../characters/characters.js';

export async function loadProfile() {
    const { data } = await sb.from('profiles').select('*').eq('user_id', store.currentUser.id).maybeSingle();
    store.profileData = data || {};

    const avatarUrl = store.profileData.avatar_url || defaultAvatarSvg();
    document.getElementById('nav-profile-avatar').src = avatarUrl;
    document.getElementById('mnav-profile-avatar').src = avatarUrl;
    document.getElementById('profile-avatar-big').src = avatarUrl;

    document.getElementById('profile-display-name').value = store.profileData.display_name || '';
    document.getElementById('profile-nickname').value = store.profileData.nickname || '';
    document.getElementById('profile-bio').value = store.profileData.bio || '';

    document.getElementById('profile-display-name-view').textContent = store.profileData.display_name || store.currentUser.email.split('@')[0];
    document.getElementById('profile-nickname-view').textContent = store.profileData.nickname ? '@' + store.profileData.nickname.replace(/^@/, '') : '';
    document.getElementById('profile-bio-view').textContent = store.profileData.bio || '';

    const coverContainer = document.getElementById('profile-cover-container');
    if (store.profileData.cover_url) {
      coverContainer.innerHTML = `<img class="profile-cover" src="${store.profileData.cover_url}" />`;
    } else {
      coverContainer.innerHTML = `<div class="profile-cover-placeholder">Sem capa definida</div>`;
    }

    loadProfileCharGrid();
    setProfileEditMode(false);
  }

export function setProfileEditMode(editing) {
    document.getElementById('profile-edit-card').classList.toggle('hidden', !editing);
    document.getElementById('profile-cover-edit-btn').classList.toggle('hidden', !editing);
    document.getElementById('profile-avatar-edit-btn').classList.toggle('hidden', !editing);
    document.getElementById('profile-edit-toggle-btn').textContent = editing ? '✕ Cancelar' : '✎ Editar Perfil';
    document.getElementById('profile-edit-toggle-btn').setAttribute('onclick', editing ? 'loadProfile()' : 'toggleProfileEditMode()');
  }

export function toggleProfileEditMode() {
    setProfileEditMode(true);
  }

export function handleProfileAvatarChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    store.profileAvatarFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      document.getElementById('profile-avatar-big').src = ev.target.result;
      document.getElementById('nav-profile-avatar').src = ev.target.result;
      document.getElementById('mnav-profile-avatar').src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

export function handleCoverChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    store.profileCoverFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      document.getElementById('profile-cover-container').innerHTML = `<img class="profile-cover" src="${ev.target.result}" />`;
    };
    reader.readAsDataURL(file);
  }

export async function saveProfile() {
    let avatarUrl = store.profileData.avatar_url || null;
    let coverUrl = store.profileData.cover_url || null;

    if (store.profileAvatarFile) {
      const ext = store.profileAvatarFile.name.split('.').pop();
      const path = `${store.currentUser.id}/profile-avatar.${ext}`;
      await sb.storage.from('characters').upload(path, store.profileAvatarFile, { upsert: true });
      const { data: urlData } = sb.storage.from('characters').getPublicUrl(path);
      avatarUrl = urlData.publicUrl + '?t=' + Date.now();
    }

    if (store.profileCoverFile) {
      const ext = store.profileCoverFile.name.split('.').pop();
      const path = `${store.currentUser.id}/profile-cover.${ext}`;
      await sb.storage.from('characters').upload(path, store.profileCoverFile, { upsert: true });
      const { data: urlData } = sb.storage.from('characters').getPublicUrl(path);
      coverUrl = urlData.publicUrl + '?t=' + Date.now();
    }

    const payload = {
      user_id: store.currentUser.id,
      display_name: document.getElementById('profile-display-name').value,
      nickname: document.getElementById('profile-nickname').value,
      bio: document.getElementById('profile-bio').value,
      avatar_url: avatarUrl,
      cover_url: coverUrl,
      updated_at: new Date().toISOString(),
    };

    const { error } = await sb.from('profiles').upsert(payload, { onConflict: 'user_id' });

    if (error) { showToast('Erro: ' + error.message); return; }
    showToast('✦ Perfil salvo!');
    store.profileAvatarFile = null;
    store.profileCoverFile = null;
    await loadProfile();
  }

export async function loadProfileCharGrid() {
    const grid = document.getElementById('profile-char-grid');
    if (!store.myCharacters || store.myCharacters.length === 0) {
      await loadMyCharacters();
    }
    if (!store.myCharacters || store.myCharacters.length === 0) {
      grid.innerHTML = '<div class="loading" style="grid-column: 1/-1">Nenhum personagem criado ainda.</div>';
      return;
    }
    grid.innerHTML = store.myCharacters.map(c => {
      const campaign = store.allCampaigns.find(camp => camp.id === c.campaign_id);
      return `
        <div class="char-list-card" onclick="showPage('character'); openCharEditor('${c.id}')">
          ${c.avatar_url ? `<img class="char-list-card-img" src="${c.avatar_url}" />` : `<div class="char-list-card-img-placeholder">👤</div>`}
          <div class="char-list-card-body">
            <div class="char-list-card-name">${c.name || '(sem nome)'}</div>
            <div class="char-list-card-camp ${campaign ? '' : 'none'}">${campaign ? campaign.name : 'Sem campanha'}</div>
          </div>
        </div>
      `;
    }).join('');
  }
