// ============ TUTORIAL INTERATIVO ============
(function () {
  const STORAGE_KEY = 'coc_tutorial_v1';
  const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"seen":false,"done":{}}');

  const STEPS = [
    { sel: '[data-tour="nav-character"]', title: 'A rota principal', body: 'Aqui vivem seus investigadores. Este é o caminho que abre e fecha as sessões.', eyebrow: 'Ponto de partida', place: 'bottom' },
    { sel: '[data-tour="nav-notes"]', title: 'Arquivos investigativos', body: 'Anotações, pistas e mistérios em andamento ficam guardados aqui.', eyebrow: 'Notas de campo', place: 'bottom' },
    { sel: '[data-tour="nav-players"]', title: 'A mesa reunida', body: 'Veja quem mais está a bordo da investigação.', eyebrow: 'Companheiros', place: 'bottom' },
    { sel: '.nav-help', title: 'Sempre à mão', body: 'Se se perder no Arquivo, reabra o guia a qualquer momento por aqui.', eyebrow: 'Reabra quando quiser', place: 'bottom' },
  ];

  const CHECKLIST = [
    { id: 'welcome', title: 'Abrir o guia inicial', desc: 'Percorra a passagem guiada pela navegação.' },
    { id: 'wizard-open', title: 'Iniciar sua primeira ficha', desc: 'Toque em Investigadores e comece o wizard.' },
    { id: 'wizard-finish', title: 'Concluir os 5 passos da ficha', desc: 'Atributos, ocupação, perícias, combate e antecedentes.' },
    { id: 'explore-notes', title: 'Visitar os Arquivos Investigativos', desc: 'Descubra onde as pistas serão registradas.' },
  ];

  let current = 0;
  let overlay, highlight, tooltip, checklist;

  // ---- Guardas contra o loop de MutationObserver ----
  // Antes, o MutationObserver reagia a QUALQUER mutação do <body>,
  // inclusive as que o próprio renderChecklist()/ensureDom() causavam
  // (innerHTML, appendChild). Isso criava um loop infinito: mutação ->
  // callback -> renderiza -> nova mutação -> callback -> ... travando a
  // aba. Agora o observer só existe até a navbar aparecer pela primeira
  // vez (login concluído) e se desliga depois disso; e um "trava" evita
  // reentrância caso dois callbacks disparem antes do primeiro terminar.
  let appDetected = false;
  let renderingGuard = false;
  let bootObserver = null;

  function ensureDom() {
    if (overlay) return;
    overlay = document.createElement('div'); overlay.className = 'tut-overlay';
    highlight = document.createElement('div'); highlight.className = 'tut-highlight'; highlight.style.display = 'none';
    tooltip = document.createElement('div'); tooltip.className = 'tut-tooltip'; tooltip.style.display = 'none';
    document.body.appendChild(overlay);
    document.body.appendChild(highlight);
    document.body.appendChild(tooltip);
    overlay.addEventListener('click', endTour);

    checklist = document.createElement('aside');
    checklist.className = 'tut-checklist';
    checklist.innerHTML =
      '<div class="tut-checklist-head" onclick="__tutToggleChecklist()">' +
        '<div><strong>Primeiros passos</strong><span class="tut-count" id="tut-count"></span></div>' +
        '<button class="tut-toggle" aria-label="Recolher">–</button>' +
      '</div>' +
      '<div class="tut-progress-mini"><span id="tut-progress"></span></div>' +
      '<div class="tut-checklist-body" id="tut-body"></div>';
    document.body.appendChild(checklist);
  }

  function positionTooltip(rect, place) {
    const margin = 14;
    const w = tooltip.offsetWidth, h = tooltip.offsetHeight;
    let top, left;
    tooltip.classList.remove('arrow-bottom','arrow-right');
    if (place === 'bottom' || (rect.bottom + h + margin) < window.innerHeight) {
      top = rect.bottom + margin;
      left = Math.min(Math.max(rect.left, 12), window.innerWidth - w - 12);
    } else {
      top = rect.top - h - margin;
      left = Math.min(Math.max(rect.left, 12), window.innerWidth - w - 12);
      tooltip.classList.add('arrow-bottom');
    }
    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';
  }

  function renderStep() {
    ensureDom();
    const step = STEPS[current];
    const el = step && document.querySelector(step.sel);
    if (!el) { next(); return; }
    const rect = el.getBoundingClientRect();
    const pad = 8;
    highlight.style.display = 'block';
    highlight.style.top = (rect.top - pad) + 'px';
    highlight.style.left = (rect.left - pad) + 'px';
    highlight.style.width = (rect.width + pad*2) + 'px';
    highlight.style.height = (rect.height + pad*2) + 'px';
    const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
    overlay.style.setProperty('--tut-x', cx + 'px');
    overlay.style.setProperty('--tut-y', cy + 'px');
    overlay.style.setProperty('--tut-r', (Math.max(rect.width, rect.height)/2 + 16) + 'px');
    overlay.classList.add('on');

    const dots = STEPS.map((_, i) => '<span class="tut-dot ' + (i === current ? 'on' : '') + '"></span>').join('');
    tooltip.innerHTML =
      '<p class="tut-eyebrow">' + (step.eyebrow || 'Guia inicial') + '</p>' +
      '<h4>' + step.title + '</h4>' +
      '<p>' + step.body + '</p>' +
      '<div class="tut-controls">' +
        '<div class="tut-dots">' + dots + '</div>' +
        '<div class="tut-buttons">' +
          (current > 0 ? '<button class="tut-btn" onclick="__tutPrev()">Voltar</button>' : '') +
          '<button class="tut-btn" onclick="__tutSkip()">Pular</button>' +
          '<button class="tut-btn primary" onclick="__tutNext()">' + (current === STEPS.length - 1 ? 'Concluir' : 'Avançar') + '</button>' +
        '</div>' +
      '</div>';
    tooltip.style.display = 'block';
    requestAnimationFrame(() => positionTooltip(rect, step.place));
  }

  function next() { current++; if (current >= STEPS.length) { endTour(); markDone('welcome'); } else renderStep(); }
  function prev() { current = Math.max(0, current - 1); renderStep(); }
  function endTour() {
    if (!overlay) return;
    overlay.classList.remove('on');
    highlight.style.display = 'none';
    tooltip.style.display = 'none';
  }
  function skip() { endTour(); }

  function renderChecklist() {
    if (renderingGuard) return; // reentrância: já tem um render em andamento
    renderingGuard = true;
    try {
      ensureDom();
      const done = state.done || {};
      const total = CHECKLIST.length;
      const doneCount = CHECKLIST.filter(i => done[i.id]).length;
      document.getElementById('tut-count').textContent = ' · ' + doneCount + '/' + total;
      document.getElementById('tut-progress').style.width = Math.round((doneCount/total)*100) + '%';
      document.getElementById('tut-body').innerHTML = CHECKLIST.map(item =>
        '<div class="tut-checklist-item ' + (done[item.id] ? 'done' : '') + '" onclick="__tutToggleItem(\'' + item.id + '\')">' +
          '<span class="tut-check"></span>' +
          '<span><span class="tut-title">' + item.title + '</span><span class="tut-desc">' + item.desc + '</span></span>' +
        '</div>'
      ).join('');
      checklist.classList.add('show');
    } finally {
      renderingGuard = false;
    }
  }

  function markDone(id) {
    state.done = state.done || {};
    if (state.done[id]) return;
    state.done[id] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderChecklist();
  }
  function toggleItem(id) {
    state.done = state.done || {};
    state.done[id] = !state.done[id];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderChecklist();
  }

  function startTour() {
    current = 0;
    ensureDom();
    renderChecklist();
    renderStep();
  }

  window.__tutNext = next;
  window.__tutPrev = prev;
  window.__tutSkip = skip;
  window.__tutToggleItem = toggleItem;
  window.__tutToggleChecklist = () => checklist.classList.toggle('collapsed');
  window.startTutorial = () => { state.seen = true; localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); startTour(); };
  window.tutMarkDone = markDone;

  // Autostart on first authenticated view
  const originalShowPage = window.showPage;
  if (typeof originalShowPage === 'function') {
    window.showPage = function(page, btn) {
      const r = originalShowPage.apply(this, arguments);
      if (page === 'notes') markDone('explore-notes');
      return r;
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Mostra o checklist assim que a navbar do app autenticado aparecer.
    // IMPORTANTE: isso só deve rodar UMA VEZ. Antes, o MutationObserver
    // ficava escutando o <body> pra sempre e reagia às próprias mutações
    // causadas pelo renderChecklist() (innerHTML), entrando em loop
    // infinito e travando a aba. Agora, assim que a navbar é encontrada
    // e o app é considerado "visível" de verdade (via #app com display
    // diferente de 'none'), o observer se desliga.
    const isAppVisible = () => {
      const appEl = document.getElementById('app');
      return appEl && getComputedStyle(appEl).display !== 'none';
    };

    const tryShow = () => {
      if (appDetected) return;
      const nav = document.querySelector('[data-tour="nav-character"]');
      if (nav && isAppVisible()) {
        appDetected = true;
        if (bootObserver) { bootObserver.disconnect(); bootObserver = null; }
        renderChecklist();
        if (!state.seen) { state.seen = true; localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); setTimeout(startTour, 800); }
      }
    };

    tryShow();
    if (!appDetected) {
      bootObserver = new MutationObserver(tryShow);
      bootObserver.observe(document.body, { childList: true, subtree: true });
    }
  });

  window.addEventListener('resize', () => { if (overlay && overlay.classList.contains('on')) renderStep(); });
})();
