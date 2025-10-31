export const ETAPAS_PRATOS = {
  couvert: 'Couvert',
  entrada: 'Entrada',
  principal: 'Prato Principal',
  sobremesa: 'Sobremesa',
} as const;

export const LOCAIS_EVENTO = {
  salao_eventos: 'Salão de Eventos',
  salao_principal: 'Salão Principal',
} as const;

export const STATUS_EVENTO = {
  em_analise: 'Em Análise',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
} as const;

export const VALOR_PADRAO_PACOTE_BEBIDAS = 5000; // R$ 50,00 em centavos

export function formatarMoeda(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function centavosParaReais(centavos: number): number {
  return centavos / 100;
}

export function reaisParaCentavos(reais: number): number {
  return Math.round(reais * 100);
}

