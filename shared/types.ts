export type UserRole = "user" | "admin";
export type EtapaPrato = "couvert" | "entrada" | "principal" | "sobremesa";
export type LocalEvento = "salao_eventos" | "salao_principal";
export type StatusEvento = "em_analise" | "confirmado" | "cancelado";
export type TipoEmail = "proposta" | "atualizacao" | "lembrete";

export interface User {
  id: string; 
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
}
export type InsertUser = Omit<User, "id" | "createdAt" | "updatedAt" | "lastSignedIn"> & Partial<Pick<User, "createdAt" | "updatedAt" | "lastSignedIn">>;


export interface Cliente {
  id: string;
  nomeCompleto: string;
  telefone: string;
  email: string | null;
  endereco: string | null;
  empresa: string | null;
  createdAt: Date;
  updatedAt: Date;
}
export type InsertCliente = Omit<Cliente, "id" | "createdAt" | "updatedAt">;


export interface Menu {
  id: string;
  nome: string;
  valorPadraoPorPessoa: number; 
  descricao: string | null;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export type InsertMenu = Omit<Menu, "id" | "createdAt" | "updatedAt">;


export interface Prato {
  id: string;
  menuId: string; 
  nome: string;
  descricao: string | null;
  etapa: EtapaPrato;
  ordem: number;
  createdAt: Date;
  updatedAt: Date;
}
export type InsertPrato = Omit<Prato, "id" | "createdAt" | "updatedAt">;


export interface Evento {
  id: string;
  clienteId: string; 
  tipoEvento: string;
  local: LocalEvento;
  quantidadePessoas: number;
  data: Date; 
  horario: string; 
  menuId: string; 
  status: StatusEvento;
  valorPorPessoaEvento: number; 
  pacoteBebidasAtivo: boolean;
  valorPacoteBebidas: number; 
  observacoes: string | null;
  subtotalMenu: number; 
  subtotalBebidas: number; 
  subtotalVinhos: number; 
  taxaServico: number; 
  totalEvento: number; 
  lembreteAtivo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export type InsertEvento = Omit<Evento, "id" | "createdAt" | "updatedAt">;


export interface EventoPratoSnapshot {
  id: string;
  eventoId: string; 
  nome: string;
  descricao: string | null;
  etapa: EtapaPrato;
  ordem: number;
  createdAt: Date;
}
export type InsertEventoPratoSnapshot = Omit<EventoPratoSnapshot, "id" | "createdAt">;


export interface EventoVinho {
  id: string;
  eventoId: string; 
  tipoVinho: string;
  quantidade: number;
  valorGarrafa: number; 
  createdAt: Date;
  updatedAt: Date;
}
export type InsertEventoVinho = Omit<EventoVinho, "id" | "createdAt" | "updatedAt">;


export interface HistoricoEmail {
  id: string;
  eventoId: string; 
  tipo: TipoEmail;
  destinatario: string;
  assunto: string;
  conteudo: string;
  sucesso: boolean;
  mensagemErro: string | null;
  enviadoEm: Date;
}
export type InsertHistoricoEmail = Omit<HistoricoEmail, "id" | "enviadoEm">;


export interface Configuracao {
  id: string; 
  chave: string;
  valor: string;
  descricao: string | null;
  updatedAt: Date;
}
export type InsertConfiguracao = Omit<Configuracao, "id" | "updatedAt">;


export type MenuComPratos = Menu & {
  pratos: Prato[];
};

export type EventoComDetalhes = {
  evento: Evento;
  cliente: Cliente;
  menu: Menu;
  pratosSnapshot: EventoPratoSnapshot[];
  historicoEmails: HistoricoEmail[];
  vinhos: EventoVinho[];
};
