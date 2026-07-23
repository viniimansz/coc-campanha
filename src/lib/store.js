// Estado mutável compartilhado entre módulos.
// Como é um objeto (não `let` soltos), qualquer módulo pode importar
// `store` e ler/escrever store.campo sem precisar de getters/setters —
// o binding do objeto em si nunca muda, só o conteúdo dele.
export const store = {
  currentUser: null,
  isGuardian: false,

  myCharacters: [],
  allCampaigns: [],
  editingCharId: null,

  currentCampaignId: null,

  profileData: null,
  profileAvatarFile: null,
  profileCoverFile: null,
};
