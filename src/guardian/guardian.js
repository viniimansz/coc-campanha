import { sb } from '../lib/supabaseClient.js';
import { store } from '../lib/store.js';
import { GUARDIAN_EMAIL } from '../lib/supabaseClient.js';
import { loadCampaigns } from '../campaigns/campaigns.js';

let guardianProfilesById = {};



export async function loadGuardianPanel() {
    await loadCampaigns();
    const { data: chars } = await sb.from('characters').select('*');
    const container = document.getElementById('guardian-campaigns');

    const userIds = [...new Set((chars || []).map(c => c.user_id).filter(Boolean))];
    guardianProfilesById = {};
    if (userIds.length) {
      const { data: profs } = await sb.from('profiles').select('user_id, nickname, display_name').in('user_id', userIds);
      (profs || []).forEach(p => { guardianProfilesById[p.user_id] = p; });
    }

    if (!store.allCampaigns.length) {
      container.innerHTML = '<div class="loading">Nenhuma campanha criada ainda. Crie uma acima.</div>';
      return;
    }

    let html = '';
    store.allCampaigns.forEach(camp => {
      const campChars = (chars || []).filter(c => c.campaign_id === camp.id);
      html += `
        <div class="guardian-section-title" style="display:flex; align-items:center; justify-content:space-between; gap:0.8rem;">
          <span>${camp.name} <span style="font-family:'Cormorant Garamond', serif; font-style:italic; font-size:0.8rem; color:var(--parchment-darker)">(${campChars.length} investigador${campChars.length === 1 ? '' : 'es'})</span></span>
          <button class="btn-small" onclick="openEditCampaignModal('${camp.id}')" style="flex-shrink:0;">✎ Editar Campanha</button>
        </div>
        <div class="guardian-grid">
      `;
      if (campChars.length === 0) {
        html += '<div class="loading" style="font-size:0.9rem; padding:1rem">Nenhum personagem nesta campanha ainda.</div>';
      } else {
        html += campChars.map(c => playerCardHtml(c)).join('');
      }
      html += '</div>';
    });

    const unassigned = (chars || []).filter(c => !c.campaign_id);
    if (unassigned.length > 0) {
      html += `
        <div class="guardian-section-title">Sem Campanha <span style="font-family:'Cormorant Garamond', serif; font-style:italic; font-size:0.8rem; color:var(--parchment-darker)">(${unassigned.length})</span></div>
        <div class="guardian-grid">
          ${unassigned.map(c => playerCardHtml(c)).join('')}
        </div>
      `;
    }

    container.innerHTML = html;
  }

export function playerCardHtml(c) {
    const prof = guardianProfilesById[c.user_id];
    const playerLabel = prof && prof.display_name
      ? (prof.nickname ? `${prof.display_name} (@${prof.nickname})` : prof.display_name)
      : (c.user_email ? c.user_email.split('@')[0] : 'desconhecido');
    const campaignOptions = ['<option value="">— Sem campanha —</option>']
      .concat(store.allCampaigns.map(camp => `<option value="${camp.id}" ${camp.id === c.campaign_id ? 'selected' : ''}>${camp.name}</option>`))
      .join('');
    return `
      <div class="player-card">
        <div onclick="openPlayerModal(${JSON.stringify(c).replace(/"/g, '&quot;')})" style="cursor:pointer;">
          ${c.avatar_url ? `<img class="player-card-img" src="${c.avatar_url}" />` : `<div class="player-card-img-placeholder">👤</div>`}
        </div>
        <div class="player-card-body">
          <div class="player-card-owner">🧑 ${playerLabel}</div>
          <div class="player-card-name">${c.name || '(sem nome)'}</div>
          <div class="player-card-occupation">${c.occupation || '—'}</div>
          <select class="player-card-campaign-select" onclick="event.stopPropagation()" onchange="assignToCampaign('${c.id}', this.value)">
            ${campaignOptions}
          </select>
          <div class="player-card-actions">
            ${c.ficha_url ? `<button class="btn-small primary-small" onclick="event.stopPropagation(); window.open('${c.ficha_url}', '_blank')">Ver Ficha</button>` : '<span style="font-size:0.7rem; opacity:0.6;">Sem ficha</span>'}
          </div>
        </div>
      </div>
    `;
  }

export async function assignToCampaign(charId, campaignId) {
    const { error } = await sb.from('characters').update({ campaign_id: campaignId || null }).eq('id', charId);
    if (error) { showToast('Erro: ' + error.message); return; }
    showToast(campaignId ? '✦ Personagem movido!' : 'Personagem removido da campanha.');
    loadGuardianPanel();
  }

export function openPlayerModal(char) {
    document.querySelector('#player-modal .modal').classList.remove('modal--profile');
    document.getElementById('modal-player-name').textContent = char.name || 'Investigador';
    document.getElementById('modal-content').innerHTML = `
      <table style="width:100%; border-collapse:collapse; font-family: 'EB Garamond', serif; font-size:1rem; color: var(--ink-faded);">
        <tr><td style="padding:0.3rem 0; font-family:'Cormorant Garamond', serif; font-size:0.7rem; color:var(--ink-light); text-transform:uppercase; width:40%">Email</td><td>${char.user_email || '—'}</td></tr>
        <tr><td style="padding:0.3rem 0; font-family:'Cormorant Garamond', serif; font-size:0.7rem; color:var(--ink-light); text-transform:uppercase;">Ocupação</td><td>${char.occupation || '—'}</td></tr>
        <tr><td style="padding:0.3rem 0; font-family:'Cormorant Garamond', serif; font-size:0.7rem; color:var(--ink-light); text-transform:uppercase;">Idade</td><td>${char.age || '—'}</td></tr>
        <tr><td style="padding:0.3rem 0; font-family:'Cormorant Garamond', serif; font-size:0.7rem; color:var(--ink-light); text-transform:uppercase;">Gênero</td><td>${char.gender || '—'}</td></tr>
        <tr><td style="padding:0.3rem 0; font-family:'Cormorant Garamond', serif; font-size:0.7rem; color:var(--ink-light); text-transform:uppercase;">Naturalidade</td><td>${char.birthplace || '—'}</td></tr>
        <tr><td style="padding:0.3rem 0; font-family:'Cormorant Garamond', serif; font-size:0.7rem; color:var(--ink-light); text-transform:uppercase;">Residência</td><td>${char.residence || '—'}</td></tr>
      </table>
      ${char.ficha_url ? `<div style="margin-top:1.5rem"><button class="btn-small primary-small" onclick="window.open('${char.ficha_url}', '_blank')">📄 Abrir Ficha PDF</button></div>` : ''}
    `;
    document.getElementById('player-modal').classList.add('open');
  }

export function closeModal() { document.getElementById('player-modal').classList.remove('open'); }
