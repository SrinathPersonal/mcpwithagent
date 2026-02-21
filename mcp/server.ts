import "dotenv/config";
import express from "express";
import { MongoClient } from "mongodb";
import { inferSchemas, CollectionSchema } from "../lib/mongo-utils.js";
import fs from "fs";
import path from "path";
import { ollama } from "ollama-ai-provider";
import { generateObject, generateText } from "ai";
import { z as schemaDef } from "zod";
import { inferExcelSchema, fetchExcelData } from "../lib/excel-utils.js";
import { inferSqlSchema, fetchSqlData } from "../lib/sql-utils.js";

const CONNECTIONS_PATH = path.join(process.cwd(), "connections.json");
const METADATA_PATH = path.join(process.cwd(), "metadata.json");
const SCHEMAS_DIR = path.join(process.cwd(), "schemas");
if (!fs.existsSync(SCHEMAS_DIR)) fs.mkdirSync(SCHEMAS_DIR);
if (!fs.existsSync(METADATA_PATH)) fs.writeFileSync(METADATA_PATH, JSON.stringify({ metadata: {} }));

const app = express();
app.use(express.json());
const PORT = Number(process.env.PORT || 4000);
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.warn("MONGODB_URI not set. Server will start but database operations will fail.");
}

function safeLog(label: string, err: any) {
  try {
    const message = err instanceof Error ? err.stack || err.message : JSON.stringify(err);
    console.error(`${label}:`, message);
  } catch (e) {
    console.error(`${label} (unsafe):`, String(err));
  }
}

// Add global error handlers to prevent process exit
process.on("unhandledRejection", (reason) => {
  safeLog("Unhandled Rejection", reason);
});
process.on("uncaughtException", (err) => {
  safeLog("Uncaught Exception", err);
});

const SCHEMA_PATH = path.join(process.cwd(), "mongo_schema.json");

async function getClient() {
  if (!uri) throw new Error("MONGODB_URI not set");

  // Create a fresh client for each request to avoid connection timeout issues
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 1
  });

  await client.connect();
  console.log('MongoDB client connected successfully');
  return client;
}

// Query result cache (5-minute TTL)
const QUERY_CACHE = new Map<string, { result: any, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedQuery(key: string): any | null {
  const cached = QUERY_CACHE.get(key);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log(`Cache HIT for query: ${key.substring(0, 50)}...`);
    return cached.result;
  }
  if (cached) QUERY_CACHE.delete(key); // Remove stale entry
  return null;
}

function setCachedQuery(key: string, result: any) {
  QUERY_CACHE.set(key, { result, timestamp: Date.now() });
  console.log(`Cached query result (${QUERY_CACHE.size} total cached)`);
}

