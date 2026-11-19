/**
 * End-to-end tests. Each suite gets its own throwaway database and a production server, so
 * prisma/dev.db is never touched.
 *
 *   npm test                 both suites (builds first if there is no build yet)
 *   npm test -- workflow     one suite: "workflow" (empty installation) or "roles" (demo data)
 *   npm test -- --build      rebuild first (do this after changing code)
 */
import { ensureBuild, freshDatabase, startServer, summary } from "./harness";
import { rolesSuite } from "./roles";
import { workflowSuite } from "./workflow";

const SUITES = {
  workflow: { db: "test-workflow.db", port: 3301, seed: false, run: workflowSuite },
  roles: { db: "test-roles.db", port: 3302, seed: true, run: rolesSuite },
} as const;

async function main() {
  const args = process.argv.slice(2);
  const chosen = (Object.keys(SUITES) as (keyof typeof SUITES)[]).filter((name) => args.includes(name));
  ensureBuild(args.includes("--build"));

  for (const name of chosen.length ? chosen : (Object.keys(SUITES) as (keyof typeof SUITES)[])) {
    const suite = SUITES[name];
    console.log(`\n######## ${name} (database prisma/${suite.db}, port ${suite.port})`);
    const db = freshDatabase(suite.db, suite.seed);
    const server = await startServer(suite.db, suite.port);
    try {
      await suite.run(`http://localhost:${suite.port}`, db);
    } catch (error) {
      console.error(`\n${name} stopped early:`, error);
      process.exitCode = 1;
    } finally {
      server.kill();
      await db.$disconnect();
    }
  }
  if (summary() > 0) process.exitCode = 1;
}

main();
