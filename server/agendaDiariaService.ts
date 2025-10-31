import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import { Evento, Cliente } from '../drizzle/schema';

interface EventoComCliente extends Evento {
  cliente: Cliente;
}

interface ResumoAgenda {
  emAnalise: number;
  confirmados: number;
  cancelados: number;
  totalNaoCancelados: number; // em centavos
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || '',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: parseInt(process.env.EMAIL_PORT || '587') === 465,
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASSWORD || '',
    },
  });
}

export function gerarAgendaPDF(
  eventos: EventoComCliente[],
  data: Date,
  resumo: ResumoAgenda
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const dataFormatada = data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      // Cabeçalho
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('Enoteca Decanter Santos', { align: 'center' })
        .fontSize(14)
        .text(`Agenda do Dia - ${dataFormatada}`, { align: 'center' })
        .moveDown(2);

      if (eventos.length === 0) {
        doc
          .fontSize(12)
          .font('Helvetica')
          .text('Nenhum evento agendado para este dia.', { align: 'center' });
      } else {
        // Lista de eventos
        for (const evento of eventos) {
          const localFormatado =
            evento.local === 'salao_eventos' ? 'Salão de Eventos' : 'Salão Principal';

          const totalFormatado = (evento.totalEvento / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          });

          // Destaque para eventos cancelados
          if (evento.status === 'cancelado') {
            doc.fontSize(11).font('Helvetica-Bold').fillColor('red').text('CANCELADO', {
              continued: true,
            });
            doc.fillColor('black').text(` - ${evento.horario}`, { continued: true });
          } else {
            doc.fontSize(11).font('Helvetica-Bold').text(`${evento.horario}`, {
              continued: true,
            });
          }

          doc
            .font('Helvetica')
            .text(` - ${evento.cliente.nomeCompleto}`)
            .fontSize(10)
            .text(`   Tipo: ${evento.tipoEvento}`)
            .text(`   Local: ${localFormatado}`)
            .text(`   Status: ${evento.status.replace('_', ' ')}`)
            .text(`   Pessoas: ${evento.quantidadePessoas}`)
            .text(`   Total: ${totalFormatado}`)
            .moveDown(0.8);
        }

        doc.moveDown(1);

        // Resumo
        doc
          .fontSize(13)
          .font('Helvetica-Bold')
          .text('Resumo do Dia')
          .moveDown(0.5)
          .fontSize(11)
          .font('Helvetica')
          .text(`Eventos em análise: ${resumo.emAnalise}`)
          .text(`Eventos confirmados: ${resumo.confirmados}`)
          .text(`Eventos cancelados: ${resumo.cancelados}`)
          .moveDown(0.5);

        const totalFormatado = (resumo.totalNaoCancelados / 100).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(`Total (não cancelados): ${totalFormatado}`);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export function gerarAgendaCSV(eventos: EventoComCliente[]): string {
  const linhas = [
    'Horário,Cliente,Tipo,Local,Status,Quantidade de Pessoas,Total (R$)',
  ];

  for (const evento of eventos) {
    const localFormatado =
      evento.local === 'salao_eventos' ? 'Salão de Eventos' : 'Salão Principal';

    const total = (evento.totalEvento / 100).toFixed(2);

    const linha = [
      evento.horario,
      `"${evento.cliente.nomeCompleto}"`,
      `"${evento.tipoEvento}"`,
      localFormatado,
      evento.status.replace('_', ' '),
      evento.quantidadePessoas.toString(),
      total,
    ].join(',');

    linhas.push(linha);
  }

  return linhas.join('\n');
}

export async function enviarAgendaDiaria(
  eventos: EventoComCliente[],
  data: Date,
  destinatarios: string[]
): Promise<void> {
  if (destinatarios.length === 0) {
    throw new Error('Nenhum destinatário configurado para a agenda diária');
  }

  const dataFormatada = data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Calcula resumo
  const resumo: ResumoAgenda = {
    emAnalise: 0,
    confirmados: 0,
    cancelados: 0,
    totalNaoCancelados: 0,
  };

  for (const evento of eventos) {
    if (evento.status === 'em_analise') resumo.emAnalise++;
    else if (evento.status === 'confirmado') resumo.confirmados++;
    else if (evento.status === 'cancelado') resumo.cancelados++;

    if (evento.status !== 'cancelado') {
      resumo.totalNaoCancelados += evento.totalEvento;
    }
  }

  // Gera PDF e CSV
  const pdfBuffer = await gerarAgendaPDF(eventos, data, resumo);
  const csvContent = gerarAgendaCSV(eventos);

  // Monta mensagem
  let mensagem = `Agenda do dia ${dataFormatada}\n\n`;

  if (eventos.length === 0) {
    mensagem += 'Nenhum evento agendado para este dia.\n';
  } else {
    mensagem += 'Eventos:\n\n';

    for (const evento of eventos) {
      const localFormatado =
        evento.local === 'salao_eventos' ? 'Salão de Eventos' : 'Salão Principal';

      const totalFormatado = (evento.totalEvento / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });

      const statusFormatado = evento.status === 'cancelado' ? 'CANCELADO' : evento.status.replace('_', ' ');

      mensagem += `${evento.horario} - ${evento.cliente.nomeCompleto}\n`;
      mensagem += `  Tipo: ${evento.tipoEvento}\n`;
      mensagem += `  Local: ${localFormatado}\n`;
      mensagem += `  Status: ${statusFormatado}\n`;
      mensagem += `  Pessoas: ${evento.quantidadePessoas}\n`;
      mensagem += `  Total: ${totalFormatado}\n\n`;
    }

    mensagem += '\n--- Resumo ---\n';
    mensagem += `Eventos em análise: ${resumo.emAnalise}\n`;
    mensagem += `Eventos confirmados: ${resumo.confirmados}\n`;
    mensagem += `Eventos cancelados: ${resumo.cancelados}\n\n`;

    const totalFormatado = (resumo.totalNaoCancelados / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    mensagem += `Total (não cancelados): ${totalFormatado}\n`;
  }

  // Envia e-mail
  const transporter = createTransporter();
  const config = {
    fromName: process.env.EMAIL_FROM_NAME || 'Enoteca Decanter Santos',
    user: process.env.EMAIL_USER || '',
  };

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.user}>`,
    to: destinatarios.join(', '),
    subject: `Agenda do Dia - ${dataFormatada}`,
    text: mensagem,
    attachments: [
      {
        filename: `agenda-${dataFormatada.replace(/\//g, '-')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
      {
        filename: `agenda-${dataFormatada.replace(/\//g, '-')}.csv`,
        content: csvContent,
        contentType: 'text/csv',
      },
    ],
  });
}

