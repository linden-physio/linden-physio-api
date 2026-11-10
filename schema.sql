-- The bookings table. Typed into psql by hand in film 23 and changed by hand in film 24; kept here so
-- that every copy of the database can be made the same way.
CREATE TABLE bookings (
  id serial PRIMARY KEY,
  -- Instants. Postgres stores them in UTC and shows them in the session's time zone.
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  service text NOT NULL,
  name text NOT NULL,
  email text NOT NULL
);

-- No two bookings may overlap. Added in film 23, after two bookings for the same time both got in.
ALTER TABLE bookings ADD CONSTRAINT no_overlap EXCLUDE USING gist (tstzrange(starts_at, ends_at) WITH &&);
