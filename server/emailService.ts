import nodemailer from 'nodemailer';
import { Evento, Cliente, Menu, EventoPratoSnapshot } from '../drizzle/schema';
import { gerarPropostaPDF } from './pdfGenerator';

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  fromName: string;
}

function getEmailConfig(): EmailConfig {
  return {
    host: process.env.EMAIL_HOST || '',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    fromName: process.env.EMAIL_FROM_NAME || 'Enoteca Decanter Santos',
  };
}

function createTransporter() {
  const config = getEmailConfig();

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.password,
    },
  });
}

interface EnviarPropostaParams {
  evento: Evento;
  cliente: Cliente;
  menu: Menu;
  pratosSnapshot: EventoPratoSnapshot[];
  mensagemPersonalizada?: string;
}

export async function enviarPropostaEmail(params: EnviarPropostaParams): Promise<void> {
  const { evento, cliente, menu, pratosSnapshot, mensagemPersonalizada } = params;

  if (!cliente.email) {
    throw new Error('Cliente não possui e-mail cadastrado');
  }

  const config = getEmailConfig();
  const transporter = createTransporter();

  // Gera o PDF
  const pdfBuffer = await gerarPropostaPDF({
    evento,
    cliente,
    menu,
    pratosSnapshot,
  });

  const dataFormatada = evento.data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const localFormatado =
    evento.local === 'salao_eventos' ? 'Salão de Eventos' : 'Salão Principal';

  const totalFormatado = (evento.totalEvento / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const mensagemPadrao = `Prezado(a) ${cliente.nomeCompleto},

Segue em anexo a proposta para o seu evento:

Data: ${dataFormatada}
Horário: ${evento.horario}
Local: ${localFormatado}
Quantidade de Pessoas: ${evento.quantidadePessoas}
Total: ${totalFormatado}

${mensagemPersonalizada || 'Ficamos à disposição para quaisquer esclarecimentos.'}

Atenciosamente,
Enoteca Decanter Santos`;

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.user}>`,
    to: cliente.email,
    subject: `Proposta de Evento - ${dataFormatada}`,
    text: mensagemPadrao,
    attachments: [
      {
        filename: `proposta-evento-${evento.id}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}

interface EnviarAtualizacaoParams {
  evento: Evento;
  cliente: Cliente;
  menu: Menu;
  pratosSnapshot: EventoPratoSnapshot[];
  mensagemPersonalizada?: string;
}

export async function enviarAtualizacaoEmail(params: EnviarAtualizacaoParams): Promise<void> {
  const { evento, cliente, menu, pratosSnapshot, mensagemPersonalizada } = params;

  if (!cliente.email) {
    throw new Error('Cliente não possui e-mail cadastrado');
  }

  const config = getEmailConfig();
  const transporter = createTransporter();

  // Gera o PDF atualizado
  const pdfBuffer = await gerarPropostaPDF({
    evento,
    cliente,
    menu,
    pratosSnapshot,
  });

  const dataFormatada = evento.data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const localFormatado =
    evento.local === 'salao_eventos' ? 'Salão de Eventos' : 'Salão Principal';

  const totalFormatado = (evento.totalEvento / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const mensagemPadrao = `Prezado(a) ${cliente.nomeCompleto},

Informamos que houve uma atualização na reserva do seu evento:

Data: ${dataFormatada}
Horário: ${evento.horario}
Local: ${localFormatado}
Quantidade de Pessoas: ${evento.quantidadePessoas}
Total: ${totalFormatado}

${mensagemPersonalizada || 'Segue em anexo a proposta atualizada.'}

Atenciosamente,
Enoteca Decanter Santos`;

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.user}>`,
    to: cliente.email,
    subject: `Atualização de Reserva - ${dataFormatada}`,
    text: mensagemPadrao,
    attachments: [
      {
        filename: `proposta-evento-${evento.id}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}

interface EnviarLembreteParams {
  evento: Evento;
  cliente: Cliente;
}

export async function enviarLembreteEmail(params: EnviarLembreteParams): Promise<void> {
  const { evento, cliente } = params;

  if (!cliente.email) {
    throw new Error('Cliente não possui e-mail cadastrado');
  }

  const config = getEmailConfig();
  const transporter = createTransporter();

  const dataFormatada = evento.data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const localFormatado =
    evento.local === 'salao_eventos' ? 'Salão de Eventos' : 'Salão Principal';

  const totalFormatado = (evento.totalEvento / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  let mensagemBebidas = '';
  if (evento.pacoteBebidasAtivo) {
    const valorPacoteFormatado = (evento.valorPacoteBebidas / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    mensagemBebidas = `\nPacote de bebidas contratado: ${valorPacoteFormatado} por pessoa`;
  } else {
    mensagemBebidas =
      '\nLembramos que os vinhos e bebidas não estão incluídos no valor do menu.';
  }

  const mensagem = `Prezado(a) ${cliente.nomeCompleto},

Este é um lembrete sobre o seu evento agendado para daqui a 7 dias:

Data: ${dataFormatada}
Horário: ${evento.horario}
Local: ${localFormatado}
Quantidade de Pessoas: ${evento.quantidadePessoas}${mensagemBebidas}
Total: ${totalFormatado}

Estamos aguardando você!

Atenciosamente,
Enoteca Decanter Santos`;

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.user}>`,
    to: cliente.email,
    subject: `Lembrete: Seu evento em ${dataFormatada}`,
    text: mensagem,
  });
}

