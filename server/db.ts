import * as admin from "firebase-admin";
import { InsertUser } from "../shared/types";
import { ENV } from "./_core/env";
import {
  Cliente,
  Configuracao,
  Evento,
  EventoPratoSnapshot,
  EventoVinho,
  HistoricoEmail,
  InsertCliente,
  InsertConfiguracao,
  InsertEvento,
  InsertEventoPratoSnapshot,
  InsertEventoVinho,
  InsertHistoricoEmail,
  InsertMenu,
  InsertPrato,
  Menu,
  Prato,
  User,
} from "../shared/types"; // Tipos movidos para shared/types.ts
import { isSameDay, parseISO, addHours, isWithinInterval } from "date-fns";

// =================================================================
// 1. CONFIGURAÇÃO DO FIREBASE ADMIN
// =================================================================

let _db: admin.firestore.Firestore | null = null;

/**
 * Inicializa e retorna a instância do Firestore.
 * Assume que as credenciais são fornecidas via variáveis de ambiente.
 */
export function getDb(): admin.firestore.Firestore {
  if (!_db) {
    if (admin.apps.length === 0) {
      // Inicializa o app do Firebase se ainda não foi inicializado
      // Usa as credenciais do Service Account via variável de ambiente GOOGLE_APPLICATION_CREDENTIALS
      // OU as variáveis de ambiente FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
      try {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: ENV.firebaseProjectId, // Usar o projectId do ENV
        });
      } catch (error) {
        console.error("[Firebase] Falha ao inicializar o app:", error);
        throw new Error("Falha ao inicializar o Firebase Admin SDK.");
      }
    }
    _db = admin.firestore();
  }
  return _db;
}

// =================================================================
// 2. DEFINIÇÃO DAS COLEÇÕES
// =================================================================

const COLLECTIONS = {
  USERS: "users",
  CLIENTES: "clientes",
  MENUS: "menus",
  PRATOS: "pratos", // Subcoleção de MENUS
  EVENTOS: "eventos",
  EVENTOS_PRATOS_SNAPSHOT: "eventosPratosSnapshot", // Subcoleção de EVENTOS
  EVENTOS_VINHOS: "eventosVinhos", // Subcoleção de EVENTOS
  HISTORICO_EMAILS: "historicoEmails", // Subcoleção de EVENTOS
  CONFIGURACOES: "configuracoes",
} as const;

// =================================================================
// 3. FUNÇÕES DE ACESSO A DADOS (CRUD)
// =================================================================

// ============= USERS =============

/**
 * Cria ou atualiza um usuário.
 * No Firestore, vamos usar o openId como ID do documento.
 */
