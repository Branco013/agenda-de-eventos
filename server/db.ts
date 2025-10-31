import { eq, and, or, sql, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  clientes, 
  InsertCliente, 
  Cliente,
  menus,
  InsertMenu,
  Menu,
  pratos,
  InsertPrato,
  Prato,
  eventos,
  InsertEvento,
  Evento,
  eventosPratosSnapshot,
  InsertEventoPratoSnapshot,
  EventoPratoSnapshot,
  eventosVinhos,
  InsertEventoVinho,
  EventoVinho,
  historicoEmails,
  InsertHistoricoEmail,
  HistoricoEmail,
  configuracoes,
  InsertConfiguracao,
  Configuracao
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============= USERS =============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============= CLIENTES =============

/**
 * Verifica duplicidade de cliente
 * Retorna objeto com campos duplicados ou null se não houver duplicidade
 */
export async function verificarDuplicidadeCliente(
  nomeCompleto: string,
  telefone: string,
  email: string | null | undefined,
  clienteIdExcluir?: number
): Promise<{ telefone?: boolean; email?: boolean; nomeETelefone?: boolean } | null> {
  const db = await getDb();
  if (!db) return null;

  const nomeNormalizado = nomeCompleto.trim().toLowerCase();
  const telefoneNormalizado = telefone.trim().toLowerCase();
  const emailNormalizado = email ? email.trim().toLowerCase() : null;

  const conditions = [];

  // Verifica telefone duplicado
  conditions.push(sql`LOWER(TRIM(${clientes.telefone})) = ${telefoneNormalizado}`);

  // Verifica e-mail duplicado (se fornecido)
  if (emailNormalizado) {
    conditions.push(sql`LOWER(TRIM(${clientes.email})) = ${emailNormalizado}`);
  }

  // Verifica combinação nome + telefone
  conditions.push(
    and(
      sql`LOWER(TRIM(${clientes.nomeCompleto})) = ${nomeNormalizado}`,
      sql`LOWER(TRIM(${clientes.telefone})) = ${telefoneNormalizado}`
    )
  );

  let query = db
    .select()
    .from(clientes)
    .where(or(...conditions));

  // Exclui o próprio cliente se for edição
  if (clienteIdExcluir) {
    query = db
      .select()
      .from(clientes)
      .where(
        and(
          or(...conditions),
          sql`${clientes.id} != ${clienteIdExcluir}`
        )
      );
  }

  const duplicados = await query;

  if (duplicados.length === 0) return null;

  const resultado: { telefone?: boolean; email?: boolean; nomeETelefone?: boolean } = {};

  for (const dup of duplicados) {
    const dupTelefone = dup.telefone.trim().toLowerCase();
    const dupEmail = dup.email ? dup.email.trim().toLowerCase() : null;
    const dupNome = dup.nomeCompleto.trim().toLowerCase();

    if (dupTelefone === telefoneNormalizado) {
      resultado.telefone = true;
    }

    if (emailNormalizado && dupEmail === emailNormalizado) {
      resultado.email = true;
    }

    if (dupNome === nomeNormalizado && dupTelefone === telefoneNormalizado) {
      resultado.nomeETelefone = true;
    }
  }

  return Object.keys(resultado).length > 0 ? resultado : null;
}

export async function criarCliente(cliente: InsertCliente): Promise<Cliente> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

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

  const result = await db.insert(clientes).values(cliente);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(clientes).where(eq(clientes.id, insertedId)).limit(1);
  return inserted[0];
}

export async function listarClientes(busca?: string): Promise<Cliente[]> {
  const db = await getDb();
  if (!db) return [];

  if (!busca) {
    return await db.select().from(clientes).orderBy(desc(clientes.createdAt));
  }

  const buscaNormalizada = `%${busca.toLowerCase()}%`;
  
  return await db
    .select()
    .from(clientes)
    .where(
      or(
        sql`LOWER(${clientes.nomeCompleto}) LIKE ${buscaNormalizada}`,
        sql`LOWER(${clientes.telefone}) LIKE ${buscaNormalizada}`,
        sql`LOWER(${clientes.email}) LIKE ${buscaNormalizada}`
      )
    )
    .orderBy(desc(clientes.createdAt));
}

export async function obterClientePorId(id: number): Promise<Cliente | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(clientes).where(eq(clientes.id, id)).limit(1);
  return result[0];
}

export async function atualizarCliente(id: number, dados: Partial<InsertCliente>): Promise<Cliente> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

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

  await db.update(clientes).set(dados).where(eq(clientes.id, id));
  
  const updated = await db.select().from(clientes).where(eq(clientes.id, id)).limit(1);
  return updated[0];
}

export async function excluirCliente(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(clientes).where(eq(clientes.id, id));
}

// ============= MENUS =============

