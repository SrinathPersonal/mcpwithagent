import fs from "fs";
import path from "path";
import { inferSchemas } from "../lib/mongo-utils";

async function main() {
  const uri = process.env.MONGODB_URI || process.argv[2];
  if (!uri) {
    console.error("Please provide MONGODB_URI via env or as first arg.");
    process.exit(1);
  }
  const sampleSize = Number(process.env.SAMPLE_SIZE || process.argv[3] || 100);
  console.log("Connecting to:", uri);
  console.log(`Sample size: ${sampleSize}`);
  const schemas = await inferSchemas(uri, sampleSize);
  const out = { generatedAt: new Date().toISOString(), schemas };
  const outPath = path.join(process.cwd(), "mongo_schema.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log(`Wrote schema file to ${outPath}`);
  for (const s of schemas) {
    console.log(`DB: ${s.dbName}  Coll: ${s.collectionName}  Samples: ${s.sampleCount}  Fields: ${Object.keys(s.fields).length}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