async function getOrUpdateSchema(connectionId: string = "dataset-default") {
  const connections = JSON.parse(fs.readFileSync(CONNECTIONS_PATH, "utf8")).connections;
  let conn = connections.find((c: any) => c.id === connectionId);

  // Fallback if not found
  if (!conn && connections.length > 0) {
    conn = connections[0];
    connectionId = conn.id; // Use real ID for paths
  }

  if (!conn) throw new Error(`Connection ${connectionId} not found`);

  const schemaPath = path.join(SCHEMAS_DIR, `${connectionId}.json`);
  let shouldUpdate = false;

  if (!fs.existsSync(schemaPath)) {
    shouldUpdate = true;
  } else {
    try {
      const stats = fs.statSync(schemaPath);
      if (Date.now() - stats.mtime.getTime() > 24 * 60 * 60 * 1000) shouldUpdate = true;
    } catch { shouldUpdate = true; }
  }

  let finalSchemas: CollectionSchema[] = [];
  if (shouldUpdate) {
    console.log(`Updating schema for ${connectionId}...`);
    if (conn.type === "mongodb") {
      const uriToUse = conn.config.uri === "env:MONGODB_URI" ? (process.env.MONGODB_URI || "") : (conn.config.uri || "");
      if (uriToUse) finalSchemas = await inferSchemas(uriToUse, 100);
    } else if (conn.type === "excel") {
      finalSchemas = await inferExcelSchema(conn.config.path);
    } else if (conn.type === "sql") {
      finalSchemas = await inferSqlSchema(conn.config);
    }
    fs.writeFileSync(schemaPath, JSON.stringify({ generatedAt: new Date().toISOString(), schemas: finalSchemas }, null, 2));
  } else {
    finalSchemas = JSON.parse(fs.readFileSync(schemaPath, "utf8")).schemas as CollectionSchema[];
  }

  // Merge with manual metadata
  try {
    const metaDataStr = fs.readFileSync(METADATA_PATH, "utf8");
    const metaData = JSON.parse(metaDataStr).metadata;
    const connMeta = metaData[connectionId] || {};
    finalSchemas.forEach((s: CollectionSchema) => {
      const collMeta = connMeta[s.collectionName] || {};
      Object.keys(s.fields).forEach(f => {
        if (collMeta[f]) {
          s.fields[f].description = collMeta[f].description;
          s.fields[f].tips = collMeta[f].tips;
        }
      });
    });
  } catch (e) {
    console.error("Error merging metadata:", e);
  }

  return finalSchemas;
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

app.get("/connections", (_req, res) => {
  const data = JSON.parse(fs.readFileSync(CONNECTIONS_PATH, "utf8"));
  res.json(data.connections);
});

app.post("/connect", (req, res) => {
  const newConn = req.body;
  const data = JSON.parse(fs.readFileSync(CONNECTIONS_PATH, "utf8"));
  data.connections.push(newConn);
  fs.writeFileSync(CONNECTIONS_PATH, JSON.stringify(data, null, 2));
  res.json({ ok: true });
});

app.get("/catalog", async (_req, res) => {
  try {
    const connections = JSON.parse(fs.readFileSync(CONNECTIONS_PATH, "utf8")).connections;
    const catalog = await Promise.all(connections.map(async (c: any) => {
      try {
        const schemas = await getOrUpdateSchema(c.id);
        return { ...c, schemas };
      } catch (err) {
        return { ...c, schemas: [], error: String(err) };
      }
    }));
    res.json(catalog);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/metadata", (req, res) => {
  try {
    const { connectionId, collectionName, fieldName, description, tips } = req.body;
    const data = JSON.parse(fs.readFileSync(METADATA_PATH, "utf8"));
    if (!data.metadata[connectionId]) data.metadata[connectionId] = {};
    if (!data.metadata[connectionId][collectionName]) data.metadata[connectionId][collectionName] = {};
    data.metadata[connectionId][collectionName][fieldName] = { description, tips };
    fs.writeFileSync(METADATA_PATH, JSON.stringify(data, null, 2));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/ask", async (req, res) => {
  const { prompt, connectionId = "dataset-default" } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    // Check cache first
    const cacheKey = `${connectionId}:${prompt}`;
    const cachedResult = getCachedQuery(cacheKey);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    const schemas = await getOrUpdateSchema(connectionId);
    const connections = JSON.parse(fs.readFileSync(CONNECTIONS_PATH, "utf8")).connections;
    let conn = connections.find((c: any) => c.id === connectionId);

    // Robust fallback: if connection not found, try to use the first one available
    if (!conn && connections.length > 0) {
      console.log(`Connection "${connectionId}" not found. Falling back to first available: "${connections[0].name}"`);
      conn = connections[0];
    }

    if (!conn) throw new Error(`Connection ${connectionId} not found and no datasets available.`);

    const modelName = process.env.OLLAMA_MODEL || 'llama3.2';
    console.log(`Using Ollama model: ${modelName} for prompt: "${prompt}" on ${conn.id}`);

    console.time("AI Generation");
    let AIResponse: any;
    try {
      const { text } = await generateText({
        model: ollama(modelName),
        temperature: 0,
        prompt: `Task: Generate a data query for ${conn.type} source.
Context: Connection "${conn.name}" (${conn.type}). 
Available Tables: ${JSON.stringify(schemas.map(s => ({ dbName: s.dbName, name: s.collectionName, fields: Object.keys(s.fields) })), null, 0)}
User Request: "${prompt}"

Rules:
1. Use ONLY the field names provided in the context.
2. The 'dbName' and 'collectionName' MUST be exactly as shown in the context.
3. 'query' is for FILTERING ONLY (e.g. "where status is active"). 
   - validation: query must be a key-value object (e.g. {"Status": "Active"}). 
   - DO NOT put column names here.
4. 'chartType' MUST be one of: "bar", "line", "pie", "area", "table".
5. 'projection' is for SELECTING COLUMNS.
   - Any field the user asks to "get", "show", or "display" MUST go here.
   - Example: "get schemes and market value" -> projection: ["SCHEMENAME", "MARKET_VALUE"]
   - NEVER list more than 5 fields unless "all" is requested.
6. Output ONLY valid JSON.
`,
      });

      console.log("Raw AI Response:", text);

      // Extract JSON from text (in case model wraps it in markdown blocks or includes text)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in AI response: " + text);
      const cleanedJson = jsonMatch[0];
      AIResponse = JSON.parse(cleanedJson);

      // Ensure required fields exist even if AI missed them
      if (!AIResponse.dbName) AIResponse.dbName = schemas[0]?.dbName || "default";
      if (!AIResponse.collectionName) AIResponse.collectionName = schemas[0]?.collectionName || "Sheet1";
      if (!AIResponse.query) AIResponse.query = {};
      if (!AIResponse.chartType) AIResponse.chartType = "table";

      // If user asked for "all", ensure projection is empty so all columns are returned
      if (prompt.toLowerCase().includes("all") && (!AIResponse.projection || AIResponse.projection.length > 5)) {
        AIResponse.projection = []; // Clear projection to show all
      }

      console.timeEnd("AI Generation");
      console.log("AI Generated Query:", JSON.stringify(AIResponse, null, 2));
      if (AIResponse.projection) {
        console.log(`AI Projection (${AIResponse.projection.length} fields):`, AIResponse.projection.join(", "));
      } else {
        console.log("AI Projection: ALL FIELDS (none specified)");
      }

      console.time("Data Fetch");
      let docs: any[] = [];
      let mongoClient: MongoClient | null = null;

      try {
        if (conn.type === "mongodb") {
          mongoClient = await getClient();
          const c = mongoClient.db(AIResponse.dbName).collection(AIResponse.collectionName);
          let findQuery = c.find(AIResponse.query || {});
          if (AIResponse.projection && Array.isArray(AIResponse.projection)) {
            const projObj: any = {};
            AIResponse.projection.forEach((f: string) => projObj[f] = 1);
            findQuery = findQuery.project(projObj);
          }
          docs = await findQuery.limit(AIResponse.limit || 50).toArray();
        } else if (conn.type === "excel") {
          docs = await fetchExcelData(conn.config.path, AIResponse.collectionName, AIResponse.query, AIResponse.limit, AIResponse.projection);
        } else if (conn.type === "sql") {
          docs = await fetchSqlData(conn.config, AIResponse.collectionName, AIResponse.query, AIResponse.limit, AIResponse.projection);
        }
      } finally {
        if (mongoClient) {
          await mongoClient.close();
          console.log('MongoDB client closed');
        }
      }
      console.timeEnd("Data Fetch");

      const result = { query: AIResponse, data: docs, count: docs.length };

      // Cache the result
      setCachedQuery(cacheKey, result);

      res.json(result);
    } catch (err: any) {
      console.error("ASK Error Details:", {
        message: err.message,
        stack: err.stack,
        prompt,
        connectionId,
        rawAIResponse: (err as any).response
      });
      res.status(500).json({
        error: err.message || String(err),
        rawResponse: (err as any).response
      });
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

