import { sb } from '../lib/supabaseClient.js';
import { defaultAvatarSvg } from '../lib/utils.js';

export async function loadPlayersGrid() {
    const grid = document.getElementById('players-grid');
    const { data: profiles, error } = await sb.from('profiles').select('*').order('display_name', { ascending: true });

    if (error) {
      grid.innerHTML = `<div class="loading">Erro ao carregar jogadores: ${error.message}</div>`;
      return;
    }

    if (!profiles || profiles.length === 0) {
      grid.innerHTML = '<div class="loading">Nenhum jogador cadastrado ainda.</div>';
      return;
    }

    grid.innerHTML = profiles.map(p => {
      const avatarUrl = p.avatar_url || defaultAvatarSvg();
      const coverStyle = p.cover_url ? `background-image:url('${p.cover_url}'); background-size:cover; background-position:center;` : '';
      return `
        <div class="player-tile" onclick="openPublicProfile('${p.user_id}')">
          <div class="player-tile-cover" style="${coverStyle}"></div>
          <img class="player-tile-avatar" src="${avatarUrl}" />
          <div class="player-tile-body">
            <div class="player-tile-name">${p.display_name || '(sem nome)'}</div>
            ${p.nickname ? `<div class="player-tile-nick">@${p.nickname.replace(/^@/, '')}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

export async function openPublicProfile(userId) {
    const { data } = await sb.from('profiles').select('*').eq('user_id', userId).maybeSingle();
    const p = data || {};

    const { data: chars } = await sb.from('characters').select('name, occupation, avatar_url, campaign_id').eq('user_id', userId);

    document.getElementById('modal-player-name').textContent = '';
    document.querySelector('#player-modal .modal').classList.add('modal--profile');

    const avatarUrl = p.avatar_url || defaultAvatarSvg();
    const coverHtml = p.cover_url
      ? `<img src="${p.cover_url}" style="width:100%; height:140px; object-fit:cover; display:block;" />`
      : `<div style="width:100%; height:140px; background:linear-gradient(135deg, #2e2118 0%, #1c1815 100%);"></div>`;

    let charsHtml = '';
    if (chars && chars.length > 0) {
      charsHtml = `
        <div style="font-family:'Cormorant', serif; font-size:0.75rem; letter-spacing:0.12em; color:var(--ink-faded); text-transform:uppercase; margin:1.5rem 0 0.8rem; border-bottom:1px solid var(--parchment-darker); padding-bottom:0.4rem;">Investigadores</div>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap:0.8rem;">
          ${chars.map(c => `
            <div style="text-align:center;">
              ${c.avatar_url ? `<img src="${c.avatar_url}" style="width:100%; height:90px; object-fit:cover; border:1px solid var(--parchment-darker);" />` : `<div style="width:100%; height:90px; background:var(--parchment-dark); display:flex; align-items:center; justify-content:center; font-size:1.6rem; border:1px solid var(--parchment-darker);">👤</div>`}
              <div style="font-family:'Cormorant', serif; font-size:0.7rem; color:var(--ink); margin-top:0.3rem;">${c.name || '(sem nome)'}</div>
              <div style="font-family:'Cormorant', serif; font-style:italic; font-size:0.65rem; color:var(--ink-light);">${c.occupation || '—'}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    document.getElementById('modal-content').innerHTML = `
      ${coverHtml}
      <div class="modal-body-inner">
        <div style="display:flex; align-items:flex-end; gap:1.2rem; margin: -45px 0 1.2rem;">
          <img src="${avatarUrl}" style="width:90px; height:90px; border-radius:50%; object-fit:cover; border:4px solid var(--parchment); background:var(--parchment-dark); box-shadow:0 2px 10px rgba(0,0,0,0.4); flex-shrink:0;" />
          <div style="padding-bottom:0.3rem;">
            <div style="font-family:'Cormorant', serif; font-size:1.15rem; color:var(--ink)">${p.display_name || '(sem nome)'}</div>
            ${p.nickname ? `<div style="font-family:'Cormorant', serif; font-style:italic; color:var(--ink-light); font-size:0.9rem;">@${p.nickname.replace(/^@/, '')}</div>` : ''}
          </div>
        </div>
        ${p.bio ? `<p style="font-family:'EB Garamond', serif; font-size:1rem; color:var(--ink-faded); line-height:1.6; white-space:pre-wrap;">${p.bio}</p>` : '<p style="font-style:italic; color:var(--ink-light); font-size:0.9rem;">Este investigador não escreveu uma bio ainda.</p>'}
        ${charsHtml}
      </div>
    `;
    document.getElementById('player-modal').classList.add('open');
  }
