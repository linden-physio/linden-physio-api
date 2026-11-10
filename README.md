# Linden Physio API

The server behind the booking page at lindenphysio.com. It works out the free times, takes bookings and cancels them.

It needs Postgres, with two databases: one for the server and one for the tests. Their addresses go in
a file `.env`, which git ignores: copy `.env.example` to `.env` and fill it in. The tables are described
in schema.ts; `npm run migrate` brings the database up to date.

    cp .env.example .env
    npm install
    npm run migrate
    npm run seed
    npm start        # http://localhost:3000
    npm test

What the page and the server agree on is written down in openapi.yaml. Change that file first, in a pull
request, and then the code on both sides.
