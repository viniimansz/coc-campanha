import { sb } from '../lib/supabaseClient.js';
import { store } from '../lib/store.js';
import { MAX_CHARACTERS } from '../lib/supabaseClient.js';
import { showToast } from '../lib/utils.js';

let avatarFile = null;

let fichaFile = null;

let currentFichaUrl = null;

let charPendingDelete = null;



export async function loadMyCharacters() {
    const { data } = await sb.from('characters').select('*').eq('user_id', store.currentUser.id).order('created_at', { ascending: true });
    store.myCharacters = data || [];
    renderCharList();
  }

export function renderCharList() {
    const grid = document.getElementById('char-list-grid');
    const note = document.getElementById('char-count-note');
    note.textContent = `${store.myCharacters.length} de ${MAX_CHARACTERS} personagens criados.`;

    let html = store.myCharacters.map(c => {
      const campaign = store.allCampaigns.find(camp => camp.id === c.campaign_id);
      return `
        <div class="char-list-card" onclick="openCharEditor('${c.id}')">
          ${c.avatar_url ? `<img class="char-list-card-img" src="${c.avatar_url}" />` : `<div class="char-list-card-img-placeholder">👤</div>`}
          <div class="char-list-card-body">
            <div class="char-list-card-name">${c.name || '(sem nome)'}</div>
            <div class="char-list-card-camp ${campaign ? '' : 'none'}">${campaign ? campaign.name : 'Sem campanha'}</div>
          </div>
        </div>
      `;
    }).join('');

    if (store.myCharacters.length < MAX_CHARACTERS) {
      html += `
        <div class="char-list-card-new" onclick="openCharEditor(null)">
          <span class="icon">✦</span>
          <span class="label">Novo Investigador</span>
        </div>
      `;
    }

    grid.innerHTML = html || '<div class="loading">Nenhum personagem ainda. Crie o primeiro!</div>';
  }

export function openCharEditor(id) {
    store.editingCharId = id;
    avatarFile = null;
    fichaFile = null;
    currentFichaUrl = null;

    document.getElementById('char-list-view').classList.add('hidden');
    document.getElementById('char-editor').classList.add('open');

    // reset campos
    document.getElementById('char-name').value = '';
    document.getElementById('char-occupation').value = '';
    document.getElementById('char-age').value = '';
    document.getElementById('char-gender').value = '';
    document.getElementById('char-birthplace').value = '';
    document.getElementById('char-residence').value = '';
    document.getElementById('avatar-container').innerHTML = `
      <div class="char-avatar-placeholder" onclick="document.getElementById('avatar-input').click()">
        <span class="icon">🖼</span><span>Clique para<br>adicionar foto</span>
      </div>
      <input type="file" id="avatar-input" accept="image/*" class="hidden" onchange="handleAvatarChange(event)" />
    `;
    document.getElementById('ficha-upload-area').classList.remove('hidden');
    document.getElementById('ficha-uploaded').classList.add('hidden');
    document.getElementById('btn-delete-char').classList.add('hidden');

    populateCharCampaignSelect(null);

    const sheetBtn = document.getElementById('btn-open-sheet');
    sheetBtn.textContent = '📜 Criar Ficha Digital';
    sheetBtn.classList.remove('btn-small');
    sheetBtn.classList.add('btn-small', 'primary-small');

    if (id) {
      const c = store.myCharacters.find(ch => ch.id === id);
      if (c) {
        document.getElementById('char-name').value = c.name || '';
        document.getElementById('char-occupation').value = c.occupation || '';
        document.getElementById('char-age').value = c.age || '';
        document.getElementById('char-gender').value = c.gender || '';
        document.getElementById('char-birthplace').value = c.birthplace || '';
        document.getElementById('char-residence').value = c.residence || '';
        populateCharCampaignSelect(c.campaign_id);

        if (c.avatar_url) {
          document.getElementById('avatar-container').innerHTML = `
            <img src="${c.avatar_url}" class="char-avatar" onclick="document.getElementById('avatar-input').click()" />
            <input type="file" id="avatar-input" accept="image/*" class="hidden" onchange="handleAvatarChange(event)" />
          `;
        }
        if (c.ficha_url) {
          currentFichaUrl = c.ficha_url;
          document.getElementById('ficha-upload-area').classList.add('hidden');
          document.getElementById('ficha-uploaded').classList.remove('hidden');
          document.getElementById('ficha-name').textContent = c.ficha_name || 'ficha.pdf';
        }
        document.getElementById('btn-delete-char').classList.remove('hidden');

        checkExistingSheet(id);
      }
    } else {
      sheetBtn.textContent = '⚠ Salve o personagem primeiro';
    }
  }

