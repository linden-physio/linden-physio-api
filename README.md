# Linden Physio API

The server behind the booking page at lindenphysio.com. It works out the free times and takes bookings.

It needs Postgres on this computer, with two databases: `linden` for the server and `linden_test`
for the tests. The tables are described in schema.ts; `npm run migrate` brings a database up to date.

    createdb linden && createdb linden_test
    npm install
    npm run migrate
    npm start        # http://localhost:3000
    npm test

What the page and the server agree on is written down in openapi.yaml. Change that file first, in a pull
request, and then the code on both sides.
