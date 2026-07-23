import { sb } from '../lib/supabaseClient.js';
import { showToast } from '../lib/utils.js';
import { store } from '../lib/store.js';
import { sheetStore } from './sheetStore.js';
import { openSheetViewer } from './sheetViewer.js';

const ATTR_LABELS = {
  forca: 'FOR', constituicao: 'CON', tamanho: 'TAM', destreza: 'DES',
  aparencia: 'APA', inteligencia: 'INT', poder: 'POD', educacao: 'EDU'
};

const ATTR_ROLL_TYPE = {
  forca: '3d6', constituicao: '3d6', tamanho: '2d6+6', destreza: '3d6',
  aparencia: '3d6', inteligencia: '2d6+6', poder: '3d6', educacao: '2d6+6'
};

let swState = null; // estado da ficha em construção

let swEditingSheetCharId = null;

let swExistingSheetId = null;

let swSelectedChipId = null;

const SW_STEP_META = {
  1: { title: 'Atributos', sub: 'Role os dados ou preencha os oito atributos base do seu investigador.' },
  2: { title: 'Ocupação', sub: 'Escolha a profissão que abre portas — e algumas fechaduras.' },
  3: { title: 'Perícias', sub: 'Distribua os pontos entre o que seu investigador aprendeu a fazer.' },
  4: { title: 'Combate', sub: 'Registre armas, defesas e o que ele carrega para o inevitável.' },
  5: { title: 'Antecedentes', sub: 'Costure a história, os medos e as pessoas que o mantêm de pé.' },
};

const SW_TOTAL_STEPS = 5;



export function roll3d6x5() { return (Math.floor(Math.random()*6+1)+Math.floor(Math.random()*6+1)+Math.floor(Math.random()*6+1)) * 5; }

export function roll2d6p6x5() { return (Math.floor(Math.random()*6+1)+Math.floor(Math.random()*6+1)+6) * 5; }

export async function loadSheetReferenceData() {
    if (sheetStore.swSkillsReference.length && sheetStore.swOccupationsReference.length) return;
    const { data: skills } = await sb.from('skills_reference').select('*').order('name');
    const { data: occs } = await sb.from('occupations_reference').select('*').order('name');
    sheetStore.swSkillsReference = skills || [];
    sheetStore.swOccupationsReference = occs || [];
  }

export async function openSheetWizard() {
    if (!store.editingCharId) { showToast('Salve o personagem antes de criar a ficha.'); return; }
    await loadSheetReferenceData();

    swEditingSheetCharId = store.editingCharId;
    swExistingSheetId = null;

    swState = {
      attrs: { forca: null, constituicao: null, tamanho: null, destreza: null, aparencia: null, inteligencia: null, poder: null, educacao: null },
      rolledPool: [],
      occupationId: null,
      occSkillPoints: 0,
      persSkillPoints: 0,
      skillAllocation: {},
      customSkills: [],
      weapons: [],
      equipment: '',
      backstory: '',
      antecedentes: {},
      dinheiro: {},
      nivelCredito: 0
    };

    const { data: existing } = await sb.from('coc_sheets').select('*').eq('character_id', store.editingCharId).maybeSingle();
    if (existing) {
      swExistingSheetId = existing.id;
      swState.attrs = {
        forca: existing.forca, constituicao: existing.constituicao, tamanho: existing.tamanho, destreza: existing.destreza,
        aparencia: existing.aparencia, inteligencia: existing.inteligencia, poder: existing.poder, educacao: existing.educacao
      };
      swState.occupationId = existing.occupation_id;
      swState.skillAllocation = existing.raw_skill_allocation || {};
      swState.customSkills = existing.custom_skills || [];
      swState.weapons = existing.weapons || [];
      swState.equipment = existing.equipment || '';
      swState.backstory = existing.backstory || '';
      swState.antecedentes = existing.antecedentes || {};
      swState.dinheiro = existing.dinheiro || {};
      swState.nivelCredito = existing.nivel_credito || 0;
    }

    document.getElementById('sheet-wizard-overlay').classList.add('open');
    goToStep(1);
  }

export function closeSheetWizard() {
    document.getElementById('sheet-wizard-overlay').classList.remove('open');
  }

