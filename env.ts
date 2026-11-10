// Settings that differ between this computer, the tests and production: where the database is, and
// which pages may read our answers. They come from the environment. On this computer Node reads them
// from the file .env, which git ignores; in production the host sets them.
export function setting(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(name + " isn't set. Copy .env.example to .env and fill it in.");
  return value;
}
