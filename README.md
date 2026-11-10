# Linden Physio API

The server behind the booking page at lindenphysio.com. It works out the free times and takes bookings.

It needs Postgres on this computer, with two databases: `linden` for the server and `linden_test`
for the tests. Make the tables with `psql linden -f schema.sql`.

    createdb linden && createdb linden_test
    npm install
    npm start        # http://localhost:3000
    npm test