export async function upsertUser(user: InsertUser): Promise<void> {
  const db = getDb();
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const userRef = db.collection(COLLECTIONS.USERS).doc(user.openId);

  const updateSet: Partial<User> = {
    ...user,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };

  // Se o usuário não existir, cria com createdAt
  const existingUser = await userRef.get();
  if (!existingUser.exists) {
    updateSet.createdAt = admin.firestore.FieldValue.serverTimestamp() as any;
    updateSet.role = user.openId === ENV.ownerOpenId ? "admin" : "user";
  }

  // Garante que o lastSignedIn seja sempre atualizado
  updateSet.lastSignedIn = admin.firestore.FieldValue.serverTimestamp() as any;

  try {
    await userRef.set(updateSet, { merge: true });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

/**
 * Obtém um usuário pelo openId.
 */
export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = getDb();
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(openId).get();

  if (!userDoc.exists) {
    return undefined;
  }

  const data = userDoc.data() as User;
  return {
    ...data,
    id: userDoc.id, // O ID do documento é o openId
    createdAt: data.createdAt ? (data.createdAt as any).toDate() : new Date(),
    updatedAt: data.updatedAt ? (data.updatedAt as any).toDate() : new Date(),
    lastSignedIn: data.lastSignedIn ? (data.lastSignedIn as any).toDate() : new Date(),
  };
}

// ============= CLIENTES =============

/**
 * Converte um documento do Firestore para o tipo Cliente.
 */
const toCliente = (doc: admin.firestore.DocumentSnapshot): Cliente => {
  const data = doc.data() as Omit<Cliente, "id" | "createdAt" | "updatedAt"> & {
    createdAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
  };
  return {
    ...data,
    id: doc.id,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  } as Cliente;
};

/**
 * Verifica duplicidade de cliente.
 * Retorna objeto com campos duplicados ou null se não houver duplicidade.
 * No Firestore, a verificação de duplicidade é mais complexa e exige múltiplas consultas.
 */
export async function verificarDuplicidadeCliente(
  nomeCompleto: string,
  telefone: string,
  email: string | null | undefined,
  clienteIdExcluir?: string
): Promise<{ telefone?: boolean; email?: boolean; nomeETelefone?: boolean } | null> {
  const db = getDb();
  const clientesRef = db.collection(COLLECTIONS.CLIENTES);

  const nomeNormalizado = nomeCompleto.trim().toLowerCase();
  const telefoneNormalizado = telefone.trim().toLowerCase();
  const emailNormalizado = email ? email.trim().toLowerCase() : null;

  const resultado: { telefone?: boolean; email?: boolean; nomeETelefone?: boolean } = {};

  // 1. Verifica telefone duplicado
  let queryTelefone = clientesRef.where("telefone", "==", telefoneNormalizado);
  if (clienteIdExcluir) {
    queryTelefone = queryTelefone.where(admin.firestore.FieldPath.documentId(), "!=", clienteIdExcluir);
  }
  const snapshotTelefone = await queryTelefone.get();
  if (!snapshotTelefone.empty) {
    resultado.telefone = true;
  }

  // 2. Verifica e-mail duplicado (se fornecido)
  if (emailNormalizado) {
    let queryEmail = clientesRef.where("email", "==", emailNormalizado);
    if (clienteIdExcluir) {
      queryEmail = queryEmail.where(admin.firestore.FieldPath.documentId(), "!=", clienteIdExcluir);
    }
    const snapshotEmail = await queryEmail.get();
    if (!snapshotEmail.empty) {
      resultado.email = true;
    }
  }

  // 3. Verifica combinação nome + telefone
  // No Firestore, não podemos fazer consultas OR complexas ou LIKE.
  // A melhor abordagem é fazer uma consulta por telefone e depois filtrar pelo nome no código.
  // Já fizemos a consulta por telefone acima (snapshotTelefone).
  snapshotTelefone.forEach((doc) => {
    const cliente = toCliente(doc);
    if (cliente.nomeCompleto.trim().toLowerCase() === nomeNormalizado) {
      resultado.nomeETelefone = true;
    }
  });

  return Object.keys(resultado).length > 0 ? resultado : null;
}

/**
 * Cria um novo cliente.
 */
export async function criarCliente(cliente: InsertCliente): Promise<Cliente> {
  const db = getDb();

  const duplicidade = await verificarDuplicidadeCliente(
    cliente.nomeCompleto,
    cliente.telefone,
    cliente.email
  );

  if (duplicidade) {
    const campos = [];
    if (duplicidade.telefone) campos.push("telefone");
    if (duplicidade.email) campos.push("e-mail");
    if (duplicidade.nomeETelefone) campos.push("nome completo + telefone");
    throw new Error(`Cliente já cadastrado com: ${campos.join(", ")}`);
  }

  const clienteData: Omit<InsertCliente, "id"> = {
    ...cliente,
    nomeCompleto: cliente.nomeCompleto.trim(),
    telefone: cliente.telefone.trim(),
    email: cliente.email ? cliente.email.trim() : null,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };

  const result = await db.collection(COLLECTIONS.CLIENTES).add(clienteData);
  const inserted = await result.get();
  return toCliente(inserted);
}

/**
 * Lista clientes. A busca é limitada devido às restrições do Firestore.
 * Vamos buscar por nome, telefone ou email, mas a busca por substring (LIKE) não é nativa.
 * Usaremos a busca por prefixo (startAt/endAt) para nome e telefone, e busca exata para email.
 */
export async function listarClientes(busca?: string): Promise<Cliente[]> {
  const db = getDb();
  let clientesRef: admin.firestore.Query = db.collection(COLLECTIONS.CLIENTES);

  if (busca) {
    // No Firestore, não podemos fazer OR em campos diferentes.
    // A melhor abordagem é buscar por um campo e filtrar o resto no código, ou fazer múltiplas consultas.
    // Vamos simplificar a busca para apenas o campo 'nomeCompleto' usando prefixo.
    const buscaNormalizada = busca.trim().toLowerCase();
    
    // Busca por prefixo no campo 'nomeCompleto' (case-insensitive)
    // Isso requer que o campo 'nomeCompleto' seja indexado.
    clientesRef = clientesRef
      .orderBy("nomeCompleto")
      .startAt(buscaNormalizada)
      .endAt(buscaNormalizada + "\uf8ff");

    // Para buscar por telefone e email, teríamos que fazer consultas separadas e mesclar.
    // Por simplicidade e para evitar a complexidade de mesclagem e deduplicação, 
    // manteremos a busca apenas por nome no Firestore e faremos a filtragem no cliente,
    // ou usaremos uma solução de busca mais robusta (como Algolia ou ElasticSearch) que está fora do escopo.
    // Vou manter a busca simplificada para 'nomeCompleto' no backend.
  }

  const snapshot = await clientesRef.orderBy("updatedAt", "desc").get();
  return snapshot.docs.map(toCliente);
}

/**
 * Obtém um cliente pelo ID.
 */
export async function obterClientePorId(id: string): Promise<Cliente | undefined> {
  const db = getDb();
  const clienteDoc = await db.collection(COLLECTIONS.CLIENTES).doc(id).get();

  if (!clienteDoc.exists) {
    return undefined;
  }

  return toCliente(clienteDoc);
}

/**
 * Atualiza um cliente.
 */
export async function atualizarCliente(id: string, dados: Partial<InsertCliente>): Promise<Cliente> {
  const db = getDb();
  const clienteRef = db.collection(COLLECTIONS.CLIENTES).doc(id);

  const clienteExistente = await obterClientePorId(id);
  if (!clienteExistente) throw new Error("Cliente não encontrado");

  // Verifica duplicidade se estiver alterando campos relevantes
  if (dados.nomeCompleto || dados.telefone || dados.email !== undefined) {
    const nomeCompleto = dados.nomeCompleto || clienteExistente.nomeCompleto;
    const telefone = dados.telefone || clienteExistente.telefone;
    const email = dados.email !== undefined ? dados.email : clienteExistente.email;

    const duplicidade = await verificarDuplicidadeCliente(nomeCompleto, telefone, email, id);

    if (duplicidade) {
      const campos = [];
      if (duplicidade.telefone) campos.push("telefone");
      if (duplicidade.email) campos.push("e-mail");
      if (duplicidade.nomeETelefone) campos.push("nome completo + telefone");
      throw new Error(`Cliente já cadastrado com: ${campos.join(", ")}`);
    }
  }

  const updateData: Partial<InsertCliente> & { updatedAt: admin.firestore.FieldValue } = {
    ...dados,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await clienteRef.update(updateData);

  const updated = await clienteRef.get();
  return toCliente(updated);
}

/**
 * Exclui um cliente.
 */
export async function excluirCliente(id: string): Promise<void> {
  const db = getDb();
  await db.collection(COLLECTIONS.CLIENTES).doc(id).delete();
}

// ============= MENUS =============

/**
 * Converte um documento do Firestore para o tipo Menu.
 */
const toMenu = (doc: admin.firestore.DocumentSnapshot): Menu => {
  const data = doc.data() as Omit<Menu, "id" | "createdAt" | "updatedAt"> & {
    createdAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
  };
  return {
    ...data,
    id: doc.id,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  } as Menu;
};

/**
 * Cria um novo menu.
 */
export async function criarMenu(menu: InsertMenu): Promise<Menu> {
  const db = getDb();
  const menuData: Omit<InsertMenu, "id"> = {
    ...menu,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };

  const result = await db.collection(COLLECTIONS.MENUS).add(menuData);
  const inserted = await result.get();
  return toMenu(inserted);
}

/**
 * Converte um documento do Firestore para o tipo Prato.
 */
const toPrato = (doc: admin.firestore.DocumentSnapshot): Prato => {
  const data = doc.data() as Omit<Prato, "id" | "createdAt" | "updatedAt"> & {
    createdAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
  };
  return {
    ...data,
    id: doc.id,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  } as Prato;
};

/**
 * Lista menus, opcionalmente apenas os ativos, e inclui seus pratos.
 * No Firestore, a inclusão de subcoleções (pratos) requer consultas separadas.
 */
export async function listarMenus(apenasAtivos?: boolean): Promise<(Menu & { pratos: Prato[] })[]> {
  const db = getDb();
  let menusRef: admin.firestore.Query = db.collection(COLLECTIONS.MENUS);

  if (apenasAtivos) {
    menusRef = menusRef.where("ativo", "==", true);
  }

  const snapshot = await menusRef.orderBy("updatedAt", "desc").get();
  const menusData = snapshot.docs.map(toMenu);

  const menusComPratos = await Promise.all(
    menusData.map(async (menu) => {
      const pratosSnapshot = await db
        .collection(COLLECTIONS.MENUS)
        .doc(menu.id)
        .collection(COLLECTIONS.PRATOS)
        .orderBy("ordem")
        .get();
      const pratosList = pratosSnapshot.docs.map(toPrato);
      return { ...menu, pratos: pratosList };
    })
  );

  return menusComPratos;
}

/**
 * Obtém um menu pelo ID.
 */
export async function obterMenuPorId(id: string): Promise<Menu | undefined> {
  const db = getDb();
  const menuDoc = await db.collection(COLLECTIONS.MENUS).doc(id).get();

  if (!menuDoc.exists) {
    return undefined;
  }

  return toMenu(menuDoc);
}

/**
 * Atualiza um menu.
 */
export async function atualizarMenu(id: string, dados: Partial<InsertMenu>): Promise<Menu> {
  const db = getDb();
  const menuRef = db.collection(COLLECTIONS.MENUS).doc(id);

  const updateData: Partial<InsertMenu> & { updatedAt: admin.firestore.FieldValue } = {
    ...dados,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await menuRef.update(updateData);

  const updated = await menuRef.get();
  return toMenu(updated);
}

/**
 * Exclui um menu.
 */
export async function excluirMenu(id: string): Promise<void> {
  const db = getDb();
  // TODO: Deletar todos os pratos da subcoleção
  await db.collection(COLLECTIONS.MENUS).doc(id).delete();
}

// ============= PRATOS =============

/**
 * Cria um novo prato em um menu.
 */
export async function criarPrato(menuId: string, prato: InsertPrato): Promise<Prato> {
  const db = getDb();
  const pratoData: Omit<InsertPrato, "id" | "menuId"> = {
    ...prato,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };

  const result = await db.collection(COLLECTIONS.MENUS).doc(menuId).collection(COLLECTIONS.PRATOS).add(pratoData);
  const inserted = await result.get();
  return toPrato(inserted);
}

/**
 * Obtém um prato pelo ID do menu e ID do prato.
 */
export async function obterPratoPorId(menuId: string, id: string): Promise<Prato | undefined> {
  const db = getDb();
  const pratoDoc = await db.collection(COLLECTIONS.MENUS).doc(menuId).collection(COLLECTIONS.PRATOS).doc(id).get();

  if (!pratoDoc.exists) {
    return undefined;
  }

  return toPrato(pratoDoc);
}

/**
 * Lista pratos de um menu.
 */
export async function listarPratosPorMenu(menuId: string): Promise<Prato[]> {
  const db = getDb();
  const snapshot = await db
    .collection(COLLECTIONS.MENUS)
    .doc(menuId)
    .collection(COLLECTIONS.PRATOS)
    .orderBy("ordem")
    .get();

  return snapshot.docs.map(toPrato);
}

/**
 * Atualiza um prato.
 */
export async function atualizarPrato(menuId: string, id: string, dados: Partial<InsertPrato>): Promise<Prato> {
  const db = getDb();
  const pratoRef = db.collection(COLLECTIONS.MENUS).doc(menuId).collection(COLLECTIONS.PRATOS).doc(id);

  const updateData: Partial<InsertPrato> & { updatedAt: admin.firestore.FieldValue } = {
    ...dados,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await pratoRef.update(updateData);

  const updated = await pratoRef.get();
  return toPrato(updated);
}

/**
 * Exclui um prato.
 */
export async function excluirPrato(menuId: string, id: string): Promise<void> {
  const db = getDb();
  await db.collection(COLLECTIONS.MENUS).doc(menuId).collection(COLLECTIONS.PRATOS).doc(id).delete();
}

// ============= EVENTOS =============

/**
 * Converte um documento do Firestore para o tipo Evento.
 */
const toEvento = (doc: admin.firestore.DocumentSnapshot): Evento => {
  const data = doc.data() as Omit<Evento, "id" | "data" | "createdAt" | "updatedAt"> & {
    data: admin.firestore.Timestamp;
    createdAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
  };
  return {
    ...data,
    id: doc.id,
    data: data.data.toDate(),
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  } as Evento;
};

/**
 * Verifica conflito de agenda (4 horas no mesmo local, ignorando cancelados).
 * @returns Evento em conflito ou undefined.
 */
export async function verificarConflitoAgenda(
  dataEvento: Date,
  horario: string,
  local: Evento["local"],
  eventoIdExcluir?: string
): Promise<Evento | undefined> {
  const db = getDb();
  const [hora, minuto] = horario.split(":").map(Number);
  const inicioEvento = new Date(dataEvento);
  inicioEvento.setHours(hora, minuto, 0, 0);

  // Intervalo de conflito: T0-4h a T0+4h
  const inicioConflito = addHours(inicioEvento, -4);
  const fimConflito = addHours(inicioEvento, 4);

  // No Firestore, não podemos fazer consultas de intervalo em campos diferentes
  // ou consultas complexas de data/hora.
  // A abordagem mais segura é buscar por eventos no mesmo dia e local, e filtrar no código.
  // Isso exige que o campo 'data' seja indexado.

  // 1. Busca eventos no mesmo local e que não estejam cancelados
  let query = db
    .collection(COLLECTIONS.EVENTOS)
    .where("local", "==", local)
    .where("status", "!=", "cancelado");

  if (eventoIdExcluir) {
    query = query.where(admin.firestore.FieldPath.documentId(), "!=", eventoIdExcluir);
  }

  const snapshot = await query.get();

  for (const doc of snapshot.docs) {
    const evento = toEvento(doc);
    
    // 2. Filtra eventos que são no mesmo dia
    if (isSameDay(evento.data, dataEvento)) {
      // 3. Filtra eventos que estão dentro do intervalo de 4h
      const [evtHora, evtMinuto] = evento.horario.split(":").map(Number);
      const inicioOutroEvento = new Date(evento.data);
      inicioOutroEvento.setHours(evtHora, evtMinuto, 0, 0);

      if (isWithinInterval(inicioOutroEvento, { start: inicioConflito, end: fimConflito })) {
        return evento; // Conflito encontrado
      }
    }
  }

  return undefined;
}

/**
 * Cria um novo evento.
 */
export async function criarEvento(evento: Omit<InsertEvento, "id">): Promise<Evento> {
  const db = getDb();
  const eventoData: Omit<InsertEvento, "id"> = {
    ...evento,
    data: evento.data as any, // Firestore Timestamp
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
  };

  const result = await db.collection(COLLECTIONS.EVENTOS).add(eventoData);
  const inserted = await result.get();
  return toEvento(inserted);
}

/**
 * Lista eventos com filtros.
 */
export async function listarEventos(filtros: {
  dataInicio?: Date;
  dataFim?: Date;
  status?: Evento["status"];
  local?: Evento["local"];
  clienteId?: string;
}): Promise<Evento[]> {
  const db = getDb();
  let eventosRef: admin.firestore.Query = db.collection(COLLECTIONS.EVENTOS);

  // No Firestore, só podemos usar um campo para range queries (>, <, >=, <=)
  // e ele deve ser o primeiro campo no orderBy.
  // Vamos usar 'data' para o range.

  if (filtros.dataInicio) {
    eventosRef = eventosRef.where("data", ">=", filtros.dataInicio);
  }
  if (filtros.dataFim) {
    // Para incluir o dia inteiro, adicionamos 23:59:59
    const dataFim = new Date(filtros.dataFim);
    dataFim.setHours(23, 59, 59, 999);
    eventosRef = eventosRef.where("data", "<=", dataFim);
  }

  // Filtros de igualdade podem ser adicionados
  if (filtros.status) {
    eventosRef = eventosRef.where("status", "==", filtros.status);
  }
  if (filtros.local) {
    eventosRef = eventosRef.where("local", "==", filtros.local);
  }
  if (filtros.clienteId) {
    eventosRef = eventosRef.where("clienteId", "==", filtros.clienteId);
  }

  // Ordena por data (necessário para range query)
  const snapshot = await eventosRef.orderBy("data", "desc").get();
  return snapshot.docs.map(toEvento);
}

/**
 * Obtém um evento pelo ID.
 */
export async function obterEventoPorId(id: string): Promise<Evento | undefined> {
  const db = getDb();
  const eventoDoc = await db.collection(COLLECTIONS.EVENTOS).doc(id).get();

  if (!eventoDoc.exists) {
    return undefined;
  }

  return toEvento(eventoDoc);
}

/**
 * Atualiza um evento.
 */
export async function atualizarEvento(id: string, dados: Partial<InsertEvento>): Promise<Evento> {
  const db = getDb();
  const eventoRef = db.collection(COLLECTIONS.EVENTOS).doc(id);

  const updateData: Partial<InsertEvento> & { updatedAt: admin.firestore.FieldValue } = {
    ...dados,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (dados.data) {
    updateData.data = dados.data as any; // Converte para Firestore Timestamp
  }

  await eventoRef.update(updateData);

  const updated = await eventoRef.get();
  return toEvento(updated);
}

/**
 * Exclui um evento.
 */
export async function excluirEvento(id: string): Promise<void> {
  const db = getDb();
  // TODO: Deletar subcoleções (pratosSnapshot, vinhos, historicoEmails)
  await db.collection(COLLECTIONS.EVENTOS).doc(id).delete();
}

// ============= EVENTOS PRATOS SNAPSHOT =============

/**
 * Converte um documento do Firestore para o tipo EventoPratoSnapshot.
 */
const toEventoPratoSnapshot = (doc: admin.firestore.DocumentSnapshot): EventoPratoSnapshot => {
  const data = doc.data() as Omit<EventoPratoSnapshot, "id" | "createdAt"> & {
    createdAt: admin.firestore.Timestamp;
  };
  return {
    ...data,
    id: doc.id,
    createdAt: data.createdAt.toDate(),
  } as EventoPratoSnapshot;
};

/**
 * Cria o snapshot dos pratos de um menu para um evento.
 */
export async function criarSnapshotPratos(eventoId: string, menuId: string): Promise<void> {
  const db = getDb();
  const pratosMenu = await listarPratosPorMenu(menuId);

  const batch = db.batch();
  const snapshotRef = db.collection(COLLECTIONS.EVENTOS).doc(eventoId).collection(COLLECTIONS.EVENTOS_PRATOS_SNAPSHOT);

  for (const prato of pratosMenu) {
    const pratoSnapshotData: Omit<InsertEventoPratoSnapshot, "id" | "eventoId"> = {
      nome: prato.nome,
      descricao: prato.descricao,
      etapa: prato.etapa,
      ordem: prato.ordem,
      createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    };
    const newDocRef = snapshotRef.doc();
    batch.set(newDocRef, pratoSnapshotData);
  }

  await batch.commit();
}

/**
 * Obtém o snapshot dos pratos de um evento.
 */
export async function obterSnapshotPratos(eventoId: string): Promise<EventoPratoSnapshot[]> {
  const db = getDb();
  const snapshot = await db
    .collection(COLLECTIONS.EVENTOS)
    .doc(eventoId)
    .collection(COLLECTIONS.EVENTOS_PRATOS_SNAPSHOT)
    .orderBy("ordem")
    .get();

  return snapshot.docs.map(toEventoPratoSnapshot);
}

/**
 * Exclui todos os pratos do snapshot de um evento.
 */
export async function excluirSnapshotPratos(eventoId: string): Promise<void> {
  const db = getDb();
  const snapshot = await db
    .collection(COLLECTIONS.EVENTOS)
    .doc(eventoId)
    .collection(COLLECTIONS.EVENTOS_PRATOS_SNAPSHOT)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}

// ============= EVENTOS VINHOS =============

/**
 * Converte um documento do Firestore para o tipo EventoVinho.
 */
const toEventoVinho = (doc: admin.firestore.DocumentSnapshot): EventoVinho => {
  const data = doc.data() as Omit<EventoVinho, "id" | "createdAt" | "updatedAt"> & {
    createdAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
  };
  return {
    ...data,
    id: doc.id,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  } as EventoVinho;
};

/**
 * Adiciona vinhos a um evento.
 */
export async function adicionarVinhosEvento(eventoId: string, vinhos: Omit<InsertEventoVinho, "id" | "eventoId">[]): Promise<void> {
  const db = getDb();
  const batch = db.batch();
  const vinhosRef = db.collection(COLLECTIONS.EVENTOS).doc(eventoId).collection(COLLECTIONS.EVENTOS_VINHOS);

  for (const vinho of vinhos) {
    const vinhoData: Omit<InsertEventoVinho, "id" | "eventoId"> = {
      ...vinho,
      createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
      updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
    };
    const newDocRef = vinhosRef.doc();
    batch.set(newDocRef, vinhoData);
  }

  await batch.commit();
}

/**
 * Obtém os vinhos de um evento.
 */
export async function obterVinhosEvento(eventoId: string): Promise<EventoVinho[]> {
  const db = getDb();
  const snapshot = await db
    .collection(COLLECTIONS.EVENTOS)
    .doc(eventoId)
    .collection(COLLECTIONS.EVENTOS_VINHOS)
    .get();

  return snapshot.docs.map(toEventoVinho);
}

/**
 * Exclui todos os vinhos de um evento.
 */
export async function excluirVinhosEvento(eventoId: string): Promise<void> {
  const db = getDb();
  const snapshot = await db
    .collection(COLLECTIONS.EVENTOS)
    .doc(eventoId)
    .collection(COLLECTIONS.EVENTOS_VINHOS)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}

/**
 * Calcula o subtotal dos vinhos de um evento.
 */
export async function calcularSubtotalVinhos(vinhos: Omit<InsertEventoVinho, "id" | "eventoId">[]): Promise<number> {
  return vinhos.reduce((acc, vinho) => acc + vinho.quantidade * vinho.valorGarrafa, 0);
}

// ============= HISTORICO EMAILS =============

/**
 * Converte um documento do Firestore para o tipo HistoricoEmail.
 */
const toHistoricoEmail = (doc: admin.firestore.DocumentSnapshot): HistoricoEmail => {
  const data = doc.data() as Omit<HistoricoEmail, "id" | "enviadoEm"> & {
    enviadoEm: admin.firestore.Timestamp;
  };
  return {
    ...data,
    id: doc.id,
    enviadoEm: data.enviadoEm.toDate(),
  } as HistoricoEmail;
};

/**
 * Registra um e-mail no histórico.
 */
export async function registrarHistoricoEmail(eventoId: string, email: Omit<InsertHistoricoEmail, "id" | "eventoId">): Promise<void> {
  const db = getDb();
  const emailData: Omit<InsertHistoricoEmail, "id" | "eventoId"> = {
    ...email,
    enviadoEm: admin.firestore.FieldValue.serverTimestamp() as any,
  };

  await db.collection(COLLECTIONS.EVENTOS).doc(eventoId).collection(COLLECTIONS.HISTORICO_EMAILS).add(emailData);
}

/**
 * Obtém o histórico de e-mails de um evento.
 */
export async function obterHistoricoEmailsPorEvento(eventoId: string): Promise<HistoricoEmail[]> {
  const db = getDb();
  const snapshot = await db
    .collection(COLLECTIONS.EVENTOS)
    .doc(eventoId)
    .collection(COLLECTIONS.HISTORICO_EMAILS)
    .orderBy("enviadoEm", "desc")
    .get();

  return snapshot.docs.map(toHistoricoEmail);
}

// ============= CONFIGURACOES =============

/**
 * Converte um documento do Firestore para o tipo Configuracao.
 */
const toConfiguracao = (doc: admin.firestore.DocumentSnapshot): Configuracao => {
  const data = doc.data() as Omit<Configuracao, "id" | "updatedAt"> & {
    updatedAt: admin.firestore.Timestamp;
  };
  return {
    ...data,
    id: doc.id,
    updatedAt: data.updatedAt.toDate(),
  } as Configuracao;
};

/**
 * Obtém uma configuração pela chave.
 * No Firestore, vamos usar a chave como ID do documento.
 */
export async function obterConfiguracao(chave: string): Promise<Configuracao | undefined> {
  const db = getDb();
  const configDoc = await db.collection(COLLECTIONS.CONFIGURACOES).doc(chave).get();

  if (!configDoc.exists) {
    return undefined;
  }

  return toConfiguracao(configDoc);
}

/**
 * Atualiza ou cria uma configuração.
 */
export async function upsertConfiguracao(chave: string, dados: Partial<InsertConfiguracao>): Promise<Configuracao> {
  const db = getDb();
  const configRef = db.collection(COLLECTIONS.CONFIGURACOES).doc(chave);

  const updateData: Partial<InsertConfiguracao> & { updatedAt: admin.firestore.FieldValue } = {
    ...dados,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await configRef.set(updateData, { merge: true });

  const updated = await configRef.get();
  return toConfiguracao(updated);
}

// ============= UTILS =============

/**
 * Função para obter todos os eventos do dia (para o serviço de agenda diária).
 */
export async function obterEventosDoDia(data: Date): Promise<Evento[]> {
  const db = getDb();
  // Busca eventos cuja data esteja entre o início e o fim do dia
  const inicioDoDia = new Date(data);
  inicioDoDia.setHours(0, 0, 0, 0);
  const fimDoDia = new Date(data);
  fimDoDia.setHours(23, 59, 59, 999);

  const snapshot = await db
    .collection(COLLECTIONS.EVENTOS)
    .where("data", ">=", inicioDoDia)
    .where("data", "<=", fimDoDia)
    .orderBy("data", "asc")
    .get();

  return snapshot.docs.map(toEvento);
}

/**
 * Função para obter todos os eventos para lembrete (D-7).
 */
export async function obterEventosParaLembrete(dataLembrete: Date): Promise<Evento[]> {
  const db = getDb();
  // Busca eventos confirmados, com lembrete ativo, cuja data seja o dia do lembrete
  const inicioDoDia = new Date(dataLembrete);
  inicioDoDia.setHours(0, 0, 0, 0);
  const fimDoDia = new Date(dataLembrete);
  fimDoDia.setHours(23, 59, 59, 999);

  const snapshot = await db
    .collection(COLLECTIONS.EVENTOS)
    .where("status", "==", "confirmado")
    .where("lembreteAtivo", "==", true)
    .where("data", ">=", inicioDoDia)
    .where("data", "<=", fimDoDia)
    .orderBy("data", "asc")
    .get();

  return snapshot.docs.map(toEvento);
}

// ============= EXPORTAÇÕES DE TIPOS =============

// Exporta os tipos para uso em outros módulos
export type {
  User,
  InsertUser,
  Cliente,
  InsertCliente,
  Menu,
  InsertMenu,
  Prato,
  InsertPrato,
  Evento,
  InsertEvento,
  EventoPratoSnapshot,
  InsertEventoPratoSnapshot,
  EventoVinho,
  InsertEventoVinho,
  HistoricoEmail,
  InsertHistoricoEmail,
  Configuracao,
  InsertConfiguracao,
};
