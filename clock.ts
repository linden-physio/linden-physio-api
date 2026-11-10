// Times cross the network as instants: a moment that is the same everywhere, written in UTC,
// like "2026-11-10T08:00:00.000Z". The clinic's opening hours are times on the clinic's wall.

// Sweden is UTC+1 in winter and UTC+2 in summer. The time zone knows which, and when it changes.
const zone = "Europe/Stockholm";
const offsetFormat = new Intl.DateTimeFormat("en-GB", { timeZone: zone, timeZoneName: "longOffset" });

// How far the clinic's clock is ahead of UTC at an instant, in minutes. "GMT+02:00" is 120.
function offsetAt(ms: number): number {
  const name = offsetFormat.formatToParts(ms).find((part) => part.type === "timeZoneName")!.value;
  const [, sign, hours, minutes] = name.match(/GMT([+-])(\d\d):(\d\d)/) ?? ["", "+", "00", "00"];
  return (sign === "-" ? -1 : 1) * (Number(hours) * 60 + Number(minutes));
}

// The instant of a wall time in the clinic, like 2026-11-10 at 09:00.
export function toInstant(date: string, time: string): string {
  const asIfUtc = Date.parse(date + "T" + time + "Z");
  // The offset at that wall time: guess with the offset at the UTC reading, then check once.
  const offset = offsetAt(asIfUtc - offsetAt(asIfUtc) * 60_000);
  return new Date(asIfUtc - offset * 60_000).toISOString();
}

// The clinic's wall time at an instant.
export function fromInstant(instant: string): { date: string; time: string } {
  const ms = Date.parse(instant);
  const wall = new Date(ms + offsetAt(ms) * 60_000).toISOString();
  return { date: wall.slice(0, 10), time: wall.slice(11, 16) };
}
