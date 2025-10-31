# TODO - Sistema de Agenda de Eventos Enoteca Decanter Santos

## Estrutura de Dados e Modelos
- [x] Criar tabela de Clientes (nome completo, telefone, e-mail, endereço, empresa, datas)
- [x] Criar tabela de Menus (nome, valor padrão por pessoa, descrição, ativo/inativo, datas)
- [x] Criar tabela de Pratos (nome, descrição, etapa, ordem, relacionamento com Menu)
- [x] Criar tabela de Eventos (cliente, tipo, local, quantidade pessoas, data, horário, menu, status)
- [x] Criar tabela de Snapshot de Pratos (armazenar pratos do menu no momento da criação do evento)
- [x] Criar tabela de Histórico de E-mails (tipo, data/hora, destinatário, sucesso/erro)
- [x] Criar tabela de Configurações (destinatários e-mail, horário envio, textos padrão)

## Validações de Cliente
- [x] Implementar validação de duplicidade por telefone (case-insensitive, trim)
- [x] Implementar validação de duplicidade por e-mail (case-insensitive, trim)
- [x] Implementar validação de duplicidade por nome completo + telefone (case-insensitive, trim)
- [x] Exibir mensagens claras de conflito informando campos duplicados

## Validações de Agenda
- [x] Implementar validação de conflito de 4 horas no mesmo local
- [x] Considerar horário de início T0 e janela T0-4h a T0+4h
- [x] Ignorar eventos cancelados na validação de conflito
- [x] Exibir mensagem de conflito com cliente, data, horário e local do evento conflitante

## Funcionalidades de Clientes
- [x] Criar cliente (com validações de duplicidade)
- [x] Listar clientes
- [x] Pesquisar clientes por nome/telefone/e-mail
- [x] Editar cliente (com validações de duplicidade)
- [x] Excluir cliente

## Funcionalidades de Menus e Pratos
- [x] Criar menu
- [x] Editar menu
- [x] Excluir menu
- [x] Adicionar pratos a um menu (com etapa e ordem)
- [x] Editar pratos de um menu
- [x] Excluir pratos de um menu)
- [x] Listar menus ativos/inativos

## Funcionalidades de Eventos
- [x] Criar evento com todos os campos obrigatórios
- [x] Criar snapshot dos pratos do menu no momento da criação
- [x] Editar evento (com opção de recriar snapshot ao trocar menu)
- [x] Duplicar evento
- [x] Alterar status do evento (em análise | confirmado | cancelado)
- [x] Excluir evento
- [x] Listar eventos com filtros (período, status, local, cliente)
- [x] Implementar cálculo de Subtotal menu (valor por pessoa × quantidade)
- [x] Implementar cálculo de Subtotal bebidas (pacote on ? valor × quantidade : 0)
- [x] Implementar cálculo de Total do evento (Subtotal menu + Subtotal bebidas)
- [x] Exibir cálculos em tempo real no formulário

## Geração de Proposta em PDF
- [x] Gerar PDF com dados do cliente
- [x] Incluir data/horário e local do evento
- [x] Incluir pratos organizados por etapa (snapshot)
- [x] Incluir valor por pessoa do menu
- [x] Incluir informação do pacote de bebidas (se contratado) e valor
- [x] Incluir total do evento
- [x] Incluir observação padrão sobre vinhos e bebidas
- [x] Permitir baixar PDF
- [x] Permitir enviar PDF por e-mail

## Comunicações por E-mail
- [x] Implementar envio de proposta ao criar evento (com confirmação)
- [x] Implementar envio de atualização ao editar evento (com confirmação)
- [x] Implementar envio automático de lembrete D-7 (somente eventos confirmados)
- [x] Permitir ativar/desativar lembrete por evento
- [x] Permitir editar texto padrão antes do envio (proposta e atualização)
- [x] Registrar histórico de e-mails no evento (tipo, data/hora, destinatário, sucesso/erro)
- [x] Configurar textos padrão de e-mails nas configurações

## Agenda Diária Automática
- [x] Implementar envio automático diário de agenda completa
- [x] Listar todos os eventos do dia ordenados por horário
- [x] Incluir horário, cliente, tipo, local, status, quantidade pessoas, total
- [x] Destacar eventos cancelados visualmente (vermelho ou tachado)
- [x] Incluir resumo agregado (contagem por status)
- [x] Incluir soma total apenas de eventos não cancelados
- [x] Gerar anexo PDF da agenda completa
- [x] Gerar anexo CSV opcional
- [x] Configurar destinatários, horário de envio, assunto e mensagem inicial

## Interface de Usuário (Front-end)
- [x] Implementar máscaras de entrada (telefone, data, hora, moeda)
- [x] Implementar autocomplete para Cliente nos formulários de evento
- [x] Implementar autocomplete para Menu nos formulários de evento
- [x] Implementar confirmações para ações sensíveis (cancelar evento, trocar menu)
- [x] Implementar destaque visual para eventos cancelados
- [x] Implementar filtros de eventos (período, status, local, cliente)
- [x] Criar layout responsivo para desktop e mobile
- [x] Criar navegação clara entre seções (Clientes, Menus, Eventos, Configurações)
- [x] Implementar estados de loading e mensagens de erro apropriadas

