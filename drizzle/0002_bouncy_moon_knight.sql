CREATE TABLE `eventosVinhos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventoId` int NOT NULL,
	`tipoVinho` varchar(255) NOT NULL,
	`quantidade` int NOT NULL,
	`valorGarrafa` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventosVinhos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `eventos` ADD `subtotalVinhos` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `eventos` ADD `taxaServico` int DEFAULT 0 NOT NULL;