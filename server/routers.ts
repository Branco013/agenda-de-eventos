import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { gerarPropostaPDF } from "./pdfGenerator";
import { enviarPropostaEmail, enviarAtualizacaoEmail, enviarLembreteEmail } from "./emailService";
import { enviarAgendaDiaria } from "./agendaDiariaService";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  clientes: router({
    listar: protectedProcedure
      .input(z.object({ busca: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return await db.listarClientes(input?.busca);
      }),

    obter: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.obterClientePorId(input.id);
      }),

    criar: protectedProcedure
      .input(
        z.object({
          nomeCompleto: z.string().min(1, "Nome completo é obrigatório"),
          telefone: z.string().min(1, "Telefone é obrigatório"),
          email: z.string().email("E-mail inválido").optional().nullable(),
          endereco: z.string().optional().nullable(),
          empresa: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.criarCliente(input);
      }),

    atualizar: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          nomeCompleto: z.string().min(1, "Nome completo é obrigatório").optional(),
          telefone: z.string().min(1, "Telefone é obrigatório").optional(),
          email: z.string().email("E-mail inválido").optional().nullable(),
          endereco: z.string().optional().nullable(),
          empresa: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...dados } = input;
        return await db.atualizarCliente(id, dados);
      }),

    excluir: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.excluirCliente(input.id);
        return { success: true };
      }),
  }),

  menus: router({
    listar: protectedProcedure
      .input(z.object({ apenasAtivos: z.boolean().optional() }).optional())
      .query(async ({ input }) => {
        return await db.listarMenus(input?.apenasAtivos);
      }),

    obter: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.obterMenuPorId(input.id);
      }),

    criar: protectedProcedure
      .input(
        z.object({
          nome: z.string().min(1, "Nome é obrigatório"),
          valorPadraoPorPessoa: z.number().min(0, "Valor deve ser positivo"),
          descricao: z.string().optional().nullable(),
          ativo: z.boolean().default(true),
        })
      )
      .mutation(async ({ input }) => {
        return await db.criarMenu(input);
      }),

    atualizar: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          nome: z.string().min(1, "Nome é obrigatório").optional(),
          valorPadraoPorPessoa: z.number().min(0, "Valor deve ser positivo").optional(),
          descricao: z.string().optional().nullable(),
          ativo: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...dados } = input;
        return await db.atualizarMenu(id, dados);
      }),

    excluir: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.excluirMenu(input.id);
        return { success: true };
      }),
  }),

  eventos: router({
    listar: protectedProcedure
      .input(
        z.object({
          dataInicio: z.string().optional(),
          dataFim: z.string().optional(),
          status: z.string().optional(),
          local: z.string().optional(),
          clienteId: z.number().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        const filtros: any = {};
        if (input?.dataInicio) filtros.dataInicio = new Date(input.dataInicio);
        if (input?.dataFim) filtros.dataFim = new Date(input.dataFim);
        if (input?.status) filtros.status = input.status;
        if (input?.local) filtros.local = input.local;
        if (input?.clienteId) filtros.clienteId = input.clienteId;
        return await db.listarEventos(filtros);
      }),

    obter: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.obterEventoPorId(input.id);
      }),

    obterComDetalhes: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const evento = await db.obterEventoPorId(input.id);
        if (!evento) return null;

        const cliente = await db.obterClientePorId(evento.clienteId);
        const menu = await db.obterMenuPorId(evento.menuId);
        const pratosSnapshot = await db.obterSnapshotPratos(evento.id);
        const historicoEmails = await db.obterHistoricoEmailsPorEvento(evento.id);

        return {
          evento,
          cliente,
          menu,
          pratosSnapshot,
          historicoEmails,
        };
      }),

    criar: protectedProcedure
      .input(
        z.object({
          clienteId: z.number(),
          tipoEvento: z.string().min(1, "Tipo do evento é obrigatório"),
          local: z.enum(["salao_eventos", "salao_principal"]),
          quantidadePessoas: z.number().min(1, "Quantidade deve ser maior que zero"),
          data: z.string(),
          horario: z.string().regex(/^\d{2}:\d{2}$/, "Horário deve estar no formato HH:MM"),
          menuId: z.number(),
          status: z.enum(["em_analise", "confirmado", "cancelado"]).default("em_analise"),
          valorPorPessoaEvento: z.number().min(0),
          pacoteBebidasAtivo: z.boolean().default(false),
          valorPacoteBebidas: z.number().default(5000),
          observacoes: z.string().optional().nullable(),
          lembreteAtivo: z.boolean().default(true),
          vinhos: z.array(z.object({
            tipoVinho: z.string(),
            quantidade: z.number().min(1),
            valorGarrafa: z.number().min(0),
          })).optional().default([]),
        })
      )
      .mutation(async ({ input }) => {
        // Verifica conflito de agenda
        const dataEvento = new Date(input.data);
        const conflito = await db.verificarConflitoAgenda(
          dataEvento,
          input.horario,
          input.local
        );

        if (conflito) {
          const cliente = await db.obterClientePorId(conflito.clienteId);
          const dataFormatada = conflito.data.toLocaleDateString('pt-BR');
          const localFormatado = conflito.local === 'salao_eventos' ? 'Salão de Eventos' : 'Salão Principal';
          throw new Error(
            `Conflito de agenda: já existe um evento de ${cliente?.nomeCompleto || 'cliente desconhecido'} ` +
            `em ${dataFormatada} às ${conflito.horario} no ${localFormatado}`
          );
        }

        // Calcula os valores
        const subtotalMenu = input.valorPorPessoaEvento * input.quantidadePessoas;
        const subtotalBebidas = input.pacoteBebidasAtivo
          ? input.valorPacoteBebidas * input.quantidadePessoas
          : 0;
        const subtotalVinhos = await db.calcularSubtotalVinhos(input.vinhos || []);
        const subtotalSemTaxa = subtotalMenu + subtotalBebidas + subtotalVinhos;
        const taxaServico = Math.round(subtotalSemTaxa * 0.10); // 10%
        const totalEvento = subtotalSemTaxa + taxaServico;

        // Cria o evento
        const { vinhos, ...eventoData } = input;
        const evento = await db.criarEvento({
          ...eventoData,
          data: dataEvento,
          subtotalMenu,
          subtotalBebidas,
          subtotalVinhos,
          taxaServico,
          totalEvento,
        });

        // Adiciona os vinhos
        if (vinhos && vinhos.length > 0) {
          await db.adicionarVinhosEvento(evento.id, vinhos);
        }

        // Cria o snapshot dos pratos do menu
        await db.criarSnapshotPratos(evento.id, input.menuId);

        return evento;
      }),

    atualizar: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          clienteId: z.number().optional(),
          tipoEvento: z.string().min(1).optional(),
          local: z.enum(["salao_eventos", "salao_principal"]).optional(),
          quantidadePessoas: z.number().min(1).optional(),
          data: z.string().optional(),
          horario: z.string().regex(/^\d{2}:\d{2}$/).optional(),
          menuId: z.number().optional(),
          status: z.enum(["em_analise", "confirmado", "cancelado"]).optional(),
          valorPorPessoaEvento: z.number().min(0).optional(),
          pacoteBebidasAtivo: z.boolean().optional(),
          valorPacoteBebidas: z.number().optional(),
          observacoes: z.string().optional().nullable(),
          lembreteAtivo: z.boolean().optional(),
          recriarSnapshot: z.boolean().optional(),
          vinhos: z.array(z.object({
            tipoVinho: z.string(),
            quantidade: z.number().min(1),
            valorGarrafa: z.number().min(0),
          })).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, recriarSnapshot, vinhos, ...dados } = input;

        // Obtém o evento atual para calcular valores
        const eventoAtual = await db.obterEventoPorId(id);
        if (!eventoAtual) throw new Error("Evento não encontrado");

        // Verifica conflito de agenda se data, horário ou local foram alterados
        if (dados.data || dados.horario || dados.local) {
          const dataEvento = dados.data ? new Date(dados.data) : eventoAtual.data;
          const horarioEvento = dados.horario || eventoAtual.horario;
          const localEvento = dados.local || eventoAtual.local;

          const conflito = await db.verificarConflitoAgenda(
            dataEvento,
            horarioEvento,
            localEvento,
            id
          );

          if (conflito) {
            const cliente = await db.obterClientePorId(conflito.clienteId);
            const dataFormatada = conflito.data.toLocaleDateString('pt-BR');
            const localFormatado = conflito.local === 'salao_eventos' ? 'Salão de Eventos' : 'Salão Principal';
            throw new Error(
              `Conflito de agenda: já existe um evento de ${cliente?.nomeCompleto || 'cliente desconhecido'} ` +
              `em ${dataFormatada} às ${conflito.horario} no ${localFormatado}`
            );
          }
        }

        // Prepara os dados atualizados
        const dadosAtualizados: any = { ...dados };

        if (dados.data) {
          dadosAtualizados.data = new Date(dados.data);
        }

        // Recalcula os valores se necessário
        const valorPorPessoa = dados.valorPorPessoaEvento ?? eventoAtual.valorPorPessoaEvento;
        const quantidade = dados.quantidadePessoas ?? eventoAtual.quantidadePessoas;
        const pacoteAtivo = dados.pacoteBebidasAtivo ?? eventoAtual.pacoteBebidasAtivo;
        const valorPacote = dados.valorPacoteBebidas ?? eventoAtual.valorPacoteBebidas;

        dadosAtualizados.subtotalMenu = valorPorPessoa * quantidade;
        dadosAtualizados.subtotalBebidas = pacoteAtivo ? valorPacote * quantidade : 0;
        
        // Calcula subtotal de vinhos se fornecido
        const subtotalVinhos = vinhos ? await db.calcularSubtotalVinhos(vinhos) : eventoAtual.subtotalVinhos;
        dadosAtualizados.subtotalVinhos = subtotalVinhos;
        
        const subtotalSemTaxa = dadosAtualizados.subtotalMenu + dadosAtualizados.subtotalBebidas + subtotalVinhos;
        dadosAtualizados.taxaServico = Math.round(subtotalSemTaxa * 0.10); // 10%
        dadosAtualizados.totalEvento = subtotalSemTaxa + dadosAtualizados.taxaServico;

        // Atualiza o evento
        const eventoAtualizado = await db.atualizarEvento(id, dadosAtualizados);

        // Atualiza os vinhos se fornecido
        if (vinhos !== undefined) {
          await db.removerVinhosEvento(id);
          if (vinhos.length > 0) {
            await db.adicionarVinhosEvento(id, vinhos);
          }
        }

        // Recria o snapshot se o menu foi alterado e recriarSnapshot = true
        if (recriarSnapshot && dados.menuId) {
          await db.excluirSnapshotPratos(id);
          await db.criarSnapshotPratos(id, dados.menuId);
        }

        return eventoAtualizado;
      }),

    duplicar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const eventoOriginal = await db.obterEventoPorId(input.id);
        if (!eventoOriginal) throw new Error("Evento não encontrado");

        const { id, createdAt, updatedAt, ...dadosEvento } = eventoOriginal;

        // Cria o novo evento
        const novoEvento = await db.criarEvento({
          ...dadosEvento,
          status: "em_analise",
        });

        // Cria o snapshot dos pratos
        await db.criarSnapshotPratos(novoEvento.id, eventoOriginal.menuId);

        return novoEvento;
      }),

    excluir: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.excluirEvento(input.id);
        return { success: true };
      }),

    obterSnapshot: protectedProcedure
      .input(z.object({ eventoId: z.number() }))
      .query(async ({ input }) => {
        return await db.obterSnapshotPratos(input.eventoId);
      }),

    gerarPDF: protectedProcedure
      .input(z.object({ eventoId: z.number() }))
      .mutation(async ({ input }) => {
        const evento = await db.obterEventoPorId(input.eventoId);
        if (!evento) throw new Error("Evento não encontrado");

        const cliente = await db.obterClientePorId(evento.clienteId);
        if (!cliente) throw new Error("Cliente não encontrado");

        const menu = await db.obterMenuPorId(evento.menuId);
        if (!menu) throw new Error("Menu não encontrado");

        const pratosSnapshot = await db.obterSnapshotPratos(evento.id);

        const pdfBuffer = await gerarPropostaPDF({
          evento,
          cliente,
          menu,
          pratosSnapshot,
        });

        // Retorna o PDF como base64 para o cliente
        return {
          pdf: pdfBuffer.toString('base64'),
          filename: `proposta-evento-${evento.id}.pdf`,
        };
      }),

    enviarProposta: protectedProcedure
      .input(
        z.object({
          eventoId: z.number(),
          mensagemPersonalizada: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const evento = await db.obterEventoPorId(input.eventoId);
        if (!evento) throw new Error("Evento não encontrado");

        const cliente = await db.obterClientePorId(evento.clienteId);
        if (!cliente) throw new Error("Cliente não encontrado");

        if (!cliente.email) {
          throw new Error("Cliente não possui e-mail cadastrado");
        }

        const menu = await db.obterMenuPorId(evento.menuId);
        if (!menu) throw new Error("Menu não encontrado");

        const pratosSnapshot = await db.obterSnapshotPratos(evento.id);

        try {
          await enviarPropostaEmail({
            evento,
            cliente,
            menu,
            pratosSnapshot,
            mensagemPersonalizada: input.mensagemPersonalizada,
          });

          // Registra no histórico
          await db.registrarEnvioEmail({
            eventoId: evento.id,
            tipo: "proposta",
            destinatario: cliente.email,
            assunto: `Proposta de Evento - ${evento.data.toLocaleDateString('pt-BR')}`,
            conteudo: input.mensagemPersonalizada || "Proposta enviada",
            sucesso: true,
          });

          return { success: true };
        } catch (error: any) {
          // Registra erro no histórico
          await db.registrarEnvioEmail({
            eventoId: evento.id,
            tipo: "proposta",
            destinatario: cliente.email,
            assunto: `Proposta de Evento - ${evento.data.toLocaleDateString('pt-BR')}`,
            conteudo: input.mensagemPersonalizada || "Proposta enviada",
            sucesso: false,
            mensagemErro: error.message,
          });

          throw new Error(`Erro ao enviar e-mail: ${error.message}`);
        }
      }),

    enviarAtualizacao: protectedProcedure
      .input(
        z.object({
          eventoId: z.number(),
          mensagemPersonalizada: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const evento = await db.obterEventoPorId(input.eventoId);
        if (!evento) throw new Error("Evento não encontrado");

        const cliente = await db.obterClientePorId(evento.clienteId);
        if (!cliente) throw new Error("Cliente não encontrado");

        if (!cliente.email) {
          throw new Error("Cliente não possui e-mail cadastrado");
        }

        const menu = await db.obterMenuPorId(evento.menuId);
        if (!menu) throw new Error("Menu não encontrado");

        const pratosSnapshot = await db.obterSnapshotPratos(evento.id);

        try {
          await enviarAtualizacaoEmail({
            evento,
            cliente,
            menu,
            pratosSnapshot,
            mensagemPersonalizada: input.mensagemPersonalizada,
          });

          // Registra no histórico
          await db.registrarEnvioEmail({
            eventoId: evento.id,
            tipo: "atualizacao",
            destinatario: cliente.email,
            assunto: `Atualização de Reserva - ${evento.data.toLocaleDateString('pt-BR')}`,
            conteudo: input.mensagemPersonalizada || "Atualização enviada",
            sucesso: true,
          });

          return { success: true };
        } catch (error: any) {
          // Registra erro no histórico
          await db.registrarEnvioEmail({
            eventoId: evento.id,
            tipo: "atualizacao",
            destinatario: cliente.email,
            assunto: `Atualização de Reserva - ${evento.data.toLocaleDateString('pt-BR')}`,
            conteudo: input.mensagemPersonalizada || "Atualização enviada",
            sucesso: false,
            mensagemErro: error.message,
          });

          throw new Error(`Erro ao enviar e-mail: ${error.message}`);
        }
      }),

    obterHistoricoEmails: protectedProcedure
      .input(z.object({ eventoId: z.number() }))
      .query(async ({ input }) => {
        return await db.obterHistoricoEmailsPorEvento(input.eventoId);
      }),
  }),

  configuracoes: router({
    obter: protectedProcedure
      .input(z.object({ chave: z.string() }))
      .query(async ({ input }) => {
        return await db.obterConfiguracao(input.chave);
      }),

    obterTodas: protectedProcedure.query(async () => {
      const configs = await db.listarConfiguracoes();
      const result: Record<string, string> = {};
      configs.forEach((c) => {
        result[c.chave] = c.valor;
      });
      return result;
    }),

    salvar: protectedProcedure
      .input(
        z.object({
          chave: z.string(),
          valor: z.string(),
          descricao: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await db.salvarConfiguracao(input.chave, input.valor, input.descricao);
        return { success: true };
      }),

    salvarVarias: protectedProcedure
      .input(
        z.record(z.string(), z.string())
      )
      .mutation(async ({ input }) => {
        for (const [chave, valor] of Object.entries(input)) {
          if (typeof valor === 'string') {
            await db.salvarConfiguracao(chave, valor);
          }
        }
        return { success: true };
      }),
  }),

  agendaDiaria: router({
    enviar: protectedProcedure
      .input(
        z.object({
          data: z.string(),
          destinatarios: z.array(z.string().email()),
        })
      )
      .mutation(async ({ input }) => {
        const dataAlvo = new Date(input.data);
        
        // Busca eventos do dia
        const dataInicio = new Date(dataAlvo);
        dataInicio.setHours(0, 0, 0, 0);
        
        const dataFim = new Date(dataAlvo);
        dataFim.setHours(23, 59, 59, 999);

        const eventos = await db.listarEventos({
          dataInicio,
          dataFim,
        });

        // Busca dados dos clientes
        const eventosComCliente = await Promise.all(
          eventos.map(async (evento) => {
            const cliente = await db.obterClientePorId(evento.clienteId);
            return {
              ...evento,
              cliente: cliente!,
            };
          })
        );

        // Ordena por horário
        eventosComCliente.sort((a, b) => a.horario.localeCompare(b.horario));

        await enviarAgendaDiaria(eventosComCliente, dataAlvo, input.destinatarios);

        return { success: true, totalEventos: eventos.length };
      }),
  }),

  pratos: router({
    listarPorMenu: protectedProcedure
      .input(z.object({ menuId: z.number() }))
      .query(async ({ input }) => {
        return await db.listarPratosPorMenu(input.menuId);
      }),

    obter: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.obterPratoPorId(input.id);
      }),

    criar: protectedProcedure
      .input(
        z.object({
          menuId: z.number(),
          nome: z.string().min(1, "Nome é obrigatório"),
          descricao: z.string().optional().nullable(),
          etapa: z.enum(["couvert", "entrada", "principal", "sobremesa"]),
          ordem: z.number().default(0),
        })
      )
      .mutation(async ({ input }) => {
        return await db.criarPrato(input);
      }),

    atualizar: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          nome: z.string().min(1, "Nome é obrigatório").optional(),
          descricao: z.string().optional().nullable(),
          etapa: z.enum(["couvert", "entrada", "principal", "sobremesa"]).optional(),
          ordem: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...dados } = input;
        return await db.atualizarPrato(id, dados);
      }),

    excluir: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.excluirPrato(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

