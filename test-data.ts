import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

async function seedData() {
  console.log("Adicionando dados de teste...");

  // Criar clientes
  const clientes = await db.insert(schema.clientes).values([
    {
      nomeCompleto: "João da Silva",
      telefone: "(13) 99999-1111",
      email: "joao@exemplo.com",
      endereco: "Rua das Flores, 123",
      empresa: "Empresa ABC",
    },
    {
      nomeCompleto: "Maria Santos",
      telefone: "(13) 98888-2222",
      email: "maria@exemplo.com",
      endereco: "Av. Principal, 456",
      empresa: null,
    },
  ]);

  console.log("✅ Clientes criados");

  // Criar menus
  const menus = await db.insert(schema.menus).values([
    {
      nome: "Menu Executivo",
      valorPadraoPorPessoa: 8500, // R$ 85,00
      descricao: "Menu completo para eventos corporativos",
      ativo: true,
    },
    {
      nome: "Menu Premium",
      valorPadraoPorPessoa: 12000, // R$ 120,00
      descricao: "Menu sofisticado com pratos especiais",
      ativo: true,
    },
  ]);

  console.log("✅ Menus criados");

  // Criar pratos para Menu Executivo (assumindo ID 1)
  await db.insert(schema.pratos).values([
    {
      menuId: 1,
      nome: "Pão de Alho",
      descricao: "Pão francês com manteiga de alho",
      etapa: "couvert",
      ordem: 1,
    },
    {
      menuId: 1,
      nome: "Salada Caesar",
      descricao: "Alface romana, croutons e molho caesar",
      etapa: "entrada",
      ordem: 1,
    },
    {
      menuId: 1,
      nome: "Filé Mignon ao Molho Madeira",
      descricao: "Filé mignon grelhado com molho madeira e batatas",
      etapa: "principal",
      ordem: 1,
    },
    {
      menuId: 1,
      nome: "Petit Gateau",
      descricao: "Bolinho de chocolate com sorvete de baunilha",
      etapa: "sobremesa",
      ordem: 1,
    },
  ]);

  console.log("✅ Pratos criados");

  // Criar um evento de exemplo
  await db.insert(schema.eventos).values({
    clienteId: 1,
    menuId: 1,
    tipoEvento: "Jantar Corporativo",
    data: new Date("2025-11-15"),
    horario: "19:00",
    local: "salao_eventos",
    quantidadePessoas: 50,
    valorPorPessoaEvento: 8500,
    subtotalMenu: 425000, // 50 * 8500
    pacoteBebidasAtivo: true,
    valorPacoteBebidas: 5000, // R$ 50,00
    subtotalBebidas: 250000, // 50 * 5000
    totalEvento: 675000, // 425000 + 250000
    status: "em_analise",
    observacoes: "Cliente solicitou menu vegetariano para 5 pessoas",
    lembreteAtivo: true,
  });

  console.log("✅ Evento criado");

  console.log("\n🎉 Dados de teste adicionados com sucesso!");
}

seedData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Erro ao adicionar dados:", error);
    process.exit(1);
  });
