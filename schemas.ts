import { z } from "zod";

// What crosses the border between the page and the server. Each schema checks data while the code
// runs, and z.infer turns it into a type for the checker, so one definition gives both.

export const FreeTimesQuery = z.object({
  date: z.iso.date(),
  service: z.string().min(1),
});

export const NewBooking = z.object({
  start: z.iso.datetime(),
  service: z.string().min(1),
  name: z.string().trim().min(1),
  email: z.email(),
});
export type NewBooking = z.infer<typeof NewBooking>;

// The id in DELETE /bookings/{id}: the long random one each booking is given.
export const BookingId = z.uuid();

export const FreeTimes = z.object({
  closed: z.boolean(),
  times: z.array(z.object({ startsAt: z.iso.datetime() })),
  nearest: z.object({ date: z.iso.date(), startsAt: z.iso.datetime() }).nullable(),
});
export type FreeTimes = z.infer<typeof FreeTimes>;