export function goToStep(step) {
    document.querySelectorAll('.sw-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sw-step').forEach((s, i) => {
      s.classList.remove('active');
      s.classList.toggle('done', (i + 1) < step);
    });
    document.getElementById('sw-panel-' + step).classList.add('active');
    document.getElementById('sw-tab-' + step).classList.add('active');

    const meta = SW_STEP_META[step];
    const eyebrow = document.getElementById('sw-eyebrow');
    const heading = document.getElementById('sw-heading');
    const sub = document.getElementById('sw-sub');
    const count = document.getElementById('sw-count');
    const bar = document.getElementById('sw-progress-bar');
    if (eyebrow) eyebrow.textContent = 'Etapa ' + step + ' de ' + SW_TOTAL_STEPS;
    if (heading && meta) heading.textContent = meta.title;
    if (sub && meta) sub.textContent = meta.sub;
    if (count) count.innerHTML = step + '<span>/' + SW_TOTAL_STEPS + '</span>';
    if (bar) bar.style.width = Math.round((step / SW_TOTAL_STEPS) * 100) + '%';

    const box = document.querySelector('.sheet-wizard-box');
    if (box) box.scrollTop = 0;

    if (step === 1) renderAttributeStep();
    if (step === 2) renderOccupationsList();
    if (step === 3) renderSkillsStep();
    if (step === 4) renderWeaponsStep();
    if (step === 5) renderAntecedentesStep();

    if (window.tutMarkDone) window.tutMarkDone('wizard-open');
    if (step === SW_TOTAL_STEPS && window.tutMarkDone) window.tutMarkDone('wizard-finish');
  }

export function rollAllAttributes() {
    swState.rolledPool = [];
    Object.keys(ATTR_ROLL_TYPE).forEach(key => {
      const isHighRoll = ATTR_ROLL_TYPE[key] === '2d6+6';
      const value = isHighRoll ? roll2d6p6x5() : roll3d6x5();
      swState.rolledPool.push({ id: key + '_' + Date.now() + '_' + Math.random(), value, formula: ATTR_ROLL_TYPE[key], used: false });
    });
    renderAttributeStep();
  }

export function clearRolledPool() {
    swState.rolledPool = [];
    renderAttributeStep();
  }

export function renderAttributeStep() {
    const pool = document.getElementById('sw-rolled-pool');
    pool.innerHTML = swState.rolledPool.map(chip => `
      <div class="sw-rolled-chip ${chip.used ? 'used' : ''} ${chip.id === swSelectedChipId ? 'selected' : ''}" draggable="${!chip.used}" data-chip-id="${chip.id}"
        ondragstart="onChipDragStart(event, '${chip.id}')" onclick="onChipClick('${chip.id}')">
        ${chip.value} <span style="opacity:0.7; font-size:0.7rem;">(${chip.formula})</span>
      </div>
    `).join('') || '<span style="font-family:\'EB Garamond\'; font-style:italic; color:var(--ink-light); font-size:0.85rem;">Nenhuma rolagem pendente. Clique em "Rolar Atributos" ou digite valores manualmente abaixo.</span>';

    if (swState.rolledPool.length) {
      const hint = document.createElement('div');
      hint.className = 'sw-rolled-hint';
      hint.textContent = swSelectedChipId ? 'Agora toque no atributo onde quer colocar esse valor.' : 'Toque num valor para selecioná-lo, depois toque no atributo desejado (ou arraste no computador).';
      pool.appendChild(hint);
    }

    const grid = document.getElementById('sw-attr-grid');
    grid.innerHTML = Object.keys(ATTR_LABELS).map(key => `
      <div class="sw-attr-card" id="sw-attr-card-${key}" ondragover="event.preventDefault(); this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="onAttrDrop(event, '${key}')" onclick="onAttrCardClick('${key}')">
        <div class="sw-attr-label">${ATTR_LABELS[key]}</div>
        <div class="sw-attr-value"><input type="number" min="0" max="99" value="${swState.attrs[key] ?? ''}" oninput="setAttrManual('${key}', this.value)" onclick="event.stopPropagation()" /></div>
        <div class="sw-attr-formula">${ATTR_ROLL_TYPE[key]}×5</div>
      </div>
    `).join('');

    renderDerivedPreview();
  }

