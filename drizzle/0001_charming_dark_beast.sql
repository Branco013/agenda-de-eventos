CREATE TABLE `clientes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nomeCompleto` varchar(255) NOT NULL,
	`telefone` varchar(20) NOT NULL,
	`email` varchar(320),
	`endereco` text,
	`empresa` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clientes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `configuracoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chave` varchar(100) NOT NULL,
	`valor` text NOT NULL,
	`descricao` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `configuracoes_id` PRIMARY KEY(`id`),
	CONSTRAINT `configuracoes_chave_unique` UNIQUE(`chave`)
);
--> statement-breakpoint
CREATE TABLE `eventos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clienteId` int NOT NULL,
	`tipoEvento` varchar(255) NOT NULL,
	`local` enum('salao_eventos','salao_principal') NOT NULL,
	`quantidadePessoas` int NOT NULL,
	`data` timestamp NOT NULL,
	`horario` varchar(5) NOT NULL,
	`menuId` int NOT NULL,
	`status` enum('em_analise','confirmado','cancelado') NOT NULL DEFAULT 'em_analise',
	`valorPorPessoaEvento` int NOT NULL,
	`pacoteBebidasAtivo` boolean NOT NULL DEFAULT false,
	`valorPacoteBebidas` int NOT NULL DEFAULT 5000,
	`observacoes` text,
	`subtotalMenu` int NOT NULL,
	`subtotalBebidas` int NOT NULL,
	`totalEvento` int NOT NULL,
	`lembreteAtivo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `eventosPratosSnapshot` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventoId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`etapa` enum('couvert','entrada','principal','sobremesa') NOT NULL,
	`ordem` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eventosPratosSnapshot_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `historicoEmails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventoId` int NOT NULL,
	`tipo` enum('proposta','atualizacao','lembrete') NOT NULL,
	`destinatario` varchar(320) NOT NULL,
	`assunto` varchar(500) NOT NULL,
	`conteudo` text NOT NULL,
	`sucesso` boolean NOT NULL,
	`mensagemErro` text,
	`enviadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historicoEmails_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`valorPadraoPorPessoa` int NOT NULL,
	`descricao` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menus_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pratos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menuId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`etapa` enum('couvert','entrada','principal','sobremesa') NOT NULL,
	`ordem` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pratos_id` PRIMARY KEY(`id`)
);