export async function criarMenu(menu: InsertMenu): Promise<Menu> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(menus).values(menu);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(menus).where(eq(menus.id, insertedId)).limit(1);
  return inserted[0];
}

export async function listarMenus(apenasAtivos?: boolean): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  let menusData: Menu[];
  if (apenasAtivos) {
    menusData = await db.select().from(menus).where(eq(menus.ativo, true)).orderBy(desc(menus.createdAt));
  } else {
    menusData = await db.select().from(menus).orderBy(desc(menus.createdAt));
  }

  const menusComPratos = await Promise.all(
    menusData.map(async (menu) => {
      const pratosList = await db.select().from(pratos).where(eq(pratos.menuId, menu.id)).orderBy(pratos.ordem);
      return { ...menu, pratos: pratosList };
    })
  );

  return menusComPratos;
}

export async function obterMenuPorId(id: number): Promise<Menu | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(menus).where(eq(menus.id, id)).limit(1);
  return result[0];
}

export async function atualizarMenu(id: number, dados: Partial<InsertMenu>): Promise<Menu> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(menus).set(dados).where(eq(menus.id, id));
  
  const updated = await db.select().from(menus).where(eq(menus.id, id)).limit(1);
  return updated[0];
}

export async function excluirMenu(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Primeiro exclui todos os pratos do menu
  await db.delete(pratos).where(eq(pratos.menuId, id));
  
  // Depois exclui o menu
  await db.delete(menus).where(eq(menus.id, id));
}

// ============= PRATOS =============

export async function criarPrato(prato: InsertPrato): Promise<Prato> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(pratos).values(prato);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(pratos).where(eq(pratos.id, insertedId)).limit(1);
  return inserted[0];
}

export async function listarPratosPorMenu(menuId: number): Promise<Prato[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(pratos)
    .where(eq(pratos.menuId, menuId))
    .orderBy(asc(pratos.ordem), asc(pratos.id));
}

export async function obterPratoPorId(id: number): Promise<Prato | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(pratos).where(eq(pratos.id, id)).limit(1);
  return result[0];
}

export async function atualizarPrato(id: number, dados: Partial<InsertPrato>): Promise<Prato> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(pratos).set(dados).where(eq(pratos.id, id));
  
  const updated = await db.select().from(pratos).where(eq(pratos.id, id)).limit(1);
  return updated[0];
}

export async function excluirPrato(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(pratos).where(eq(pratos.id, id));
}

// ============= CONFIGURAÇÕES =============

export async function listarConfiguracoes(): Promise<Configuracao[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(configuracoes);
}

export async function obterConfiguracao(chave: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(configuracoes).where(eq(configuracoes.chave, chave)).limit(1);
  return result[0]?.valor || null;
}

export async function salvarConfiguracao(chave: string, valor: string, descricao?: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .insert(configuracoes)
    .values({ chave, valor, descricao })
    .onDuplicateKeyUpdate({ set: { valor, descricao } });
}

// ============= EVENTOS =============

export async function criarEvento(evento: InsertEvento): Promise<Evento> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(eventos).values(evento);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(eventos).where(eq(eventos.id, insertedId)).limit(1);
  return inserted[0];
}

export async function listarEventos(
  filtros?: {
    dataInicio?: Date;
    dataFim?: Date;
    status?: string;
    local?: string;
    clienteId?: number;
  }
): Promise<Evento[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filtros?.dataInicio) {
    conditions.push(sql`${eventos.data} >= ${filtros.dataInicio}`);
  }

  if (filtros?.dataFim) {
    conditions.push(sql`${eventos.data} <= ${filtros.dataFim}`);
  }

  if (filtros?.status) {
    conditions.push(eq(eventos.status, filtros.status as any));
  }

  if (filtros?.local) {
    conditions.push(eq(eventos.local, filtros.local as any));
  }

  if (filtros?.clienteId) {
    conditions.push(eq(eventos.clienteId, filtros.clienteId));
  }

  if (conditions.length > 0) {
    return await db.select().from(eventos).where(and(...conditions)).orderBy(desc(eventos.data), desc(eventos.horario));
  }

  return await db.select().from(eventos).orderBy(desc(eventos.data), desc(eventos.horario));
}

export async function obterEventoPorId(id: number): Promise<any> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(eventos).where(eq(eventos.id, id)).limit(1);
  const evento = result[0];
  
  if (evento) {
    const vinhos = await db.select().from(eventosVinhos).where(eq(eventosVinhos.eventoId, id));
    return { ...evento, vinhos };
  }
  
  return undefined;
}

export async function atualizarEvento(id: number, dados: Partial<InsertEvento>): Promise<Evento> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(eventos).set(dados).where(eq(eventos.id, id));
  
  const updated = await db.select().from(eventos).where(eq(eventos.id, id)).limit(1);
  return updated[0];
}

