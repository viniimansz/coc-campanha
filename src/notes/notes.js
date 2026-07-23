import { sb } from '../lib/supabaseClient.js';
import { store } from '../lib/store.js';
import { showToast } from '../lib/utils.js';

export async function loadNotes() {
    const campaignId = store.currentCampaignId;
    const list = document.getElementById('notes-list');

    if (!campaignId) {
      list.innerHTML = '<div class="loading">Nenhuma campanha selecionada.</div>';
      return;
    }

    const { data } = await sb.from('notes').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false });

    if (!data || data.length === 0) {
      list.innerHTML = `<div class="loading" style="font-style:italic">Nenhuma nota registrada nesta campanha ainda.</div>`;
      return;
    }

    list.innerHTML = data.map(n => `
      <div class="note-card">
        <div class="note-session">${n.session || 'Nota Geral'}</div>
        <div class="note-title">${n.title}</div>
        <div class="note-content">${n.content}</div>
        <div class="note-date">${new Date(n.created_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })}</div>
      </div>
    `).join('');
  }

export async function saveNote() {
    const campaignId = store.currentCampaignId;
    if (!campaignId) { showToast('Nenhuma campanha selecionada.'); return; }

    const session = document.getElementById('note-session').value;
    const title = document.getElementById('note-title').value;
    const content = document.getElementById('note-content').value;

    if (!title || !content) { showToast('Preencha título e conteúdo.'); return; }

    const { error } = await sb.from('notes').insert({ session, title, content, author_id: store.currentUser.id, campaign_id: campaignId });

    if (error) showToast('Erro: ' + error.message);
    else {
      showToast('✦ Nota publicada!');
      document.getElementById('note-session').value = '';
      document.getElementById('note-title').value = '';
      document.getElementById('note-content').value = '';
      loadNotes();
    }
  }
