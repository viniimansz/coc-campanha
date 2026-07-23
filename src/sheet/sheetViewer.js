import { sb } from '../lib/supabaseClient.js';
import { showToast } from '../lib/utils.js';
import { store } from '../lib/store.js';
import { sheetStore } from './sheetStore.js';
import { openSheetWizard } from './sheetWizard.js';

export async function openSheetViewer(charId) {
    await loadSheetReferenceData();
    sheetStore.svCurrentCharId = charId;
    sheetStore.swViewerReturnCharId = null;

    const char = store.myCharacters.find(c => c.id === charId) || (store.allCampaigns.length ? null : null);
    const { data: sheet } = await sb.from('coc_sheets').select('*').eq('character_id', charId).maybeSingle();
    if (!sheet) { showToast('Esta ficha ainda não foi criada.'); return; }
    sheetStore.svCurrentSheet = sheet;

    document.getElementById('sv-edit-btn').setAttribute('onclick', `prepareEditFromViewer('${charId}')`);

    renderViewerPage1(char, sheet);
    await renderViewerPage2(char, sheet);

    document.getElementById('sheet-viewer-overlay').classList.add('open');
    switchViewerTab(1);
  }

export function prepareEditFromViewer(charId) {
    sheetStore.swViewerReturnCharId = charId;
    store.editingCharId = charId;
    document.getElementById('sheet-viewer-overlay').classList.remove('open');
    openSheetWizard();
  }

export function closeSheetViewer() {
    document.getElementById('sheet-viewer-overlay').classList.remove('open');
    sheetStore.svCurrentCharId = null;
    sheetStore.svCurrentSheet = null;
  }

