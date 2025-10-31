import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { gerarPropostaPDF } from "./pdfGenerator";
import { enviarPropostaEmail, enviarAtualizacaoEmail, enviarLembreteEmail } from "./emailService";
import { enviarAgendaDiaria } from "./agendaDiariaService";
import { StatusEvento } from "@shared/types";

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
      .input(z.object({ id: z.string() }))
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
          id: z.string(),
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
      .input(z.object({ id: z.string() }))
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
      .input(z.object({ id: z.string() }))
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
          id: z.string(),
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
      .input(z.object({ id: z.string() }))
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
          clienteId: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        const filtros: any = {};
        if (input?.dataInicio) filtros.dataInicio = new Date(input.dataInicio);
        if (input?.dataFim) filtros.dataFim = new Date(input.dataFim);
        if (input?.status) filtros.status = input.status as StatusEvento;
        if (input?.local) filtros.local = input.local;
        if (input?.clienteId) filtros.clienteId = input.clienteId;
        return await db.listarEventos(filtros);
      }),

    obter: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return await db.obterEventoPorId(input.id);
      }),

    obterComDetalhes: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const evento = await db.obterEventoPorId(input.id);
        if (!evento) return null;

        const cliente = await db.obterClientePorId(evento.clienteId);
        if (!cliente) throw new Error("Cliente não encontrado para o evento.");

        const menu = await db.obterMenuPorId(evento.menuId);
        if (!menu) throw new Error("Menu não encontrado para o evento.");

        const pratosSnapshot = await db.obterSnapshotPratos(evento.id);
        const historicoEmails = await db.obterHistoricoEmailsPorEvento(evento.id);
        const vinhos = await db.obterVinhosEvento(evento.id);

        return {
          evento,
          cliente,
          menu,
          pratosSnapshot,
          historicoEmails,
          vinhos,
        };
      }),

    criar: protectedProcedure
      .input(
        z.object({
          clienteId: z.string(),
          tipoEvento: z.string().min(1, "Tipo do evento é obrigatório"),
          local: z.enum(["salao_eventos", "salao_principal"]),
          quantidadePessoas: z.number().min(1, "Quantidade deve ser maior que zero"),
          data: z.string(),
          horario: z.string().regex(/^\d{2}:\d{2}$/, "Horário deve estar no formato HH:MM"),
          menuId: z.string(),
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

        const subtotalMenu = input.valorPorPessoaEvento * input.quantidadePessoas;
        const subtotalBebidas = input.pacoteBebidasAtivo
          ? input.valorPacoteBebidas * input.quantidadePessoas
          : 0;
        const subtotalVinhos = await db.calcularSubtotalVinhos(input.vinhos || []);
        const subtotalSemTaxa = subtotalMenu + subtotalBebidas + subtotalVinhos;
        const taxaServico = Math.round(subtotalSemTaxa * 0.10);
        const totalEvento = subtotalSemTaxa + taxaServico;

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

        if (vinhos && vinhos.length > 0) {
          await db.adicionarVinhosEvento(evento.id, vinhos);
        }

        await db.criarSnapshotPratos(evento.id, input.menuId);

        return evento;
      }),

    atualizar: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          clienteId: z.string().optional(),
          tipoEvento: z.string().min(1).optional(),
          local: z.enum(["salao_eventos", "salao_principal"]).optional(),
          quantidadePessoas: z.number().min(1).optional(),
          data: z.string().optional(),
          horario: z.string().regex(/^\d{2}:\d{2}$/).optional(),
          menuId: z.string().optional(),
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

        const eventoAtual = await db.obterEventoPorId(id);
        if (!eventoAtual) throw new Error("Evento não encontrado");

        if (dados.data || dados.horario || dados.local) {
          const dataEvento = dados.data ? new Date(dados.data) : eventoAtual.data;
          const horario = dados.horario || eventoAtual.horario;
          const local = dados.local || eventoAtual.local;
          const conflito = await db.verificarConflitoAgenda(dataEvento, horario, local, id);

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

        const quantidadePessoas = dados.quantidadePessoas || eventoAtual.quantidadePessoas;
        const valorPorPessoaEvento = dados.valorPorPessoaEvento || eventoAtual.valorPorPessoaEvento;
        const pacoteBebidasAtivo = dados.pacoteBebidasAtivo === undefined ? eventoAtual.pacoteBebidasAtivo : dados.pacoteBebidasAtivo;
        const valorPacoteBebidas = dados.valorPacoteBebidas || eventoAtual.valorPacoteBebidas;
        const vinhosAtuais = vinhos === undefined ? await db.obterVinhosEvento(id) : vinhos;

        const subtotalMenu = valorPorPessoaEvento * quantidadePessoas;
        const subtotalBebidas = pacoteBebidasAtivo ? valorPacoteBebidas * quantidadePessoas : 0;
        const subtotalVinhos = await db.calcularSubtotalVinhos(vinhosAtuais);
        const subtotalSemTaxa = subtotalMenu + subtotalBebidas + subtotalVinhos;
        const taxaServico = Math.round(subtotalSemTaxa * 0.10);
        const totalEvento = subtotalSemTaxa + taxaServico;

        const eventoData: any = {
          ...dados,
          subtotalMenu,
          subtotalBebidas,
          subtotalVinhos,
          taxaServico,
          totalEvento,
        };

        if (dados.data) {
          eventoData.data = new Date(dados.data);
        }

        const eventoAtualizado = await db.atualizarEvento(id, eventoData);

        if (vinhos !== undefined) {
          await db.excluirVinhosEvento(id);
          if (vinhos.length > 0) {
            await db.adicionarVinhosEvento(id, vinhos);
          }
        }

        if (recriarSnapshot && eventoAtualizado.menuId) {
          await db.excluirSnapshotPratos(id);
          await db.criarSnapshotPratos(id, eventoAtualizado.menuId);
        }

        return eventoAtualizado;
      }),

    excluir: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await db.excluirEvento(input.id);
        return { success: true };
      }),

    gerarProposta: protectedProcedure
      .input(z.object({ eventoId: z.string() }))
      .mutation(async ({ input }) => {
        const evento = await db.obterEventoPorId(input.eventoId);
        if (!evento) throw new Error("Evento não encontrado");

        const cliente = await db.obterClientePorId(evento.clienteId);
        if (!cliente) throw new Error("Cliente não encontrado");

        const menu = await db.obterMenuPorId(evento.menuId);
        if (!menu) throw new Error("Menu não encontrado");

        const pratosSnapshot = await db.obterSnapshotPratos(evento.id);
        const vinhos = await db.obterVinhosEvento(evento.id);

        const buffer = await gerarPropostaPDF({ evento, cliente, menu, pratosSnapshot, vinhos });
        return { pdf: buffer.toString("base64") };
      }),

    enviarProposta: protectedProcedure
      .input(z.object({ eventoId: z.string(), mensagem: z.string().optional() }))
      .mutation(async ({ input }) => {
        const evento = await db.obterEventoPorId(input.eventoId);
        if (!evento) throw new Error("Evento não encontrado");

        const cliente = await db.obterClientePorId(evento.clienteId);
        if (!cliente || !cliente.email) throw new Error("Cliente ou e-mail do cliente não encontrado");

        await enviarPropostaEmail(evento, cliente, input.mensagem);
        return { success: true };
      }),

    enviarAtualizacao: protectedProcedure
      .input(z.object({ eventoId: z.string(), mensagem: z.string().optional() }))
      .mutation(async ({ input }) => {
        const evento = await db.obterEventoPorId(input.eventoId);
        if (!evento) throw new Error("Evento não encontrado");

        const cliente = await db.obterClientePorId(evento.clienteId);
        if (!cliente || !cliente.email) throw new Error("Cliente ou e-mail do cliente não encontrado");

        await enviarAtualizacaoEmail(evento, cliente, input.mensagem);
        return { success: true };
      }),
  }),

  configuracoes: router({
    obter: protectedProcedure
      .input(z.object({ chave: z.string() }))
      .query(async ({ input }) => {
        return await db.obterConfiguracao(input.chave);
      }),

    atualizar: protectedProcedure
      .input(z.object({ chave: z.string(), valor: z.string(), descricao: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { chave, ...dados } = input;
        return await db.upsertConfiguracao(chave, dados);
      }),
  }),

  servicos: router({
    enviarAgendaDiaria: protectedProcedure
      .mutation(async () => {
        await enviarAgendaDiaria();
        return { success: true };
      }),

    enviarLembretes: protectedProcedure
      .mutation(async () => {
        const hoje = new Date();
        const dataLembrete = new Date(hoje.setDate(hoje.getDate() + 7)); // D-7
        const eventos = await db.obterEventosParaLembrete(dataLembrete);

        for (const evento of eventos) {
          const cliente = await db.obterClientePorId(evento.clienteId);
          if (cliente && cliente.email) {
            await enviarLembreteEmail(evento, cliente);
          }
        }

        return { success: true, count: eventos.length };
      }),
  }),
});

export type AppRouter = typeof appRouter;
