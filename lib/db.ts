import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let sql: NeonQueryFunction<false, false> | undefined;

/** Neon's HTTP driver: same code runs in Node scripts, Next.js and Workers. */
export function db(): NeonQueryFunction<false, false> {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set (put it in .env.local)");
    sql = neon(url);
  }
  return sql;
}

/** pgvector accepts the text form '[0.1,0.2,...]'. */
export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}