export async function checkExistingSheet(charId) {
    const { data } = await sb.from('coc_sheets').select('id').eq('character_id', charId).maybeSingle();
    const sheetBtn = document.getElementById('btn-open-sheet');
    if (data) {
      sheetBtn.textContent = '📜 Ver Ficha Digital';
      sheetBtn.setAttribute('onclick', `openSheetViewer('${charId}')`);
    } else {
      sheetBtn.textContent = '📜 Criar Ficha Digital';
      sheetBtn.setAttribute('onclick', 'openSheetWizard()');
    }
  }

export function closeCharEditor() {
    store.editingCharId = null;
    document.getElementById('char-editor').classList.remove('open');
    document.getElementById('char-list-view').classList.remove('hidden');
  }

export function handleAvatarChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    avatarFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      document.getElementById('avatar-container').innerHTML = `
        <img src="${ev.target.result}" class="char-avatar" onclick="document.getElementById('avatar-input').click()" />
        <input type="file" id="avatar-input" accept="image/*" class="hidden" onchange="handleAvatarChange(event)" />
      `;
    };
    reader.readAsDataURL(file);
  }

export function handleFichaChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    fichaFile = file;
    document.getElementById('ficha-upload-area').classList.add('hidden');
    document.getElementById('ficha-uploaded').classList.remove('hidden');
    document.getElementById('ficha-name').textContent = file.name;
  }

export function openFicha() { if (currentFichaUrl) window.open(currentFichaUrl, '_blank'); }

export async function saveCharacter() {
    if (!store.editingCharId && store.myCharacters.length >= MAX_CHARACTERS) {
      showToast(`Limite de ${MAX_CHARACTERS} personagens atingido.`);
      return;
    }

    const btn = document.querySelector('.btn-save');
    btn.textContent = '...Salvando';
    btn.disabled = true;

    const charId = store.editingCharId || crypto.randomUUID();
    let avatarUrl = null, fichaUrl = null, fichaName = null;

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop();
      const path = `${store.currentUser.id}/${charId}/avatar.${ext}`;
      await sb.storage.from('characters').upload(path, avatarFile, { upsert: true });
      const { data: urlData } = sb.storage.from('characters').getPublicUrl(path);
      avatarUrl = urlData.publicUrl + '?t=' + Date.now();
    }

    if (fichaFile) {
      const path = `${store.currentUser.id}/${charId}/ficha.pdf`;
      await sb.storage.from('characters').upload(path, fichaFile, { upsert: true });
      const { data: urlData } = sb.storage.from('characters').getPublicUrl(path);
      fichaUrl = urlData.publicUrl;
      fichaName = fichaFile.name;
      currentFichaUrl = fichaUrl;
    }

    const campaignVal = document.getElementById('char-campaign').value;

    const payload = {
      id: charId,
      user_id: store.currentUser.id,
      user_email: store.currentUser.email,
      campaign_id: campaignVal || null,
      name: document.getElementById('char-name').value,
      occupation: document.getElementById('char-occupation').value,
      age: document.getElementById('char-age').value,
      gender: document.getElementById('char-gender').value,
      birthplace: document.getElementById('char-birthplace').value,
      residence: document.getElementById('char-residence').value,
      updated_at: new Date().toISOString(),
    };

    if (avatarUrl) payload.avatar_url = avatarUrl;
    if (fichaUrl) { payload.ficha_url = fichaUrl; payload.ficha_name = fichaName; }

    const { error } = await sb.from('characters').upsert(payload, { onConflict: 'id' });

    btn.textContent = '✦ Salvar Personagem';
    btn.disabled = false;

    if (error) { showToast('Erro: ' + error.message); return; }

    showToast('✦ Registro salvo com sucesso!');
    store.editingCharId = charId;
    document.getElementById('btn-delete-char').classList.remove('hidden');
    await loadMyCharacters();
  }

export function confirmDeleteCharacter() {
    charPendingDelete = store.editingCharId;
    document.getElementById('confirm-modal').classList.add('open');
  }

export function closeConfirmModal() {
    document.getElementById('confirm-modal').classList.remove('open');
    charPendingDelete = null;
  }

export async function deleteCharacter() {
    if (!charPendingDelete) return;
    const { error } = await sb.from('characters').delete().eq('id', charPendingDelete);
    closeConfirmModal();
    if (error) { showToast('Erro: ' + error.message); return; }
    showToast('Personagem excluído.');
    closeCharEditor();
    await loadMyCharacters();
  }
