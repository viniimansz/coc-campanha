import './style.css';

// A UI ainda usa onclick="funcao(...)" direto no HTML (não migramos para
// addEventListener por enquanto — ver README). Como módulos ES não jogam
// nada no escopo global sozinhos, cada módulo é importado como namespace
// e suas exports são coladas em `window`. A ORDEM importa em um ponto só:
// nav.js precisa estar em window ANTES de tutorial.js, porque o tutorial
// envolve (wrap) window.showPage.

import * as App from './app.js';
import * as Auth from './auth/auth.js';
import * as Nav from './nav/nav.js';
import * as Campaigns from './campaigns/campaigns.js';
import * as Characters from './characters/characters.js';
import * as SheetWizard from './sheet/sheetWizard.js';
import * as SheetViewer from './sheet/sheetViewer.js';
import * as Players from './players/players.js';
import * as Profile from './profile/profile.js';
import * as Notes from './notes/notes.js';
import * as Guardian from './guardian/guardian.js';

const modules = [
  App, Auth, Nav, Campaigns, Characters,
  SheetWizard, SheetViewer, Players, Profile, Notes, Guardian,
];

for (const mod of modules) {
  Object.assign(window, mod);
}

// Efeito colateral: registra window.startTutorial / window.tutMarkDone
// e envolve window.showPage. Precisa vir depois do Object.assign acima.
import './tutorial/tutorial.js';

// Boot da aplicação (equivalente ao init() solto no fim do <script> original)
App.init();
