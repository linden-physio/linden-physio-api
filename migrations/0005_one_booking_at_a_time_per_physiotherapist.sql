-- Two physiotherapists can see two people at the same time. One physiotherapist can't.
-- btree_gist lets a gist index compare plain values like staff_id with =.
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT "no_overlap";--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "no_overlap" EXCLUDE USING gist ("staff_id" WITH =, tstzrange("starts_at", "ends_at") WITH &&);