export function onChipDragStart(ev, chipId) { ev.dataTransfer.setData('text/plain', chipId); }

export function onChipClick(chipId) {
    const chip = swState.rolledPool.find(c => c.id === chipId);
    if (!chip || chip.used) return;
    swSelectedChipId = (swSelectedChipId === chipId) ? null : chipId;
    renderAttributeStep();
  }

export function onAttrCardClick(attrKey) {
    if (!swSelectedChipId) return;
    const chip = swState.rolledPool.find(c => c.id === swSelectedChipId);
    if (!chip || chip.used) { swSelectedChipId = null; return; }
    chip.used = true;
    swState.attrs[attrKey] = chip.value;
    swSelectedChipId = null;
    renderAttributeStep();
  }

export function onAttrDrop(ev, attrKey) {
    ev.preventDefault();
    document.getElementById('sw-attr-card-' + attrKey).classList.remove('drag-over');
    const chipId = ev.dataTransfer.getData('text/plain');
    const chip = swState.rolledPool.find(c => c.id === chipId);
    if (!chip || chip.used) return;
    chip.used = true;
    swState.attrs[attrKey] = chip.value;
    renderAttributeStep();
  }

export function setAttrManual(key, val) {
    swState.attrs[key] = val === '' ? null : parseInt(val, 10);
    renderDerivedPreview();
  }

export function computeDerived() {
    const a = swState.attrs;
    const con = a.constituicao || 0, tam = a.tamanho || 0, pod = a.poder || 0;
    const for_ = a.forca || 0, edu = a.educacao || 0, des = a.destreza || 0;

    const pv = Math.round((con + tam) / 10) || 0;
    const pm = Math.round(pod / 5) || 0;
    const sanidade = pod || 0;
    const sorte = pod || 0;

    const forTam = for_ + tam;
    let bonusDano = '0', corpo = 0;
    if (forTam <= 64) { bonusDano = '-2'; corpo = -2; }
    else if (forTam <= 84) { bonusDano = '-1'; corpo = -1; }
    else if (forTam <= 124) { bonusDano = '0'; corpo = 0; }
    else if (forTam <= 164) { bonusDano = '+1d4'; corpo = 1; }
    else if (forTam <= 204) { bonusDano = '+1d6'; corpo = 2; }
    else { bonusDano = '+2d6'; corpo = 3; }

    let movimento = 8;
    if (des < tam && for_ < tam) movimento = 7;
    else if (des > tam && for_ > tam) movimento = 9;

    return { pv, pm, sanidade, sorte, bonusDano, corpo, movimento, occPoints: edu * 4, persPoints: (a.inteligencia || 0) * 2 };
  }

export function renderDerivedPreview() {
    const d = computeDerived();
    document.getElementById('sw-derived-preview').innerHTML = `
      <div class="sw-derived-item"><div class="num">${d.pv}</div><div class="lab">PV</div></div>
      <div class="sw-derived-item"><div class="num">${d.pm}</div><div class="lab">PM</div></div>
      <div class="sw-derived-item"><div class="num">${d.sanidade}</div><div class="lab">Sanidade</div></div>
      <div class="sw-derived-item"><div class="num">${d.sorte}</div><div class="lab">Sorte</div></div>
      <div class="sw-derived-item"><div class="num">${d.movimento}</div><div class="lab">Movimento</div></div>
      <div class="sw-derived-item"><div class="num">${d.bonusDano}</div><div class="lab">B. Dano</div></div>
    `;
  }

export function renderOccupationsList() {
    const search = (document.getElementById('occ-search').value || '').toLowerCase();
    const list = document.getElementById('occupations-list');
    const filtered = sheetStore.swOccupationsReference.filter(o => o.name.toLowerCase().includes(search));

    list.innerHTML = filtered.map(o => {
      const formula = o.skill_points_formula.replace(/EDU/g, '<b>EDU</b>').replace(/FOR/g, '<b>FOR</b>').replace(/DES/g, '<b>DES</b>').replace(/APA/g, '<b>APA</b>');
      return `
      <div class="occupation-card ${swState.occupationId === o.id ? 'selected' : ''}" onclick="selectOccupation('${o.id}')">
        <div class="occupation-card-name">${o.name}</div>
        <div class="occupation-card-desc">${o.description || ''}</div>
        <div class="occupation-card-meta">Pontos: ${formula} • Crédito: ${o.credit_rating_min}-${o.credit_rating_max}</div>
      </div>
    `;
    }).join('') || '<div class="loading">Nenhuma ocupação encontrada.</div>';
  }

