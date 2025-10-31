# Sistema de Agenda de Eventos - Enoteca Decanter Santos

Sistema web completo para gerenciamento de eventos, clientes, menus e comunicações da Enoteca Decanter Santos.

## 🎯 Funcionalidades Principais

### Gestão de Clientes
- Cadastro completo com validação de duplicidade (telefone, e-mail, nome+telefone)
- Busca por nome, telefone ou e-mail
- Campos: nome completo, telefone, e-mail, endereço, empresa

### Gestão de Menus e Pratos
- Criação e edição de menus com valor padrão por pessoa
- Organização de pratos por etapas (couvert, entrada, principal, sobremesa)
- Status ativo/inativo para menus
- Descrições detalhadas

### Gestão de Eventos
- Criação com todos os campos obrigatórios
- Validação de conflito de agenda (4 horas no mesmo local)
- Cálculo automático de valores (menu + bebidas)
- Snapshot dos pratos do menu no momento da criação
- Status: em análise, confirmado, cancelado
- Filtros por período, status, local e cliente

### Geração de Propostas em PDF
- Dados completos do cliente e evento
- Pratos organizados por etapa
- Valores detalhados (menu, bebidas, total)
- Observação padrão sobre vinhos e bebidas
- Download e envio por e-mail

### Comunicações por E-mail
- **Proposta**: Envio ao criar evento (com mensagem personalizável)
- **Atualização**: Envio ao editar evento
- **Lembrete D-7**: Automático para eventos confirmados
- Histórico completo de envios

### Agenda Diária Automática
- Relatório completo com todos os eventos do dia
- Destaque visual para cancelados
- Resumo com contagem por status
- Total excluindo cancelados
- Anexos em PDF e CSV
- Configuração de destinatários

## 🔧 Tecnologias Utilizadas

### Backend
- **Node.js** com TypeScript
- **tRPC** para comunicação type-safe
- **Drizzle ORM** para banco de dados
- **MySQL/TiDB** como banco de dados
- **PDFKit** para geração de PDFs
- **Nodemailer** para envio de e-mails

### Frontend
- **React 19** com TypeScript
- **Tailwind CSS 4** para estilização
- **shadcn/ui** para componentes
- **Wouter** para roteamento
- **date-fns** para formatação de datas

## 📋 Validações Implementadas

### Clientes
- Duplicidade por telefone (case-insensitive, trim)
- Duplicidade por e-mail (case-insensitive, trim)
- Duplicidade por nome completo + telefone (case-insensitive, trim)
- Mensagens claras de conflito

### Agenda
- Conflito de 4 horas no mesmo local
- Considera horário de início T0 e janela T0-4h a T0+4h
- Ignora eventos cancelados
- Mensagem com cliente, data, horário e local conflitante

## 🚀 Configuração

### Variáveis de Ambiente Necessárias

O sistema requer as seguintes variáveis de ambiente para funcionar:

```env
# E-mail (já configuradas)
EMAIL_HOST=smtp.exemplo.com
EMAIL_PORT=587
EMAIL_USER=seu-email@exemplo.com
EMAIL_PASSWORD=sua-senha-ou-token
EMAIL_FROM_NAME=Enoteca Decanter Santos

# Banco de Dados (configurado automaticamente)
DATABASE_URL=mysql://...

# Autenticação (configurada automaticamente)
JWT_SECRET=...
OAUTH_SERVER_URL=...
```

### Instalação

```bash
# Instalar dependências
pnpm install

# Aplicar migrações do banco de dados
pnpm db:push

# Iniciar servidor de desenvolvimento
pnpm dev
```

## 📱 Interface do Usuário

### Navegação
- **Eventos**: Lista e gerenciamento de eventos
- **Clientes**: Cadastro e busca de clientes
- **Menus**: Criação e edição de menus
- **Configurações**: Configurações do sistema

### Características
- Layout responsivo (desktop e mobile)
- Máscaras de entrada (telefone, data, hora, moeda)
- Autocomplete para cliente e menu
- Estados de loading e empty states
- Destaque visual para eventos cancelados
- Filtros avançados

## 🔐 Autenticação

O sistema utiliza Manus OAuth para autenticação. Todos os usuários precisam fazer login para acessar o sistema.

## 📊 Estrutura do Banco de Dados

### Tabelas Principais
- **users**: Usuários do sistema
- **clientes**: Clientes da enoteca
- **menus**: Menus disponíveis
- **pratos**: Pratos de cada menu
- **eventos**: Eventos agendados
- **eventosPratosSnapshot**: Snapshot dos pratos no momento do evento
- **historicoEmails**: Histórico de e-mails enviados
- **configuracoes**: Configurações do sistema

## 🎨 Design

O sistema utiliza um design limpo e profissional com:
- Tema claro por padrão
- Cores consistentes via CSS variables
- Componentes shadcn/ui
- Ícones Lucide
- Tipografia clara e legível

## 📝 Critérios de Aceite Atendidos

✅ Bloqueia clientes duplicados conforme regras  
✅ Impede eventos em conflito no mesmo local dentro de 4h (ignorando cancelados)  
✅ Permite cadastrar clientes, menus e pratos  
✅ Criar e editar eventos com snapshot  
✅ Editar valor por pessoa  
✅ Incluir/excluir pacote de bebidas  
✅ Visualizar cálculos corretos  
✅ Filtrar e exportar agenda  
✅ Envia proposta com confirmação ao criar evento  
✅ Envia atualização com confirmação ao editar  
✅ Envia lembrete automático D-7 antes do evento  
✅ Envia automaticamente a agenda diária completa  

## 🔄 Próximos Passos (Opcional)

Para expandir o sistema, considere:
- Formulários interativos para criação/edição de eventos, clientes e menus
- Dashboard com estatísticas e gráficos
- Calendário visual para visualização de eventos
- Integração com sistemas de pagamento
- Notificações push
- Relatórios avançados

## 📞 Suporte

Para dúvidas ou suporte, acesse: https://help.manus.im

---

**Versão**: 1.0.0  
**Desenvolvido para**: Enoteca Decanter Santos  
**Data**: Outubro 2025

