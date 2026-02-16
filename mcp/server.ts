import "dotenv/config";
import express from "express";
import { MongoClient } from "mongodb";
import { inferSchemas, CollectionSchema } from "../lib/mongo-utils";
import fs from "fs";
import path from "path";
import { ollama } from "ollama-ai-provider";
import { generateObject } from "ai";
import { z as schemaDef } from "zod";

const app = express();
app.use(express.json());
const PORT = Number(process.env.PORT || 4000);
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.warn("MONGODB_URI not set. Server will start but database operations will fail.");
}

const SCHEMA_PATH = path.join(process.cwd(), "mongo_schema.json");
let client: MongoClient | null = null;

async function getClient() {
  if (!uri) throw new Error("MONGODB_URI not set");
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client;
}

async function getOrUpdateSchema() {
  let shouldUpdate = false;
  if (!fs.existsSync(SCHEMA_PATH)) {
    shouldUpdate = true;
  } else {
    try {
      const stats = fs.statSync(SCHEMA_PATH);
      const mtime = stats.mtime.getTime();
      const now = new Date().getTime();
      // Check if older than 24 hours (86400000 ms)
      if (now - mtime > 24 * 60 * 60 * 1000) {
        shouldUpdate = true;
      }
    } catch (e) {
      shouldUpdate = true;
    }
  }

  if (shouldUpdate && uri) {
    try {
      console.log("Updating MongoDB schema cache...");
      const schemas = await inferSchemas(uri, 100);
      const out = { generatedAt: new Date().toISOString(), schemas };
      fs.writeFileSync(SCHEMA_PATH, JSON.stringify(out, null, 2), "utf8");
      return schemas;
    } catch (err) {
      console.error("Failed to update schema cache:", err);
      if (fs.existsSync(SCHEMA_PATH)) {
        const content = fs.readFileSync(SCHEMA_PATH, "utf8");
        return JSON.parse(content).schemas as CollectionSchema[];
      }
      throw err;
    }
  }

  if (fs.existsSync(SCHEMA_PATH)) {
    const content = fs.readFileSync(SCHEMA_PATH, "utf8");
    return JSON.parse(content).schemas as CollectionSchema[];
  }

  if (!uri) throw new Error("MONGODB_URI not set and no schema cache found.");

  const schemas = await inferSchemas(uri, 100);
  const out = { generatedAt: new Date().toISOString(), schemas };
  fs.writeFileSync(SCHEMA_PATH, JSON.stringify(out, null, 2), "utf8");
  return schemas;
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/schema", async (_req, res) => {
  try {
    const schemas = await getOrUpdateSchema();
    res.json({ generatedAt: new Date().toISOString(), schemas });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.post("/ask", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const schemas = await getOrUpdateSchema();

    // Use Vercel AI SDK with Ollama provider
    const modelName = process.env.OLLAMA_MODEL || 'llama3.2';
    console.log(`Using Ollama model: ${modelName}`);

    const result = await generateObject({
      model: ollama(modelName),
      schema: schemaDef.object({
        dbName: schemaDef.string().describe("The name of the database"),
        collectionName: schemaDef.string().describe("The name of the collection"),
        query: schemaDef.record(schemaDef.any()).describe("The MongoDB find query object"),
        projection: schemaDef.record(schemaDef.any()).optional().describe("Fields to include/exclude"),
        sort: schemaDef.record(schemaDef.any()).optional().describe("Sort order"),
        limit: schemaDef.number().default(50).describe("Limit the number of results"),
        explanation: schemaDef.string().describe("Explanation of what the query does in natural language"),
        chartType: schemaDef.enum(["bar", "line", "pie", "area", "table"]).describe("The best chart type to visualize this data")
      }),
      prompt: `
You are a MongoDB expert. Given the following database schema, translate the user's natural language request into a valid MongoDB find() query.

Database Schema:
${JSON.stringify(schemas, null, 2)}

User Request: "${prompt}"

Instructions:
1. Identify the most relevant database and collection.
2. Create a standard MongoDB query object for the find() method.
3. Determine if any projection, sorting, or limiting is needed.
4. Suggest a chart type (bar, line, pie, area, or table) based on the data structure.
5. Return the query details.
`,
    });

    const AIResponse = result.object;
    console.log("AI Generated Query:", AIResponse);

    const c = (await getClient()).db(AIResponse.dbName).collection(AIResponse.collectionName);
    let cursor = c.find(AIResponse.query);

    if (AIResponse.projection) cursor = cursor.project(AIResponse.projection);
    if (AIResponse.sort) cursor = cursor.sort(AIResponse.sort as any);
    if (AIResponse.limit) cursor = cursor.limit(AIResponse.limit);

    const docs = await cursor.toArray();

    res.json({
      query: AIResponse,
      data: docs,
      count: docs.length
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.get("/data/:db/:coll", async (req, res) => {
  try {
    const dbName = req.params.db;
    const collName = req.params.coll;
    const limit = Number(req.query.limit || 50);
    const c = (await getClient()).db(dbName).collection(collName as string);
    const docs = await c.find({}).limit(limit).toArray();
    res.json({ count: docs.length, docs });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`MCP server listening on http://localhost:${PORT}`);
});