export function selectOccupation(occId) {
    swState.occupationId = occId;
    renderOccupationsList();
    goToStep(3);
  }

export function evalFormula(formula) {
    const a = swState.attrs;
    const expr = formula
      .replace(/EDU/g, (a.educacao || 0))
      .replace(/FOR/g, (a.forca || 0))
      .replace(/DES/g, (a.destreza || 0))
      .replace(/APA/g, (a.aparencia || 0))
      .replace(/CON/g, (a.constituicao || 0))
      .replace(/POD/g, (a.poder || 0))
      .replace(/INT/g, (a.inteligencia || 0))
      .replace(/TAM/g, (a.tamanho || 0));
    try { return Math.round(Function('"use strict"; return (' + expr + ')')()); } catch (e) { return 0; }
  }

export function renderSkillsStep() {
    const occ = sheetStore.swOccupationsReference.find(o => o.id === swState.occupationId);
    const occTotal = occ ? evalFormula(occ.skill_points_formula) : 0;
    const persTotal = (swState.attrs.inteligencia || 0) * 2;

    document.getElementById('sw-occ-total').textContent = occTotal;
    document.getElementById('sw-pers-total').textContent = persTotal;

    renderOccupationSkills(occ);
    renderAllSkills();
    renderCustomSkills();
    updatePointsRemaining();
  }

export function getSkillBase(skillId) {
    const ref = sheetStore.swSkillsReference.find(s => s.id === skillId);
    if (!ref) return 0;
    if (skillId === 'idioma_proprio') return swState.attrs.educacao || 0;
    if (skillId === 'esquiva') return Math.round((swState.attrs.destreza || 0) / 2);
    return ref.base_value;
  }

export function skillThirdsHtml(total) {
    const half = Math.floor(total / 2);
    const fifth = Math.floor(total / 5);
    return `<span class="sw-skill-fractions">½ ${half} • ⅕ ${fifth}</span>`;
  }

export function renderOccupationSkills(occ) {
    const container = document.getElementById('sw-occupation-skills');
    if (!occ) { container.innerHTML = '<div class="loading" style="font-size:0.85rem; padding:0.5rem 0;">Escolha uma ocupação na etapa anterior.</div>'; return; }

    container.innerHTML = occ.suggested_skills.map(skillId => {
      const ref = sheetStore.swSkillsReference.find(s => s.id === skillId);
      if (!ref) return '';
      const base = getSkillBase(skillId);
      const allocated = swState.skillAllocation[skillId]?.occ || 0;
      const total = base + allocated + (swState.skillAllocation[skillId]?.pers || 0);
      return `
        <div class="sw-skill-row">
          <span class="sw-skill-name">${ref.name} <span class="sw-skill-base">(base ${base})</span></span>
          <div class="sw-skill-controls">
            <button class="sw-skill-btn" onclick="adjustSkillPoints('${skillId}', 'occ', -5)">−</button>
            <span class="sw-skill-total">${total}</span>
            <button class="sw-skill-btn" onclick="adjustSkillPoints('${skillId}', 'occ', 5)">+</button>
            ${skillThirdsHtml(total)}
          </div>
        </div>
      `;
    }).join('');
  }

export function renderAllSkills() {
    const search = (document.getElementById('skill-search').value || '').toLowerCase();
    const container = document.getElementById('sw-all-skills');
    const filtered = sheetStore.swSkillsReference.filter(s => s.name.toLowerCase().includes(search));

    container.innerHTML = filtered.map(ref => {
      const base = getSkillBase(ref.id);
      const allocated = swState.skillAllocation[ref.id]?.pers || 0;
      const total = base + allocated + (swState.skillAllocation[ref.id]?.occ || 0);
      return `
        <div class="sw-skill-row">
          <span class="sw-skill-name">${ref.name} <span class="sw-skill-base">(base ${base})</span></span>
          <div class="sw-skill-controls">
            <button class="sw-skill-btn" onclick="adjustSkillPoints('${ref.id}', 'pers', -5)">−</button>
            <span class="sw-skill-total">${total}</span>
            <button class="sw-skill-btn" onclick="adjustSkillPoints('${ref.id}', 'pers', 5)">+</button>
            ${skillThirdsHtml(total)}
          </div>
        </div>
      `;
    }).join('');
  }

