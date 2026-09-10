import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { migrateActorSource } from "../module/migrate-actor.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const inputDir = process.argv[2]
  ?? "/home/ubuntu/.cursor/projects/workspace/uploads";
const outputDir = process.argv[3] ?? join(root, "actors-v14");

mkdirSync(outputDir, { recursive: true });

const names = {
  "2DU0gqQyY2HS1tFl": "fvtt-Actor-血之惡夢-2DU0gqQyY2HS1tFl.json",
  "E5PqHgIN96hJmtKK": "fvtt-Actor-蔚藍的月亮-E5PqHgIN96hJmtKK.json",
  "qwxZs7k9KDXVEtzd": "fvtt-Actor-白石-紬-qwxZs7k9KDXVEtzd.json",
  "UcnEUWRQJxgfrU9P": "fvtt-Actor-前田影歌-UcnEUWRQJxgfrU9P.json",
  "giYceW2efrETkyqC": "fvtt-Actor-神近-由女-giYceW2efrETkyqC.json",
  "938T9PQ6IAnxBy9p": "fvtt-Actor-曙光使者-(光)-魔劍-938T9PQ6IAnxBy9p.json"
};

for (const file of readdirSync(inputDir).filter((f) => f.endsWith(".json"))) {
  const source = JSON.parse(readFileSync(join(inputDir, file), "utf8"));
  const migrated = migrateActorSource(source);
  const id = migrated._id;
  const outName = names[id] ?? `fvtt-Actor-${migrated.name}-${id ?? "new"}.json`;
  writeFileSync(join(outputDir, outName), `${JSON.stringify(migrated, null, 2)}\n`);
  const checked = migrated.system.talent.table.flat().filter((c) => c.state).length;
  console.log(`${outName}: checked=${checked} array=${Array.isArray(migrated.system.talent.table)}`);
}
