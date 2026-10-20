#!/usr/bin/env node
/**
 * Every table, view, function and serial sequence a migration creates in
 * `public` must be granted to the API roles in the same migration.
 *
 * Why: from 2026-10-30 Supabase stops auto-granting new objects in `public` to
 * anon, authenticated and service_role (and new functions to PUBLIC). An
 * object created without a GRANT is unreachable through supabase-js/PostgREST
 * — including for service_role, so a cron writing to a new table fails with
 * "permission denied" — and a helper function used inside an RLS policy makes
 * every query against that table fail. Local `supabase db reset` and preview
 * branches replay migrations, so they lose the grants too.
 * https://github.com/orgs/supabase/discussions/45329
 *
 * A file passes when, for each object it creates, it also has a
 * `GRANT ... ON [TABLE|FUNCTION|SEQUENCE] <name>` (or `... ON ALL TABLES|
 * FUNCTIONS|ROUTINES|SEQUENCES IN SCHEMA public`). Skipped automatically:
 *   - trigger functions (`returns trigger` / `returns event_trigger`)
 *   - `create or replace` of a function or view an earlier migration created
 *     (replacing keeps the existing ACL), unless this file drops it first
 *   - objects in any schema other than public
 * Tables with serial/bigserial/smallserial columns also need a sequence grant
 * (`on sequence ...` or `on all sequences in schema public`); identity
 * columns don't.
 *
 * An object that should NOT be reachable through the API opts out with a
 * comment naming it anywhere in the file:
 *   -- api-grant-none: <name> <why>
 *
 * Only migrations after CUTOFF are checked; everything before is covered by
 * the catch-up migration with that version, which replays production's grants.
 *
 * Usage: node scripts/check-migration-grants.mjs [--all]
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "supabase",
  "migrations"
);
const CUTOFF = "20261020120000"; // the catch-up migration's version

/** Strip dollar-quoted bodies, string literals and comments. */
export function stripSql(sql) {
  return sql
    .replace(/\$([A-Za-z_]*)\$[\s\S]*?\$\1\$/g, " $body$ ")
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
}

const NAME = String.raw`((?:"[^"]+"|[\w$]+)(?:\s*\.\s*(?:"[^"]+"|[\w$]+))?)`;

/** Returns [schema, name] lowercased, defaulting the schema to public. */
function splitName(qualified) {
  const parts = qualified
    .split(/\s*\.\s*/)
    .map((p) => (p.startsWith('"') ? p.slice(1, -1) : p.toLowerCase()));
  return parts.length === 2 ? parts : ["public", parts[0]];
}

const CREATE_RE = new RegExp(
  String.raw`^\s*create\s+(or\s+replace\s+)?(?:(?:global\s+|local\s+)?(temp|temporary|unlogged)\s+)?` +
    String.raw`(table|view|materialized\s+view|recursive\s+view|function|procedure|sequence)\s+` +
    String.raw`(?:if\s+not\s+exists\s+)?${NAME}`,
  "i"
);
const DROP_RE = new RegExp(
  String.raw`^\s*drop\s+(table|view|materialized\s+view|function|procedure|sequence)\s+(?:if\s+exists\s+)?${NAME}`,
  "i"
);
const GRANT_RE = new RegExp(
  String.raw`^\s*grant\s+[\s\S]*?\bon\s+(?:(table|function|procedure|routine|sequence)\s+)?${NAME}`,
  "i"
);
const GRANT_ALL_RE =
  /^\s*grant\s+[\s\S]*?\bon\s+all\s+(tables|functions|routines|procedures|sequences)\s+in\s+schema\s+[\s\S]*?\bpublic\b/i;

const kindOf = (word) => {
  const w = word.toLowerCase().replace(/\s+/g, " ");
  if (w === "function" || w === "procedure" || w === "routine") return "function";
  if (w === "sequence") return "sequence";
  return "table"; // tables, views and materialized views share GRANT ... ON TABLE
};

/** Names of public functions and views created by `sql` (for the replace-keeps-ACL rule). */
export function createdNames(sql) {
  const out = new Set();
  for (const stmt of stripSql(sql).split(";")) {
    const m = stmt.match(CREATE_RE);
    if (!m || m[2]) continue;
    const [schema, name] = splitName(m[4]);
    if (schema === "public") out.add(`${kindOf(m[3])}:${name}`);
  }
  return out;
}

