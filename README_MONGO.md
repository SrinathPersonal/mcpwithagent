# MCP MongoDB Schema Extractor

This workspace includes a small TypeScript script and a minimal MCP-style server to connect to a MongoDB Atlas instance, sample documents, and infer a lightweight schema JSON.

Files added:
- `scripts/extract_schema.ts` — CLI script: connects, samples documents, writes `mongo_schema.json`.
- `mcp/server.ts` — Minimal Express server exposing `/schema` and `/data/:db/:coll` endpoints.
- `lib/mongo-utils.ts` — Helper functions that do the schema inference.

Setup & run

1. Install dependencies:

```bash
pnpm install
# or
npm install
```

2. Set your MongoDB connection string (use the URI you provided or store it in env):

PowerShell:

```powershell
$env:MONGODB_URI = "your-mongodb-uri-here"
pnpm run extract-schema
# or to start the MCP server
pnpm run start-mcp
```

Linux/macOS:

```bash
export MONGODB_URI='your-mongodb-uri-here'
pnpm run extract-schema
# or
pnpm run start-mcp
```

Exact MongoDB queries used

- To list databases: `db.admin().listDatabases()`
- To list collections in a database: `db.listCollections().toArray()`
- To sample documents from a collection:

```js
// Node/MongoDB driver code used in the scripts:
const docs = await db.collection(collectionName).find({}).limit(SAMPLE_SIZE).toArray();
```

Notes & security

- Do not commit your connection URI with credentials to source control. Keep it in environment variables or a secrets manager.
- The scripts are synchronous and intended for local usage. If you run this against a large database, increase sample sizes carefully.

If you'd like, I can run the extractor here in the workspace using your provided URI — but I need network access permission to reach Atlas from this environment. Alternatively, run `pnpm run extract-schema` locally and paste `mongo_schema.json` here; I will analyze and refine the inferred schema into a formal schema representation.
