export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "", // Mantido por compatibilidade, mas não usado para Firestore
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  // Variáveis do Firebase
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? "",
  // As credenciais de serviço (FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
  // são carregadas automaticamente pelo SDK do Firebase Admin se o GOOGLE_APPLICATION_CREDENTIALS
  // estiver configurado, ou se forem definidas no ambiente.
  // Vamos depender do GOOGLE_APPLICATION_CREDENTIALS ou do usuário configurar o ambiente.
};
