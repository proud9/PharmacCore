/**
 * End-to-end tests. Each suite gets its own throwaway Postgres database (parallax_test_<name>)
 * and a production server, so the dev database is never touched.
 *
 *   npm test                 both suites (builds first if there is no build yet)
 *   npm test -- workflow     one suite: "workflow" (empty installation) or "access" (demo data)
 *   npm test -- --build      rebuild first (do this after changing code)
 */
import { ensureBuild, freshDatabase, startServer, summary } from "./harness";
import { accessSuite } from "./access";
import { workflowSuite } from "./workflow";

const SUITES = {
  workflow: { port: 3301, seed: false, run: workflowSuite },
  access: { port: 3302, seed: true, run: accessSuite },
} as const;

async function main() {
  const args = process.argv.slice(2);
  const chosen = (Object.keys(SUITES) as (keyof typeof SUITES)[]).filter((name) => args.includes(name));
  ensureBuild(args.includes("--build"));

  for (const name of chosen.length ? chosen : (Object.keys(SUITES) as (keyof typeof SUITES)[])) {
    const suite = SUITES[name];
    console.log(`\n######## ${name} (database parallax_test_${name}, port ${suite.port})`);
    const { env, db } = await freshDatabase(name, suite.seed);
    const server = await startServer(env, suite.port);
    try {
      await suite.run(`http://localhost:${suite.port}`, db, env);
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
