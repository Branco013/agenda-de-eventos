import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Clientes da Enoteca
 */
export const clientes = mysqlTable("clientes", {
  id: int("id").autoincrement().primaryKey(),
  nomeCompleto: varchar("nomeCompleto", { length: 255 }).notNull(),
  telefone: varchar("telefone", { length: 20 }).notNull(),
  email: varchar("email", { length: 320 }),
  endereco: text("endereco"),
  empresa: varchar("empresa", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Cliente = typeof clientes.$inferSelect;
export type InsertCliente = typeof clientes.$inferInsert;

/**
 * Menus disponíveis
 */
export const menus = mysqlTable("menus", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  valorPadraoPorPessoa: int("valorPadraoPorPessoa").notNull(), // em centavos
  descricao: text("descricao"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Menu = typeof menus.$inferSelect;
export type InsertMenu = typeof menus.$inferInsert;

/**
 * Pratos de um menu
 */
export const pratos = mysqlTable("pratos", {
  id: int("id").autoincrement().primaryKey(),
  menuId: int("menuId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  etapa: mysqlEnum("etapa", ["couvert", "entrada", "principal", "sobremesa"]).notNull(),
  ordem: int("ordem").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Prato = typeof pratos.$inferSelect;
export type InsertPrato = typeof pratos.$inferInsert;

/**
 * Eventos agendados
 */
export const eventos = mysqlTable("eventos", {
  id: int("id").autoincrement().primaryKey(),
  clienteId: int("clienteId").notNull(),
  tipoEvento: varchar("tipoEvento", { length: 255 }).notNull(),
  local: mysqlEnum("local", ["salao_eventos", "salao_principal"]).notNull(),
  quantidadePessoas: int("quantidadePessoas").notNull(),
  data: timestamp("data").notNull(),
  horario: varchar("horario", { length: 5 }).notNull(), // HH:MM
  menuId: int("menuId").notNull(),
  status: mysqlEnum("status", ["em_analise", "confirmado", "cancelado"]).default("em_analise").notNull(),
  valorPorPessoaEvento: int("valorPorPessoaEvento").notNull(), // em centavos
  pacoteBebidasAtivo: boolean("pacoteBebidasAtivo").default(false).notNull(),
  valorPacoteBebidas: int("valorPacoteBebidas").default(5000).notNull(), // em centavos (padrão R$ 50,00)
  observacoes: text("observacoes"),
  subtotalMenu: int("subtotalMenu").notNull(), // em centavos
  subtotalBebidas: int("subtotalBebidas").notNull(), // em centavos
  subtotalVinhos: int("subtotalVinhos").default(0).notNull(), // em centavos
  taxaServico: int("taxaServico").default(0).notNull(), // em centavos (10%)
  totalEvento: int("totalEvento").notNull(), // em centavos
  lembreteAtivo: boolean("lembreteAtivo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Evento = typeof eventos.$inferSelect;
export type InsertEvento = typeof eventos.$inferInsert;

/**
 * Snapshot dos pratos do menu no momento da criação do evento
 */
export const eventosPratosSnapshot = mysqlTable("eventosPratosSnapshot", {
  id: int("id").autoincrement().primaryKey(),
  eventoId: int("eventoId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  etapa: mysqlEnum("etapa", ["couvert", "entrada", "principal", "sobremesa"]).notNull(),
  ordem: int("ordem").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EventoPratoSnapshot = typeof eventosPratosSnapshot.$inferSelect;
export type InsertEventoPratoSnapshot = typeof eventosPratosSnapshot.$inferInsert;

/**
 * Vinhos escolhidos para o evento
 */
export const eventosVinhos = mysqlTable("eventosVinhos", {
  id: int("id").autoincrement().primaryKey(),
  eventoId: int("eventoId").notNull(),
  tipoVinho: varchar("tipoVinho", { length: 255 }).notNull(),
  quantidade: int("quantidade").notNull(),
  valorGarrafa: int("valorGarrafa").notNull(), // em centavos
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EventoVinho = typeof eventosVinhos.$inferSelect;
export type InsertEventoVinho = typeof eventosVinhos.$inferInsert;

/**
 * Histórico de e-mails enviados
 */
export const historicoEmails = mysqlTable("historicoEmails", {
  id: int("id").autoincrement().primaryKey(),
  eventoId: int("eventoId").notNull(),
  tipo: mysqlEnum("tipo", ["proposta", "atualizacao", "lembrete"]).notNull(),
  destinatario: varchar("destinatario", { length: 320 }).notNull(),
  assunto: varchar("assunto", { length: 500 }).notNull(),
  conteudo: text("conteudo").notNull(),
  sucesso: boolean("sucesso").notNull(),
  mensagemErro: text("mensagemErro"),
  enviadoEm: timestamp("enviadoEm").defaultNow().notNull(),
});

export type HistoricoEmail = typeof historicoEmails.$inferSelect;
export type InsertHistoricoEmail = typeof historicoEmails.$inferInsert;

/**
 * Configurações do sistema
 */
export const configuracoes = mysqlTable("configuracoes", {
  id: int("id").autoincrement().primaryKey(),
  chave: varchar("chave", { length: 100 }).notNull().unique(),
  valor: text("valor").notNull(),
  descricao: text("descricao"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Configuracao = typeof configuracoes.$inferSelect;
export type InsertConfiguracao = typeof configuracoes.$inferInsert;

// Relations
export const pratosRelations = relations(pratos, ({ one }) => ({
  menu: one(menus, {
    fields: [pratos.menuId],
    references: [menus.id],
  }),
}));

export const menusRelations = relations(menus, ({ many }) => ({
  pratos: many(pratos),
}));

export const eventosRelations = relations(eventos, ({ one, many }) => ({
  cliente: one(clientes, {
    fields: [eventos.clienteId],
    references: [clientes.id],
  }),
  menu: one(menus, {
    fields: [eventos.menuId],
    references: [menus.id],
  }),
  pratosSnapshot: many(eventosPratosSnapshot),
  historicoEmails: many(historicoEmails),
  vinhos: many(eventosVinhos),
}));

export const eventosVinhosRelations = relations(eventosVinhos, ({ one }) => ({
  evento: one(eventos, {
    fields: [eventosVinhos.eventoId],
    references: [eventos.id],
  }),
}));

export const clientesRelations = relations(clientes, ({ many }) => ({
  eventos: many(eventos),
}));

export const eventosPratosSnapshotRelations = relations(eventosPratosSnapshot, ({ one }) => ({
  evento: one(eventos, {
    fields: [eventosPratosSnapshot.eventoId],
    references: [eventos.id],
  }),
}));

export const historicoEmailsRelations = relations(historicoEmails, ({ one }) => ({
  evento: one(eventos, {
    fields: [historicoEmails.eventoId],
    references: [eventos.id],
  }),
}));

