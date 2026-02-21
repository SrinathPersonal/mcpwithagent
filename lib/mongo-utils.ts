import { MongoClient } from "mongodb";

export type FieldInfo = {
  types: string[];
  examples: any[];
  description?: string;
  tips?: string;
};

export type CollectionSchema = {
  dbName: string;
  collectionName: string;
  sampleCount: number;
  fields: Record<string, FieldInfo>;
};

function getType(value: any): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (value instanceof Date) return "date";
  if (typeof value === "object") return "object";
  return typeof value; // string, number, boolean, undefined, function
}

function recordField(fields: Record<string, FieldInfo>, path: string, value: any) {
  const t = getType(value);
  if (!fields[path]) fields[path] = { types: [], examples: [] };
  const info = fields[path];
  if (!info.types.includes(t)) info.types.push(t);
  if (info.examples.length < 3) info.examples.push(value);
}

function walkDocument(prefix: string, doc: any, fields: Record<string, FieldInfo>) {
  if (doc === null || doc === undefined) {
    recordField(fields, prefix, doc);
    return;
  }
  if (Array.isArray(doc)) {
    recordField(fields, prefix, doc);
    for (const el of doc.slice(0, 5)) {
      if (typeof el === "object" && el !== null) walkDocument(prefix + "[]", el, fields);
      else recordField(fields, prefix + "[]", el);
    }
    return;
  }
  if (typeof doc !== "object") {
    recordField(fields, prefix, doc);
    return;
  }
  for (const key of Object.keys(doc)) {
    const val = doc[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (val === null) {
      recordField(fields, path, null);
    } else if (Array.isArray(val)) {
      recordField(fields, path, val);
      for (const el of val.slice(0, 5)) {
        if (typeof el === "object" && el !== null) walkDocument(path + "[]", el, fields);
        else recordField(fields, path + "[]", el);
      }
    } else if (typeof val === "object") {
      recordField(fields, path, val);
      walkDocument(path, val, fields);
    } else {
      recordField(fields, path, val);
    }
  }
}

export async function inferSchemas(uri: string, sampleSize = 100): Promise<CollectionSchema[]> {
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const admin = client.db().admin();
    const dbs = await admin.listDatabases();
    const results: CollectionSchema[] = [];
    for (const dbInfo of dbs.databases) {
      const dbName = dbInfo.name;
      if (["admin", "local", "config"].includes(dbName)) continue;
      const db = client.db(dbName);
      const collections = await db.listCollections().toArray();
      for (const collInfo of collections) {
        const coll = db.collection(collInfo.name);
        const docs = await coll.find({}).limit(sampleSize).toArray();
        const fields: Record<string, FieldInfo> = {};
        for (const doc of docs) walkDocument("", doc, fields);
        results.push({ dbName, collectionName: collInfo.name, sampleCount: docs.length, fields });
      }
    }
    return results;
  } finally {
    await client.close();
  }
}
