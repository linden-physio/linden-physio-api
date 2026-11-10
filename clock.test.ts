import { test } from "node:test";
import assert from "node:assert/strict";
import { toInstant, fromInstant } from "./clock.ts";

test("09:00 in the clinic is 08:00 UTC in winter", () => {
  assert.equal(toInstant("2026-11-10", "09:00"), "2026-11-10T08:00:00.000Z");
});

test("09:00 in the clinic is 07:00 UTC in the week the clocks go forward", () => {
  // Sweden's clocks go forward on Sunday 28 March 2027.
  assert.equal(toInstant("2027-03-26", "09:00"), "2027-03-26T08:00:00.000Z");
  assert.equal(toInstant("2027-03-30", "09:00"), "2027-03-30T07:00:00.000Z");
});

test("an instant reads back as the same wall time, either side of the change", () => {
  for (const date of ["2027-03-26", "2027-03-30", "2027-10-29", "2027-11-01"]) {
    assert.deepEqual(fromInstant(toInstant(date, "09:00")), { date, time: "09:00" });
  }
});