export function switchViewerTab(tab) {
    document.querySelectorAll('.sv-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sv-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('sv-page-' + tab).classList.add('active');
    document.getElementById('sv-tab-' + tab).classList.add('active');
  }

export function thirdsBox(total) {
    const half = Math.floor(total / 2);
    const fifth = Math.floor(total / 5);
    return `<span class="sv-frac-box">${half}<small>½</small></span><span class="sv-frac-box">${fifth}<small>⅕</small></span>`;
  }

export function renderViewerPage1(char, sheet) {
    document.getElementById('sv-name').textContent = (char && char.name) || '—';
    const occ = sheetStore.swOccupationsReference.find(o => o.id === sheet.occupation_id);
    document.getElementById('sv-occupation').textContent = occ ? occ.name : '—';
    document.getElementById('sv-age').textContent = (char && char.age) || '—';

    const attrs = [
      ['FOR', sheet.forca], ['CON', sheet.constituicao], ['TAM', sheet.tamanho], ['DES', sheet.destreza],
      ['APA', sheet.aparencia], ['INT', sheet.inteligencia], ['POD', sheet.poder], ['EDU', sheet.educacao]
    ];
    document.getElementById('sv-attrs-row').innerHTML = attrs.map(([lab, val]) => `
      <div class="sv-attr-box">
        <div class="lab">${lab}</div>
        <div class="val">${val || 0}</div>
        <div class="frac">½${Math.floor((val||0)/2)} ⅕${Math.floor((val||0)/5)}</div>
      </div>
    `).join('');

    renderVitalTrack('pv', sheet.pv_atual, sheet.pv_max);
    renderVitalTrack('san', sheet.sanidade_atual, sheet.sanidade_max);
    renderVitalTrack('pm', sheet.pm_atual, sheet.pm_max);
    document.getElementById('sv-sorte-text').textContent = sheet.sorte || 0;

    document.getElementById('sv-derived-row').innerHTML = `
      <div class="sv-derived-box"><div class="num">${sheet.movimento || 8}</div><div class="lab">Movimento</div></div>
      <div class="sv-derived-box"><div class="num">${sheet.bonus_dano || '0'}</div><div class="lab">Bônus Dano</div></div>
      <div class="sv-derived-box"><div class="num">${sheet.corpo ?? 0}</div><div class="lab">Corpo</div></div>
      <div class="sv-derived-box"><div class="num">${Math.floor((sheet.destreza||0)/2)}</div><div class="lab">Esquiva</div></div>
      <div class="sv-derived-box"><div class="num">${sheet.nivel_credito ?? 0}</div><div class="lab">Crédito</div></div>
    `;

    const checkedSkills = sheet.checked_skills || [];
    const skillsGrid = document.getElementById('sv-skills-grid');
    const rows = [];

    sheetStore.swSkillsReference.forEach(ref => {
      const alloc = (sheet.skills || {})[ref.id];
      const total = (alloc !== undefined && alloc !== null) ? alloc : getSkillBaseFromSheet(ref.id, sheet);
      const checked = checkedSkills.includes(ref.id);
      rows.push(`
        <div class="sv-skill-cell">
          <div class="chk ${checked ? 'checked' : ''}" onclick="toggleSkillChecked('${ref.id}')"></div>
          <span class="nm">${ref.name}</span>
          <span class="vl">${total}%</span>
          ${thirdsBox(total)}
          <button class="sv-roll-btn" onclick="rollSkillTest('${ref.name.replace(/'/g, "\\'")}', ${total})" title="Rolar teste">🎲</button>
        </div>
      `);
    });

    (sheet.custom_skills || []).forEach(c => {
      if (!c.name) return;
      const checked = checkedSkills.includes(c.id);
      rows.push(`
        <div class="sv-skill-cell">
          <div class="chk ${checked ? 'checked' : ''}" onclick="toggleSkillChecked('${c.id}')"></div>
          <span class="nm">${c.name}</span>
          <span class="vl">${c.value || 0}%</span>
          ${thirdsBox(c.value || 0)}
          <button class="sv-roll-btn" onclick="rollSkillTest('${c.name.replace(/'/g, "\\'")}', ${c.value || 0})" title="Rolar teste">🎲</button>
        </div>
      `);
    });
    skillsGrid.innerHTML = rows.join('') || '<span class="loading" style="font-size:0.85rem;">Nenhuma perícia registrada.</span>';

    const weaponsTable = document.getElementById('sv-weapons-table');
    const weapons = sheet.weapons || [];
    let wHtml = `<div class="sv-weapon-line header"><span>Arma</span><span>Reg.</span><span>Dif.</span><span>Ext.</span><span>Dano</span><span>Alcance</span><span>Ataq.</span></div>`;
    wHtml += `<div class="sv-weapon-line"><span>Desarmado</span><span>${sheet.skills?.luta_briga || 25}</span><span>${Math.floor((sheet.skills?.luta_briga || 25)/2)}</span><span>${Math.floor((sheet.skills?.luta_briga || 25)/5)}</span><span>1d3+BD</span><span>—</span><span>1</span></div>`;
    weapons.forEach(w => {
      wHtml += `<div class="sv-weapon-line"><span>${w.name || '—'}</span><span>${w.regular || 0}</span><span>${w.dificil || 0}</span><span>${w.extremo || 0}</span><span>${w.dano || '—'}</span><span>${w.alcance || '—'}</span><span>${w.ataques || 1}</span></div>`;
    });
    weaponsTable.innerHTML = wHtml;
  }

export function renderVitalTrack(prefix, current, max) {
    const key = prefix === 'san' ? 'sanidade' : (prefix === 'pv' ? 'pv' : 'pm');
    current = current ?? max ?? 0;
    max = max || 0;
    const track = document.getElementById('sv-' + prefix + '-track');
    let cells = '';
    for (let i = 1; i <= max; i++) {
      cells += `<div class="sv-vital-box-cell ${i <= current ? 'filled' : ''}" onclick="setVitalByClick('${key}', ${i}, ${max})"></div>`;
    }
    track.innerHTML = cells;
    document.getElementById('sv-' + prefix + '-text').textContent = `${current} / ${max}`;

    const box = track.closest('.sv-vital-box');
    box.classList.remove('sv-sanity-critical', 'sv-pv-critical', 'sv-pm-critical');
    const critical = max > 0 && current <= Math.floor(max / 5);
    if (critical) {
      if (prefix === 'san') box.classList.add('sv-sanity-critical');
      if (prefix === 'pv') box.classList.add('sv-pv-critical');
      if (prefix === 'pm') box.classList.add('sv-pm-critical');
    }
  }

export async function setVitalByClick(key, clickedIndex, max) {
    const fieldAtual = key + '_atual';
    const current = sheetStore.svCurrentSheet[fieldAtual] ?? max;
    // Clicar na última célula preenchida desmarca ela; senão marca até o ponto clicado
    const newVal = (clickedIndex === current) ? clickedIndex - 1 : clickedIndex;
    await updateVitalValue(key, newVal);
  }

export async function adjustVital(key, delta) {
    const fieldAtual = key === 'sorte' ? 'sorte' : key + '_atual';
    const fieldMax = key + '_max';
    const current = sheetStore.svCurrentSheet[fieldAtual] ?? sheetStore.svCurrentSheet[fieldMax];
    const max = key === 'sorte' ? 999 : sheetStore.svCurrentSheet[fieldMax];
    const newVal = Math.max(0, Math.min(max, current + delta));
    await updateVitalValue(key, newVal);
  }

export async function updateVitalValue(key, newVal) {
    const field = key === 'sorte' ? 'sorte' : key + '_atual';
    sheetStore.svCurrentSheet[field] = newVal;

    if (key === 'sorte') {
      document.getElementById('sv-sorte-text').textContent = newVal;
    } else {
      const prefix = key === 'sanidade' ? 'san' : key;
      renderVitalTrack(prefix, newVal, sheetStore.svCurrentSheet[key + '_max']);
    }

    const { error } = await sb.from('coc_sheets').update({ [field]: newVal, updated_at: new Date().toISOString() }).eq('id', sheetStore.svCurrentSheet.id);
    if (error) showToast('Erro ao salvar: ' + error.message);
  }

export async function renderViewerPage2(char, sheet) {
    const a = sheet.antecedentes || {};
    const fields = [
      ['Descrição Pessoal', a.descricao_pessoal], ['Características', a.caracteristicas],
      ['Ideologias / Crenças', a.ideologias], ['Ferimentos e Cicatrizes', a.ferimentos_cicatrizes],
      ['Pessoas Significativas', a.pessoas_significativas], ['Fobias e Manias', a.fobias_manias],
      ['Locais Importantes', a.locais_importantes], ['Tomos, Feitiços e Artefatos', a.tomos_artefatos],
      ['Pertences Queridos', a.pertences_queridos], ['Encontros com Entidades Estranhas', a.encontros_estranhos]
    ];
    document.getElementById('sv-ante-display-grid').innerHTML = fields.map(([label, val]) => `
      <div class="sv-ante-box"><label>${label}</label><div class="txt">${val || '—'}</div></div>
    `).join('');

    document.getElementById('sv-equipment-display').textContent = sheet.equipment || '—';
    document.getElementById('sv-backstory-display').textContent = sheet.backstory || '—';

    const d = sheet.dinheiro || {};
    document.getElementById('sv-money-row').innerHTML = `
      <div class="sv-ante-box"><label>Nível de Gastos</label><div class="txt">${d.nivel_gastos || '—'}</div></div>
      <div class="sv-ante-box"><label>Dinheiro</label><div class="txt">${d.dinheiro || '—'}</div></div>
      <div class="sv-ante-box"><label>Patrimônio</label><div class="txt">${d.patrimonio || '—'}</div></div>
    `;

    await renderCompanions(sheetStore.svCurrentCharId);
  }

export async function renderCompanions(charId) {
    const grid = document.getElementById('sv-companions-grid');
    const { data: links } = await sb.from('investigator_links').select('*, linked:linked_character_id(id, name, avatar_url)').eq('character_id', charId);

    if (!links || links.length === 0) {
      grid.innerHTML = '<span class="loading" style="font-size:0.85rem; grid-column:1/-1;">Nenhum companheiro adicionado ainda.</span>';
      return;
    }

    grid.innerHTML = links.map(link => `
      <div class="sv-companion-card">
        <button class="sv-companion-remove" onclick="removeCompanion('${link.id}')">✕</button>
        ${link.linked && link.linked.avatar_url ? `<img src="${link.linked.avatar_url}" />` : `<div style="width:100%; height:80px; background:var(--parchment-dark); display:flex; align-items:center; justify-content:center; font-size:1.5rem;">👤</div>`}
        <div class="nm">${link.linked ? link.linked.name : '(desconhecido)'}</div>
      </div>
    `).join('');
  }

export async function openAddCompanionModal() {
    const { data: others } = await sb.from('characters').select('id, name').neq('id', sheetStore.svCurrentCharId);
    const sel = document.getElementById('companion-select');
    sel.innerHTML = (others || []).map(c => `<option value="${c.id}">${c.name || '(sem nome)'}</option>`).join('') || '<option value="">Nenhum outro personagem encontrado</option>';
    document.getElementById('add-companion-modal').classList.add('open');
  }

export function closeAddCompanionModal() {
    document.getElementById('add-companion-modal').classList.remove('open');
  }

export async function confirmAddCompanion() {
    const linkedId = document.getElementById('companion-select').value;
    if (!linkedId) { showToast('Selecione um personagem.'); return; }

    const { error } = await sb.from('investigator_links').insert({ character_id: sheetStore.svCurrentCharId, linked_character_id: linkedId });
    if (error) { showToast('Erro: ' + error.message); return; }

    showToast('✦ Companheiro adicionado!');
    closeAddCompanionModal();
    await renderCompanions(sheetStore.svCurrentCharId);
  }

export async function removeCompanion(linkId) {
    const { error } = await sb.from('investigator_links').delete().eq('id', linkId);
    if (error) { showToast('Erro: ' + error.message); return; }
    await renderCompanions(sheetStore.svCurrentCharId);
  }

export function getSkillBaseFromSheet(skillId, sheet) {
    const ref = sheetStore.swSkillsReference.find(s => s.id === skillId);
    if (!ref) return 0;
    if (skillId === 'idioma_proprio') return sheet.educacao || 0;
    if (skillId === 'esquiva') return Math.round((sheet.destreza || 0) / 2);
    return ref.base_value;
  }

export async function toggleSkillChecked(skillId) {
    const checked = sheetStore.svCurrentSheet.checked_skills || [];
    const idx = checked.indexOf(skillId);
    if (idx >= 0) checked.splice(idx, 1);
    else checked.push(skillId);

    sheetStore.svCurrentSheet.checked_skills = checked;
    const { error } = await sb.from('coc_sheets').update({ checked_skills: checked }).eq('id', sheetStore.svCurrentSheet.id);
    if (error) { showToast('Erro: ' + error.message); return; }
    renderViewerPage1(store.myCharacters.find(c => c.id === sheetStore.svCurrentCharId), sheetStore.svCurrentSheet);
  }

export function rollSkillTest(skillName, target) {
    const roll = Math.floor(Math.random() * 100) + 1;
    const half = Math.floor(target / 2);
    const fifth = Math.floor(target / 5);

    let resultLabel, resultClass;
    if (roll === 1) { resultLabel = 'Sucesso Crítico'; resultClass = 'crit'; }
    else if (target >= 50 && roll > 95) { resultLabel = 'Falha Crítica'; resultClass = 'fail'; }
    else if (target < 50 && roll >= 96) { resultLabel = 'Falha Crítica'; resultClass = 'fail'; }
    else if (roll <= fifth) { resultLabel = 'Sucesso Extremo'; resultClass = 'crit'; }
    else if (roll <= half) { resultLabel = 'Sucesso Difícil'; resultClass = 'good'; }
    else if (roll <= target) { resultLabel = 'Sucesso Regular'; resultClass = 'good'; }
    else { resultLabel = 'Fracasso'; resultClass = 'fail'; }

    showRollResult(skillName, roll, target, resultLabel, resultClass);
  }

export function showRollResult(skillName, roll, target, resultLabel, resultClass) {
    const toast = document.getElementById('roll-toast');
    toast.className = 'roll-toast show ' + resultClass;
    toast.innerHTML = `
      <div class="roll-toast-skill">${skillName} <span class="roll-toast-target">(${target}%)</span></div>
      <div class="roll-toast-number">${roll}</div>
      <div class="roll-toast-result">${resultLabel}</div>
    `;
    clearTimeout(window._rollToastTimer);
    window._rollToastTimer = setTimeout(() => { toast.classList.remove('show'); }, 4000);
  }
