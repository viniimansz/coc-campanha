// Estado compartilhado só entre sheetWizard.js e sheetViewer.js
// (referências de perícias/ocupações e qual personagem está sendo visto).
export const sheetStore = {
  swSkillsReference: [],
  swOccupationsReference: [],

  svCurrentCharId: null,
  svCurrentSheet: null,
  swViewerReturnCharId: null,
};
