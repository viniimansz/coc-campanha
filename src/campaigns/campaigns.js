import { sb } from '../lib/supabaseClient.js';
import { store } from '../lib/store.js';
import { showToast } from '../lib/utils.js';
import { loadNotes } from '../notes/notes.js';

let editCampaignId = null;

let editCampaignCoverFile = null;



export async function loadCampaigns() {
    const { data } = await sb.from('campaigns').select('*').order('created_at', { ascending: true });
    store.allCampaigns = data || [];
  }

export function populateCharCampaignSelect(selectedId) {
    const sel = document.getElementById('char-campaign');
    sel.innerHTML = '<option value="">— Sem campanha —</option>' +
      store.allCampaigns.map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.name}</option>`).join('');
  }

export async function createCampaign() {
    const name = document.getElementById('new-campaign-name').value.trim();
    const desc = document.getElementById('new-campaign-desc').value.trim();
    if (!name) { showToast('Dê um nome à campanha.'); return; }

    const { error } = await sb.from('campaigns').insert({ name, description: desc, created_by: store.currentUser.id });
    if (error) { showToast('Erro: ' + error.message); return; }

    document.getElementById('new-campaign-name').value = '';
    document.getElementById('new-campaign-desc').value = '';
    showToast('✦ Campanha criada!');
    await loadCampaigns();
    loadGuardianPanel();
  }

export function openEditCampaignModal(campaignId) {
    const camp = store.allCampaigns.find(c => c.id === campaignId);
    if (!camp) return;

    editCampaignId = campaignId;
    editCampaignCoverFile = null;

    document.getElementById('edit-campaign-name').value = camp.name || '';
    document.getElementById('edit-campaign-desc').value = camp.description || '';

    const preview = document.getElementById('edit-campaign-cover-preview');
    if (camp.cover_url) {
      preview.style.backgroundImage = `url('${camp.cover_url}')`;
    } else {
      preview.style.backgroundImage = 'none';
    }

    document.getElementById('edit-campaign-modal').classList.add('open');
  }

export function closeEditCampaignModal() {
    document.getElementById('edit-campaign-modal').classList.remove('open');
    editCampaignId = null;
  }

export function handleEditCampaignCoverChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    editCampaignCoverFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      document.getElementById('edit-campaign-cover-preview').style.backgroundImage = `url('${ev.target.result}')`;
    };
    reader.readAsDataURL(file);
  }

export async function saveEditCampaign() {
    if (!editCampaignId) return;

    const name = document.getElementById('edit-campaign-name').value.trim();
    const desc = document.getElementById('edit-campaign-desc').value.trim();
    if (!name) { showToast('Dê um nome à campanha.'); return; }

    let coverUrl = null;
    if (editCampaignCoverFile) {
      const ext = editCampaignCoverFile.name.split('.').pop();
      const path = `${store.currentUser.id}/campaign-covers/${editCampaignId}.${ext}`;
      const { error: uploadError } = await sb.storage.from('characters').upload(path, editCampaignCoverFile, { upsert: true });
      if (uploadError) { showToast('Erro no upload da capa: ' + uploadError.message); return; }
      const { data: urlData } = sb.storage.from('characters').getPublicUrl(path);
      coverUrl = urlData.publicUrl + '?t=' + Date.now();
    }

    const payload = { name, description: desc };
    if (coverUrl) payload.cover_url = coverUrl;

    const { error } = await sb.from('campaigns').update(payload).eq('id', editCampaignId);
    if (error) { showToast('Erro: ' + error.message); return; }

    showToast('✦ Campanha atualizada!');
    closeEditCampaignModal();
    await loadCampaigns();
    loadGuardianPanel();
  }

export async function renderCampaignsList() {
    await loadCampaigns();
    const grid = document.getElementById('campaigns-grid');

    if (!store.allCampaigns.length) {
      grid.innerHTML = '<div class="loading">Nenhuma campanha criada ainda.</div>';
      return;
    }

    const { data: chars } = await sb.from('characters').select('campaign_id');
    const counts = {};
    (chars || []).forEach(c => { if (c.campaign_id) counts[c.campaign_id] = (counts[c.campaign_id] || 0) + 1; });

    grid.innerHTML = store.allCampaigns.map(camp => {
      const bannerStyle = camp.cover_url ? `style="background-image:url('${camp.cover_url}'); background-size:cover; background-position:center;"` : '';
      return `
      <div class="campaign-tile" onclick="openCampaignDetail('${camp.id}')">
        <div class="campaign-tile-banner" ${bannerStyle}>
          ${camp.cover_url ? '' : '🦑'}
          <span class="campaign-tile-count">${counts[camp.id] || 0} investigador${(counts[camp.id] || 0) === 1 ? '' : 'es'}</span>
        </div>
        <div class="campaign-tile-body">
          <div class="campaign-tile-name">${camp.name}</div>
          <div class="campaign-tile-desc">${camp.description || ''}</div>
        </div>
      </div>
    `;
    }).join('');
  }

export function openCampaignDetail(campaignId) {
    store.currentCampaignId = campaignId;
    const camp = store.allCampaigns.find(c => c.id === campaignId);
    document.getElementById('campaign-detail-title').textContent = camp ? camp.name : '—';
    document.getElementById('campaign-detail-desc').textContent = camp ? (camp.description || '') : '';

    const banner = document.getElementById('campaign-detail-banner');
    if (camp && camp.cover_url) {
      banner.style.backgroundImage = `url('${camp.cover_url}')`;
      banner.textContent = '';
    } else {
      banner.style.backgroundImage = 'none';
      banner.textContent = '🦑';
    }

    document.getElementById('campaigns-list-view').classList.add('hidden');
    document.getElementById('campaign-detail-view').classList.remove('hidden');
    loadCampaignRoster();
    loadNotes();
  }

export function closeCampaignDetail() {
    store.currentCampaignId = null;
    document.getElementById('campaign-detail-view').classList.add('hidden');
    document.getElementById('campaigns-list-view').classList.remove('hidden');
    renderCampaignsList();
  }

export async function loadCampaignRoster() {
    const campaignId = store.currentCampaignId;
    const roster = document.getElementById('campaign-roster');

    if (!campaignId) { roster.innerHTML = ''; return; }

    const { data } = await sb.from('characters').select('name, occupation, avatar_url, user_id').eq('campaign_id', campaignId);

    if (!data || data.length === 0) {
      roster.innerHTML = '<div class="loading" style="font-size:0.9rem; padding:1rem 0;">Nenhum investigador nesta campanha ainda.</div>';
      return;
    }

    const userIds = [...new Set(data.map(c => c.user_id).filter(Boolean))];
    let profilesById = {};
    if (userIds.length) {
      const { data: profs } = await sb.from('profiles').select('user_id, nickname, display_name').in('user_id', userIds);
      (profs || []).forEach(p => { profilesById[p.user_id] = p; });
    }

    roster.innerHTML = data.map(c => {
      const prof = profilesById[c.user_id];
      const playerTag = prof && prof.nickname ? `@${prof.nickname}` : (prof && prof.display_name ? prof.display_name : '');
      return `
      <div class="roster-card" onclick="openPublicProfile('${c.user_id}')" style="cursor:pointer;">
        ${c.avatar_url ? `<img class="roster-card-img" src="${c.avatar_url}" />` : `<div class="roster-card-img-placeholder">👤</div>`}
        <div class="roster-card-body">
          <div class="roster-card-name">${c.name || '(sem nome)'}</div>
          <div class="roster-card-occupation">${c.occupation || '—'}</div>
          ${playerTag ? `<div class="roster-card-player">jogado por ${playerTag}</div>` : ''}
        </div>
      </div>
    `;
    }).join('');
  }
