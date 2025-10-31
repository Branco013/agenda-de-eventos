import { getDb } from "./server/db";
import { menus, pratos } from "./drizzle/schema";

async function addMenus() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    return;
  }

  try {
    // Menu 1
    const menu1 = await db.insert(menus).values({
      nome: "Menu 1",
      valorPadraoPorPessoa: 19990,
      descricao: "Menu sofisticado com pratos variados",
      ativo: true,
    });

    const menu1Id = (menu1 as any).insertId || 1;

    const menu1Pratos = [
      { nome: "Salada Simples", descricao: "Salada mix de folhas, tomate cereja, queijo parmesão e croutons", etapa: "ENTRADAS", ordem: 1 },
      { nome: "Bruschetta de tomate", descricao: "Fatias de pão caseiro, tomate conoassé temperado com manjericão e Parmesão", etapa: "ENTRADAS", ordem: 2 },
      { nome: "Ragout", descricao: "Ragout de carne com polenta cremosa", etapa: "PRATOS_PRINCIPAIS", ordem: 1 },
      { nome: "Peixe Grelhado", descricao: "Peixe grelhado com purê de mandioquinha, tomate cereja, azeitonas pretas e abobrinha", etapa: "PRATOS_PRINCIPAIS", ordem: 2 },
      { nome: "Risoto caprese", descricao: "Risoto de manjericão com tomate cereja assado e muçarela de búfala", etapa: "PRATOS_PRINCIPAIS", ordem: 3 },
      { nome: "Semifreddo de baunilha", descricao: "Semifreddo de baunilha com calda de chocolate meio amargo", etapa: "SOBREMESA", ordem: 1 },
      { nome: "Abacaxi com Raspas de Limão", descricao: "Abacaxi com Raspas de Limão", etapa: "SOBREMESA", ordem: 2 },
    ];

    for (const prato of menu1Pratos) {
      await db.insert(pratos).values({
        ...prato,
        menuId: menu1Id,
      });
    }

    console.log("Menu 1 adicionado");

  } catch (error) {
    console.error("Erro:", error);
  }
}

addMenus();
