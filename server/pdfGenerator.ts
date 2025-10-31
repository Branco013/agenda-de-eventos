import PDFDocument from 'pdfkit';
import { Evento, Cliente, Menu, EventoPratoSnapshot } from '../drizzle/schema';

interface PropostaData {
  evento: Evento;
  cliente: Cliente;
  menu: Menu;
  pratosSnapshot: EventoPratoSnapshot[];
}

export function gerarPropostaPDF(data: PropostaData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Cabeçalho
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('Enoteca Decanter Santos', { align: 'center' })
        .fontSize(16)
        .text('Proposta de Evento', { align: 'center' })
        .moveDown(2);

      // Dados do Cliente
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Dados do Cliente')
        .moveDown(0.5);

      doc
        .fontSize(11)
        .font('Helvetica')
        .text(`Nome: ${data.cliente.nomeCompleto}`)
        .text(`Telefone: ${data.cliente.telefone}`);

      if (data.cliente.email) {
        doc.text(`E-mail: ${data.cliente.email}`);
      }

      if (data.cliente.endereco) {
        doc.text(`Endereço: ${data.cliente.endereco}`);
      }

      if (data.cliente.empresa) {
        doc.text(`Empresa: ${data.cliente.empresa}`);
      }

      doc.moveDown(1.5);

      // Dados do Evento
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Dados do Evento')
        .moveDown(0.5);

      const dataFormatada = data.evento.data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      const localFormatado =
        data.evento.local === 'salao_eventos' ? 'Salão de Eventos' : 'Salão Principal';

      doc
        .fontSize(11)
        .font('Helvetica')
        .text(`Data: ${dataFormatada}`)
        .text(`Horário: ${data.evento.horario}`)
        .text(`Local: ${localFormatado}`)
        .text(`Tipo de Evento: ${data.evento.tipoEvento}`)
        .text(`Quantidade de Pessoas: ${data.evento.quantidadePessoas}`)
        .moveDown(1.5);

      // Menu e Pratos
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(`Menu: ${data.menu.nome}`)
        .moveDown(0.5);

      // Organiza pratos por etapa
      const etapas = ['couvert', 'entrada', 'principal', 'sobremesa'] as const;
      const etapasNomes = {
        couvert: 'Couvert',
        entrada: 'Entrada',
        principal: 'Prato Principal',
        sobremesa: 'Sobremesa',
      };

      for (const etapa of etapas) {
        const pratosDaEtapa = data.pratosSnapshot.filter((p) => p.etapa === etapa);

        if (pratosDaEtapa.length > 0) {
          doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .text(etapasNomes[etapa])
            .moveDown(0.3);

          for (const prato of pratosDaEtapa) {
            doc
              .fontSize(11)
              .font('Helvetica-Bold')
              .text(`• ${prato.nome}`, { indent: 20 });

            if (prato.descricao) {
              doc
                .fontSize(10)
                .font('Helvetica')
                .text(prato.descricao, { indent: 30 })
                .moveDown(0.3);
            } else {
              doc.moveDown(0.3);
            }
          }

          doc.moveDown(0.5);
        }
      }

      doc.moveDown(1);

      // Valores
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Valores')
        .moveDown(0.5);

      const valorPorPessoaFormatado = (data.evento.valorPorPessoaEvento / 100).toLocaleString(
        'pt-BR',
        {
          style: 'currency',
          currency: 'BRL',
        }
      );

      const subtotalMenuFormatado = (data.evento.subtotalMenu / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });

      doc
        .fontSize(11)
        .font('Helvetica')
        .text(`Valor por pessoa (menu): ${valorPorPessoaFormatado}`)
        .text(`Subtotal menu: ${subtotalMenuFormatado}`);

      if (data.evento.pacoteBebidasAtivo) {
        const valorPacoteFormatado = (data.evento.valorPacoteBebidas / 100).toLocaleString(
          'pt-BR',
          {
            style: 'currency',
            currency: 'BRL',
          }
        );

        const subtotalBebidasFormatado = (data.evento.subtotalBebidas / 100).toLocaleString(
          'pt-BR',
          {
            style: 'currency',
            currency: 'BRL',
          }
        );

        doc
          .text(`Pacote de bebidas por pessoa: ${valorPacoteFormatado}`)
          .text(`Subtotal bebidas: ${subtotalBebidasFormatado}`);
      }

      doc.moveDown(0.5);

      const totalFormatado = (data.evento.totalEvento / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });

      doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .text(`Total do Evento: ${totalFormatado}`)
        .moveDown(1.5);

      // Observação padrão
      doc
        .fontSize(10)
        .font('Helvetica-Oblique')
        .text(
          'Os vinhos e as bebidas não estão incluídos no valor do menu, salvo se contratado o pacote de bebidas.',
          { align: 'justify' }
        );

      // Observações adicionais
      if (data.evento.observacoes) {
        doc.moveDown(1);
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('Observações:')
          .moveDown(0.3)
          .fontSize(10)
          .font('Helvetica')
          .text(data.evento.observacoes, { align: 'justify' });
      }

      // Rodapé
      doc
        .moveDown(2)
        .fontSize(9)
        .font('Helvetica')
        .text('Enoteca Decanter Santos', { align: 'center' })
        .text('Obrigado pela preferência!', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