export function adjustSkillPoints(skillId, pool, delta) {
    if (!swState.skillAllocation[skillId]) swState.skillAllocation[skillId] = { occ: 0, pers: 0 };
    const current = swState.skillAllocation[skillId][pool] || 0;
    const newVal = Math.max(0, current + delta);

    const occTotal = parseInt(document.getElementById('sw-occ-total').textContent, 10) || 0;
    const persTotal = parseInt(document.getElementById('sw-pers-total').textContent, 10) || 0;
    const occUsed = Object.values(swState.skillAllocation).reduce((s, v) => s + (v.occ || 0), 0);
    const persUsed = Object.values(swState.skillAllocation).reduce((s, v) => s + (v.pers || 0), 0);

    if (pool === 'occ' && delta > 0 && occUsed + delta > occTotal) { showToast('Sem pontos de ocupação suficientes.'); return; }
    if (pool === 'pers' && delta > 0 && persUsed + delta > persTotal) { showToast('Sem pontos pessoais suficientes.'); return; }

    swState.skillAllocation[skillId][pool] = newVal;
    renderSkillsStep();
  }

export function updatePointsRemaining() {
    const occTotal = parseInt(document.getElementById('sw-occ-total').textContent, 10) || 0;
    const persTotal = parseInt(document.getElementById('sw-pers-total').textContent, 10) || 0;
    const occUsed = Object.values(swState.skillAllocation).reduce((s, v) => s + (v.occ || 0), 0);
    const persUsedSkills = Object.values(swState.skillAllocation).reduce((s, v) => s + (v.pers || 0), 0);
    const persUsedCustom = swState.customSkills.reduce((s, c) => s + (parseInt(c.value, 10) || 0), 0);
    const persUsed = persUsedSkills + persUsedCustom;

    document.getElementById('sw-occ-remaining').textContent = occTotal - occUsed;
    document.getElementById('sw-pers-remaining').textContent = persTotal - persUsed;
    document.getElementById('sw-occ-points-pill').classList.toggle('depleted', occTotal - occUsed === 0);
    document.getElementById('sw-pers-points-pill').classList.toggle('depleted', persTotal - persUsed === 0);
  }

export function addCustomSkillRow() {
    swState.customSkills.push({ id: 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2), name: '', value: 0 });
    renderCustomSkills();
  }

export function removeCustomSkillRow(id) {
    swState.customSkills = swState.customSkills.filter(c => c.id !== id);
    renderCustomSkills();
    updatePointsRemaining();
  }

export function updateCustomSkillName(id, name) {
    const row = swState.customSkills.find(c => c.id === id);
    if (row) row.name = name;
  }

export function updateCustomSkillValue(id, value) {
    const row = swState.customSkills.find(c => c.id === id);
    if (!row) return;

    const persTotal = parseInt(document.getElementById('sw-pers-total').textContent, 10) || 0;
    const persUsedSkills = Object.values(swState.skillAllocation).reduce((s, v) => s + (v.pers || 0), 0);
    const persUsedOtherCustom = swState.customSkills.filter(c => c.id !== id).reduce((s, c) => s + (parseInt(c.value, 10) || 0), 0);
    const newVal = Math.max(0, parseInt(value, 10) || 0);

    if (persUsedSkills + persUsedOtherCustom + newVal > persTotal) {
      showToast('Sem pontos pessoais suficientes.');
      renderCustomSkills();
      return;
    }

    row.value = newVal;
    updatePointsRemaining();
  }

