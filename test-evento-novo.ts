import { drizzle } from "drizzle-orm/mysql2";
import { eventos, eventosVinhos } from "./drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

async function criarEventoTeste() {
  // Criar evento
  const result = await db.insert(eventos).values({
    clienteId: 1,
    tipoEvento: "Jantar Corporativo",
    local: "salao_eventos",
    quantidadePessoas: 30,
    data: new Date("2025-11-15T19:00:00"),
    horario: "19:00",
    menuId: 1,
    status: "confirmado",
    valorPorPessoaEvento: 13500, // R$ 135,00
    pacoteBebidasAtivo: true,
    valorPacoteBebidas: 5000, // R$ 50,00
    subtotalMenu: 405000, // 30 * 135
    subtotalBebidas: 150000, // 30 * 50
    subtotalVinhos: 60000, // 2 garrafas de R$ 300
    taxaServico: 61500, // 10% de 615000
    totalEvento: 676500, // 615000 + 61500
    observacoes: "Evento teste com vinhos e taxa de serviço",
    lembreteAtivo: true,
  });

  const eventoId = Number(result[0].insertId);
  console.log("Evento criado com ID:", eventoId);

  // Adicionar vinhos
  await db.insert(eventosVinhos).values([
    {
      eventoId,
      tipoVinho: "Cabernet Sauvignon",
      quantidade: 2,
      valorGarrafa: 30000, // R$ 300,00
    },
  ]);

  console.log("Vinhos adicionados!");
  console.log("Evento de teste criado com sucesso!");
}

criarEventoTeste().catch(console.error);
