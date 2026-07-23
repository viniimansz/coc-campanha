import { loadGuardianPanel } from '../guardian/guardian.js';
import { closeCharEditor, loadMyCharacters } from '../characters/characters.js';
import { loadProfile } from '../profile/profile.js';
import { renderCampaignsList } from '../campaigns/campaigns.js';
import { loadPlayersGrid } from '../players/players.js';

export function toggleMobileMenu() { document.getElementById('mobile-menu').classList.toggle('open'); }

export function showPage(name, btn, fromMobile) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.nav-profile-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('page-' + name).classList.add('active');
    if (btn) btn.classList.add('active');
    var mirror = fromMobile ? document.getElementById('nav-' + name) : document.getElementById('mnav-' + name);
    if (mirror) mirror.classList.add('active');
    if (fromMobile) document.getElementById('mobile-menu').classList.remove('open');
    if (name === 'guardian') loadGuardianPanel();
    if (name === 'character') { closeCharEditor(); loadMyCharacters(); }
    if (name === 'profile') loadProfile();
    if (name === 'notes') {
      document.getElementById('campaign-detail-view').classList.add('hidden');
      document.getElementById('campaigns-list-view').classList.remove('hidden');
      renderCampaignsList();
    }
    if (name === 'players') loadPlayersGrid();
  }