export function renderCustomSkills() {
    const container = document.getElementById('sw-custom-skills');
    container.innerHTML = swState.customSkills.map(c => `
      <div class="sw-custom-skill-row">
        <input type="text" placeholder="Ex: Língua (Francês), Ciência (Química)..." value="${c.name || ''}" oninput="updateCustomSkillName('${c.id}', this.value)" />
        <input type="number" min="0" max="99" value="${c.value || 0}" oninput="updateCustomSkillValue('${c.id}', this.value)" />
        <button class="sw-custom-skill-remove" onclick="removeCustomSkillRow('${c.id}')">✕</button>
      </div>
    `).join('') || '<span style="font-family:\'Cormorant Garamond\'; font-style:italic; color:var(--ink-light); font-size:0.85rem;">Nenhuma perícia personalizada ainda.</span>';
  }

export function addWeaponRow() {
    swState.weapons.push({ id: 'wpn_' + Date.now() + '_' + Math.random().toString(36).slice(2), name: '', regular: 0, dificil: 0, extremo: 0, dano: '', alcance: '', ataques: 1, municao: '', defeito: '' });
    renderWeaponsStep();
  }

export function removeWeaponRow(id) {
    swState.weapons = swState.weapons.filter(w => w.id !== id);
    renderWeaponsStep();
  }

export function updateWeaponField(id, field, value) {
    const w = swState.weapons.find(w => w.id === id);
    if (!w) return;
    if (field === 'regular') {
      w.regular = Math.max(0, parseInt(value, 10) || 0);
      w.dificil = Math.floor(w.regular / 2);
      w.extremo = Math.floor(w.regular / 5);
      renderWeaponsStep();
      return;
    }
    if (['ataques'].includes(field)) { w[field] = parseInt(value, 10) || 0; }
    else { w[field] = value; }
  }

export function renderWeaponsStep() {
    const container = document.getElementById('sw-weapons-list');
    container.innerHTML = swState.weapons.map(w => `
      <div class="sw-weapon-row">
        <div><label>Arma</label><input type="text" value="${w.name || ''}" oninput="updateWeaponField('${w.id}', 'name', this.value)" placeholder="Ex: Revólver .38" /></div>
        <div><label>Regular %</label><input type="number" value="${w.regular || 0}" oninput="updateWeaponField('${w.id}', 'regular', this.value)" /></div>
        <div><label>Difícil %</label><input type="text" value="${w.dificil || 0}" readonly style="opacity:0.7;" /></div>
        <div><label>Extremo %</label><input type="text" value="${w.extremo || 0}" readonly style="opacity:0.7;" /></div>
        <div><label>Dano</label><input type="text" value="${w.dano || ''}" oninput="updateWeaponField('${w.id}', 'dano', this.value)" placeholder="1d10" /></div>
        <div><label>Alcance</label><input type="text" value="${w.alcance || ''}" oninput="updateWeaponField('${w.id}', 'alcance', this.value)" /></div>
        <div><label>Ataques</label><input type="number" value="${w.ataques || 1}" oninput="updateWeaponField('${w.id}', 'ataques', this.value)" /></div>
        <div><label>Munição</label><input type="text" value="${w.municao || ''}" oninput="updateWeaponField('${w.id}', 'municao', this.value)" /></div>
        <div><label>Defeito</label><input type="text" value="${w.defeito || ''}" oninput="updateWeaponField('${w.id}', 'defeito', this.value)" /></div>
        <div class="sw-weapon-remove-wrap"><button class="sw-custom-skill-remove" onclick="removeWeaponRow('${w.id}')">✕</button></div>
      </div>
    `).join('') || '<span style="font-family:\'Cormorant Garamond\'; font-style:italic; color:var(--ink-light); font-size:0.85rem;">Nenhuma arma adicionada. "Desarmado" sempre conta como opção básica de combate.</span>';
  }

export function renderAntecedentesStep() {
    const a = swState.antecedentes || {};
    document.getElementById('ante-descricao').value = a.descricao_pessoal || '';
    document.getElementById('ante-caracteristicas').value = a.caracteristicas || '';
    document.getElementById('ante-ideologias').value = a.ideologias || '';
    document.getElementById('ante-ferimentos').value = a.ferimentos_cicatrizes || '';
    document.getElementById('ante-pessoas').value = a.pessoas_significativas || '';
    document.getElementById('ante-fobias').value = a.fobias_manias || '';
    document.getElementById('ante-locais').value = a.locais_importantes || '';
    document.getElementById('ante-tomos').value = a.tomos_artefatos || '';
    document.getElementById('ante-pertences').value = a.pertences_queridos || '';
    document.getElementById('ante-encontros').value = a.encontros_estranhos || '';

    document.getElementById('sw-equipment').value = swState.equipment || '';
    document.getElementById('sw-backstory').value = swState.backstory || '';

    const d = swState.dinheiro || {};
    document.getElementById('ante-nivel-gastos').value = d.nivel_gastos || '';
    document.getElementById('ante-dinheiro').value = d.dinheiro || '';
    document.getElementById('ante-patrimonio').value = d.patrimonio || '';
    document.getElementById('ante-credito').value = swState.nivelCredito || 0;
  }