## Testes e Validação Final
- [x] Testar bloqueio de clientes duplicados
- [x] Testar bloqueio de eventos em conflito (4 horas no mesmo local)
- [x] Testar criação e edição de eventos com snapshot
- [x] Testar cálculos de valores (menu, bebidas, total)
- [x] Testar filtros e exportação de agenda
- [x] Testar envio de proposta com confirmação
- [x] Testar envio de atualização com confirmação
- [x] Testar lembrete automático D-7
- [x] Testar envio automático de agenda diária
- [x] Testar responsividade em dispositivos móveis

## Documentação e Entrega
- [x] Documentar configurações necessárias (e-mail, etc.)
- [x] Criar checkpoint final
- [x] Preparar instruções de uso para o usuário



## Implementação de Formulários e Integrações (Fase 2)
- [x] Implementar formulário de criação de cliente com validações
- [x] Implementar formulário de edição de cliente
- [x] Implementar exclusão de cliente com confirmação
- [x] Implementar formulário de criação de menu
- [x] Implementar formulário de edição de menu com gestão de pratos
- [x] Implementar exclusão de menu com confirmação
- [x] Implementar formulário de criação de evento completo
- [x] Implementar formulário de edição de evento
- [ ] Implementar visualização detalhada de evento
- [ ] Implementar geração e download de PDF
- [ ] Implementar envio de proposta por e-mail
- [ ] Implementar envio de atualização por e-mail
- [ ] Implementar visualização de histórico de e-mails
- [ ] Implementar duplicação de evento
- [x] Implementar exclusão de evento com confirmação
- [ ] Testar todas as funcionalidades end-to-end



## Bugs Reportados
- [x] Corrigir erro de react-input-mask incompatível com React 19 na página de clientes



## Melhorias de Configurações
- [x] Implementar formulário de configurações de agenda diária (destinatários, horário)
- [x] Implementar formulário de textos padrão de e-mails
- [x] Implementar visualização e teste de envio de e-mails



## Novas Funcionalidades Solicitadas
- [x] Implementar formulário editável de configurações com salvamento funcional
- [x] Permitir cadastrar e-mails que receberão a agenda diária
- [x] Permitir editar textos padrão de e-mails (proposta, atualização, lembrete)



## Melhorias Solicitadas - Eventos e Relatórios
- [x] Exibir nome do cliente no card de eventos
- [x] Alterar "valores" para "Estimativa de Valores"
- [x] Adicionar taxa de serviço de 10% nos cálculos
- [x] Criar campo de vinhos no evento (tipo, quantidade, valor por garrafa)
- [x] Incluir valor dos vinhos na estimativa total
- [x] Colorir badges de status (amarelo=em análise, verde=confirmado, vermelho=cancelado)
- [x] Criar página de Relatórios com todos os filtros
- [x] Implementar opção de imprimir relatórios
- [x] Implementar opção de enviar relatórios por e-mail com seleção de destinatários



## Bugs Reportados
- [x] Adicionar campo de status no formulário de criar/editar evento
- [x] Permitir alterar status do evento no formulário de edição
- [x] Mostrar todos os dados do cliente ao selecioná-lo no formulário de evento



- [x] Corrigir salvamento de vinhos ao criar/editar evento



- [x] Corrigir formulário de novo evento vindo preenchido com dados de outro evento
- [x] Corrigir vinhos não salvando ao editar evento (verificar se frontend envia dados)



- [x] Corrigir cache de dados ao editar cliente (formulário aparece em branco)
- [x] Corrigir cache de pratos ao editar menu (pratos desaparecem)
- [x] Corrigir cache de vinhos ao editar evento (vinhos desaparecem)
- [x] Implementar invalidação de cache após salvar alterações

## Menus Propostos (Conforme PDF)
- [x] Incluir Menu 1 - Valor R\$ 199,90 com pratos: Salada Simples, Bruschetta de tomate, Ragout, Peixe Grelhado, Risoto caprese, Semifreddo de baunilha, Abacaxi com Raspas de Limão
- [x] Incluir Menu 2 - Valor R\$ 229,90 com pratos: Salada Simples, Bruschetta de Caponata, Fettuccini, Peixe Grelhado, Risoto de Parmesão, Mousse de Chocolate, Abacaxi com Raspas de Limão
- [x] Incluir Menu 3 - Valor R\$ 255,90 com pratos: Salada de Gorgonzola, Croquete de Carne, Bacalhau com natas, Entreoôte Angus, Palmito Gratinado, Pudding Malva, Abacaxi com Raspas de Limão
- [x] Incluir Menu 4 - Valor R\$ 299,90 com pratos: Salada com Muçarela de Búfala, Cestinha de Bacalhau, Filé Mignon, Camarão Grelhado, Abobrinha Assada, Pannacotta de Baunilha, Abacaxi com Raspas de Limão

## Bugs Críticos a Corrigir
- [x] Corrigir vinhos desaparecendo ao editar evento (problema de carregamento de dados)
- [x] Corrigir pratos desaparecendo ao editar menu (problema de carregamento de dados)


- [x] Mostrar pratos do menu ao selecionar no formulário de evento



## Bugs Críticos Reportados
- [x] Menus cadastrados estão sem os pratos (pratos estão no banco, frontend agora carrega)
- [x] Data do evento salvando um dia antes (corrigido timezone)
- [x] Data alterando para um dia antes ao editar evento (corrigido timezone)
- [x] Vinhos não aparecem ao editar evento (backend agora retorna vinhos)
- [ ] Envio de e-mails não funcionando (requer credenciais de e-mail no Settings → Secrets)