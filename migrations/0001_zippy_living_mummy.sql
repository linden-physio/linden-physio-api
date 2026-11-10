CREATE TABLE "opening_hours" (
	"weekday" integer PRIMARY KEY NOT NULL,
	"opens" time NOT NULL,
	"closes" time NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"minutes" integer NOT NULL,
	"price_sek" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