export async function finalizeSheet() {
    swState.equipment = document.getElementById('sw-equipment').value;
    swState.backstory = document.getElementById('sw-backstory').value;

    swState.antecedentes = {
      descricao_pessoal: document.getElementById('ante-descricao').value,
      caracteristicas: document.getElementById('ante-caracteristicas').value,
      ideologias: document.getElementById('ante-ideologias').value,
      ferimentos_cicatrizes: document.getElementById('ante-ferimentos').value,
      pessoas_significativas: document.getElementById('ante-pessoas').value,
      fobias_manias: document.getElementById('ante-fobias').value,
      locais_importantes: document.getElementById('ante-locais').value,
      tomos_artefatos: document.getElementById('ante-tomos').value,
      pertences_queridos: document.getElementById('ante-pertences').value,
      encontros_estranhos: document.getElementById('ante-encontros').value
    };

    swState.dinheiro = {
      nivel_gastos: document.getElementById('ante-nivel-gastos').value,
      dinheiro: document.getElementById('ante-dinheiro').value,
      patrimonio: document.getElementById('ante-patrimonio').value
    };
    swState.nivelCredito = parseInt(document.getElementById('ante-credito').value, 10) || 0;

    const d = computeDerived();
    const finalSkills = {};
    Object.keys(swState.skillAllocation).forEach(skillId => {
      const base = getSkillBase(skillId);
      const alloc = swState.skillAllocation[skillId];
      finalSkills[skillId] = base + (alloc.occ || 0) + (alloc.pers || 0);
    });

    const payload = {
      character_id: swEditingSheetCharId,
      forca: swState.attrs.forca || 0,
      constituicao: swState.attrs.constituicao || 0,
      tamanho: swState.attrs.tamanho || 0,
      destreza: swState.attrs.destreza || 0,
      aparencia: swState.attrs.aparencia || 0,
      inteligencia: swState.attrs.inteligencia || 0,
      poder: swState.attrs.poder || 0,
      educacao: swState.attrs.educacao || 0,
      occupation_id: swState.occupationId,
      pv_max: d.pv,
      pm_max: d.pm,
      sanidade_max: d.sanidade,
      sorte: d.sorte,
      movimento: d.movimento,
      bonus_dano: d.bonusDano,
      corpo: d.corpo,
      skills: finalSkills,
      raw_skill_allocation: swState.skillAllocation,
      custom_skills: swState.customSkills,
      weapons: swState.weapons,
      antecedentes: swState.antecedentes,
      dinheiro: swState.dinheiro,
      nivel_credito: swState.nivelCredito,
      equipment: swState.equipment,
      backstory: swState.backstory,
      updated_at: new Date().toISOString()
    };

    let error;
    if (swExistingSheetId) {
      // Em edição: não sobrescreve PV/PM/Sanidade atuais (preserva progresso da sessão)
      const res = await sb.from('coc_sheets').update(payload).eq('id', swExistingSheetId);
      error = res.error;
    } else {
      // Ficha nova: atual = máximo
      payload.pv_atual = d.pv;
      payload.pm_atual = d.pm;
      payload.sanidade_atual = d.sanidade;
      const res = await sb.from('coc_sheets').insert(payload);
      error = res.error;
    }

    if (error) { showToast('Erro ao salvar ficha: ' + error.message); return; }

    showToast('✦ Ficha digital salva com sucesso!');
    closeSheetWizard();
    await loadMyCharacters();
    if (sheetStore.swViewerReturnCharId) {
      openSheetViewer(sheetStore.swViewerReturnCharId);
    }
  }
