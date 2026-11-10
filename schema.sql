-- The bookings table. Typed into psql by hand in film 23; kept here so that every copy of the
-- database can be made the same way.
CREATE TABLE bookings (
  id serial PRIMARY KEY,
  starts_at timestamp NOT NULL,
  ends_at timestamp NOT NULL,
  service text NOT NULL,
  name text NOT NULL,
  email text NOT NULL
);
