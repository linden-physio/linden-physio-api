-- The bookings table as films 23 and 24 left it, read from the database by drizzle-kit pull.
-- Our own database already has it, so both steps only run where it's missing: on a new, empty database.
CREATE TABLE IF NOT EXISTS "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"service" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL
);
--> statement-breakpoint
-- No two bookings may overlap. Drizzle doesn't describe exclusion constraints, so this one is ours to keep.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'no_overlap') THEN
    ALTER TABLE "bookings" ADD CONSTRAINT "no_overlap" EXCLUDE USING gist (tstzrange("starts_at", "ends_at") WITH &&);
  END IF;
END $$;
