-- Until now the clinic had one physiotherapist, so every booking so far is with them: the first in the staff table.
UPDATE "bookings" SET "staff_id" = (SELECT min("id") FROM "staff") WHERE "staff_id" IS NULL;