/**
 * Returns the objects in `sql` that need a grant and don't have one, as
 * strings like "table foo" or "sequence for table foo (serial column)".
 * `earlier` is the set createdNames() found in previous migrations.
 */
export function findUngranted(sql, earlier = new Set()) {
  const optOuts = new Set(
    [...sql.matchAll(/--\s*api-grant-none:\s*([\w."$]+)/gi)].map((m) => splitName(m[1])[1])
  );
  const statements = stripSql(sql).split(";");

  const needs = new Map(); // "kind:name" -> label
  const dropped = new Set();
  const granted = new Set();
  const grantedAll = new Set();
  const serialTables = [];

  for (const stmt of statements) {
    const drop = stmt.match(DROP_RE);
    if (drop) {
      const [schema, name] = splitName(drop[2]);
      if (schema === "public") dropped.add(`${kindOf(drop[1])}:${name}`);
      continue;
    }

    const create = stmt.match(CREATE_RE);
    if (create && !create[2]) {
      const [schema, name] = splitName(create[4]);
      if (schema !== "public") continue;
      const kind = kindOf(create[3]);
      const key = `${kind}:${name}`;
      if (kind === "function" && /\breturns\s+(event_)?trigger\b/i.test(stmt)) continue;
      if (create[1] && earlier.has(key) && !dropped.has(key)) continue;
      needs.set(key, `${create[3].toLowerCase().replace(/\s+/g, " ")} ${name}`);
      if (/^\s*create\s+(?:\w+\s+)*table\b/i.test(stmt) && /\b(small|big)?serial\b/i.test(stmt)) {
        serialTables.push(name);
      }
      continue;
    }

    const all = stmt.match(GRANT_ALL_RE);
    if (all) {
      grantedAll.add(kindOf(all[1].replace(/s$/i, "")));
      continue;
    }
    const grant = stmt.match(GRANT_RE);
    if (grant) {
      const [schema, name] = splitName(grant[2]);
      if (schema !== "public") continue;
      const kind = grant[1] ? kindOf(grant[1]) : "table";
      granted.add(`${kind}:${name}`);
    }
  }

  const missing = [];
  for (const [key, label] of needs) {
    const [kind, name] = key.split(":");
    if (optOuts.has(name) || grantedAll.has(kind) || granted.has(key)) continue;
    // `grant execute on name` without the FUNCTION keyword is invalid SQL, but
    // `grant select on name` covers a view or table either way.
    missing.push(label);
  }
  const sequenceGranted =
    grantedAll.has("sequence") || [...granted].some((k) => k.startsWith("sequence:"));
  for (const table of serialTables) {
    if (!sequenceGranted && !optOuts.has(table)) {
      missing.push(`sequence for table ${table} (serial column)`);
    }
  }
  return missing;
}

function main() {
  const checkAll = process.argv.includes("--all");
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const earlier = new Set();
  const failures = [];
  let checked = 0;
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    const version = file.split("_")[0];
    if (checkAll || version > CUTOFF) {
      checked++;
      const missing = findUngranted(sql, earlier);
      if (missing.length) failures.push({ file, missing });
    }
    for (const name of createdNames(sql)) earlier.add(name);
  }

  if (failures.length) {
    console.error("Migrations create objects in public without granting them to the API roles:\n");
    for (const { file, missing } of failures) {
      console.error(`  ${file}`);
      for (const m of missing) console.error(`    - ${m}`);
    }
    console.error(
      "\nAdd grants in the same migration, e.g.\n" +
        "  grant select on public.<table> to anon;\n" +
        "  grant select, insert, update, delete on public.<table> to authenticated, service_role;\n" +
        "  grant execute on function public.<fn>(<args>) to authenticated, service_role;\n" +
        "  grant usage, select on sequence public.<table>_id_seq to authenticated, service_role;\n" +
        "Grant anon only what signed-out users really need. If an object must stay\n" +
        "unreachable through the API, say so in the file:\n" +
        "  -- api-grant-none: <name> <why>"
    );
    process.exit(1);
  }
  console.log(`check-migration-grants: ${checked} migration(s) after ${CUTOFF} checked, all granted.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