export async function excluirEvento(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Primeiro exclui o snapshot de pratos
  await db.delete(eventosPratosSnapshot).where(eq(eventosPratosSnapshot.eventoId, id));
  
  // Depois exclui o evento
  await db.delete(eventos).where(eq(eventos.id, id));
}

// ============= SNAPSHOT DE PRATOS =============

export async function criarSnapshotPratos(eventoId: number, menuId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Busca todos os pratos do menu
  const pratosDomenu = await listarPratosPorMenu(menuId);

  // Cria snapshot de cada prato
  for (const prato of pratosDomenu) {
    await db.insert(eventosPratosSnapshot).values({
      eventoId,
      nome: prato.nome,
      descricao: prato.descricao,
      etapa: prato.etapa,
      ordem: prato.ordem,
    });
  }
}

export async function obterSnapshotPratos(eventoId: number): Promise<EventoPratoSnapshot[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(eventosPratosSnapshot)
    .where(eq(eventosPratosSnapshot.eventoId, eventoId))
    .orderBy(asc(eventosPratosSnapshot.ordem));
}

export async function excluirSnapshotPratos(eventoId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(eventosPratosSnapshot).where(eq(eventosPratosSnapshot.eventoId, eventoId));
}

// ============= HISTÓRICO DE E-MAILS =============

export async function registrarEnvioEmail(email: InsertHistoricoEmail): Promise<HistoricoEmail> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(historicoEmails).values(email);
  const insertedId = Number(result[0].insertId);
  
  const inserted = await db.select().from(historicoEmails).where(eq(historicoEmails.id, insertedId)).limit(1);
  return inserted[0];
}

export async function obterHistoricoEmailsPorEvento(eventoId: number): Promise<HistoricoEmail[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(historicoEmails)
    .where(eq(historicoEmails.eventoId, eventoId))
    .orderBy(desc(historicoEmails.enviadoEm));
}

// ============= VALIDAÇÕES DE AGENDA =============

/**
 * Verifica conflito de agenda (4 horas no mesmo local)
 * Retorna evento conflitante ou null se não houver conflito
 */
export async function verificarConflitoAgenda(
  data: Date,
  horario: string,
  local: string,
  eventoIdExcluir?: number
): Promise<Evento | null> {
  const db = await getDb();
  if (!db) return null;

  // Converte horário HH:MM para minutos desde meia-noite
  const [horas, minutos] = horario.split(':').map(Number);
  const horarioMinutos = horas * 60 + minutos;

  // Janela de 4 horas = 240 minutos
  const janelaMinutos = 240;
  const horarioMinInicio = horarioMinutos - janelaMinutos;
  const horarioMaxInicio = horarioMinutos + janelaMinutos;

  // Busca eventos no mesmo dia e local
  const dataInicio = new Date(data);
  dataInicio.setHours(0, 0, 0, 0);
  
  const dataFim = new Date(data);
  dataFim.setHours(23, 59, 59, 999);

  let eventosNoDia = await db
    .select()
    .from(eventos)
    .where(
      and(
        eq(eventos.local, local as any),
        sql`${eventos.data} >= ${dataInicio}`,
        sql`${eventos.data} <= ${dataFim}`,
        sql`${eventos.status} != 'cancelado'`
      )
    );

  // Exclui o próprio evento se for edição
  if (eventoIdExcluir) {
    eventosNoDia = eventosNoDia.filter(e => e.id !== eventoIdExcluir);
  }

  // Verifica conflito de horário
  for (const evento of eventosNoDia) {
    const [eventHoras, eventMinutos] = evento.horario.split(':').map(Number);
    const eventoMinutos = eventHoras * 60 + eventMinutos;

    // Verifica se está dentro da janela de 4 horas
    if (eventoMinutos >= horarioMinInicio && eventoMinutos <= horarioMaxInicio) {
      return evento;
    }
  }

  return null;
}



// ============= VINHOS DO EVENTO =============

export async function adicionarVinhosEvento(eventoId: number, vinhos: Omit<InsertEventoVinho, 'eventoId'>[]): Promise<void> {
  const db = await getDb();
  if (!db || vinhos.length === 0) return;

  const vinhosComEvento = vinhos.map(v => ({ ...v, eventoId }));
  await db.insert(eventosVinhos).values(vinhosComEvento);
}

export async function listarVinhosEvento(eventoId: number): Promise<EventoVinho[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(eventosVinhos).where(eq(eventosVinhos.eventoId, eventoId));
}

export async function removerVinhosEvento(eventoId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(eventosVinhos).where(eq(eventosVinhos.eventoId, eventoId));
}

export async function calcularSubtotalVinhos(vinhos: { quantidade: number; valorGarrafa: number }[]): Promise<number> {
  return vinhos.reduce((total, vinho) => total + (vinho.quantidade * vinho.valorGarrafa), 0);
}

