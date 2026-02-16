require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

function getType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  if (typeof value === 'object') return 'object';
  return typeof value;
}

function recordField(fields, fieldPath, value) {
  const t = getType(value);
  if (!fields[fieldPath]) fields[fieldPath] = { types: [], examples: [] };
  const info = fields[fieldPath];
  if (!info.types.includes(t)) info.types.push(t);
  if (info.examples.length < 3) info.examples.push(value);
}

function walkDocument(prefix, doc, fields) {
  if (doc === null || doc === undefined) {
    recordField(fields, prefix, doc);
    return;
  }
  if (Array.isArray(doc)) {
    recordField(fields, prefix, doc);
    for (const el of doc.slice(0, 5)) {
      if (typeof el === 'object' && el !== null) walkDocument(prefix + '[]', el, fields);
      else recordField(fields, prefix + '[]', el);
    }
    return;
  }
  if (typeof doc !== 'object') {
    recordField(fields, prefix, doc);
    return;
  }
  for (const key of Object.keys(doc)) {
    const val = doc[key];
    const pathKey = prefix ? `${prefix}.${key}` : key;
    if (val === null) {
      recordField(fields, pathKey, null);
    } else if (Array.isArray(val)) {
      recordField(fields, pathKey, val);
      for (const el of val.slice(0, 5)) {
        if (typeof el === 'object' && el !== null) walkDocument(pathKey + '[]', el, fields);
        else recordField(fields, pathKey + '[]', el);
      }
    } else if (typeof val === 'object') {
      recordField(fields, pathKey, val);
      walkDocument(pathKey, val, fields);
    } else {
      recordField(fields, pathKey, val);
    }
  }
}

async function inferSchemas(uri, sampleSize = 100) {
  const client = new MongoClient(uri, { tls: true, tlsAllowInvalidCertificates: true, serverSelectionTimeoutMS: 30000 });
  await client.connect();
  try {
    const admin = client.db().admin();
    const dbs = await admin.listDatabases();
    const results = [];
    for (const dbInfo of dbs.databases) {
      const dbName = dbInfo.name;
      if (['admin', 'local', 'config'].includes(dbName)) continue;
      const db = client.db(dbName);
      const collections = await db.listCollections().toArray();
      for (const collInfo of collections) {
        const coll = db.collection(collInfo.name);
        const docs = await coll.find({}).limit(sampleSize).toArray();
        const fields = {};
        for (const doc of docs) walkDocument('', doc, fields);
        results.push({ dbName, collectionName: collInfo.name, sampleCount: docs.length, fields });
      }
    }
    return results;
  } finally {
    await client.close();
  }
}

async function main() {
  const uri = process.env.MONGODB_URI || process.argv[2];
  if (!uri) {
    console.error('Please provide MONGODB_URI via env or as first arg.');
    process.exit(1);
  }
  const sampleSize = Number(process.env.SAMPLE_SIZE || process.argv[3] || 100);
  console.log('Connecting to:', uri);
  console.log(`Sample size: ${sampleSize}`);
  const schemas = await inferSchemas(uri, sampleSize);
  const out = { generatedAt: new Date().toISOString(), schemas };
  const outPath = path.join(process.cwd(), 'mongo_schema.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Wrote schema file to ${outPath}`);
  for (const s of schemas) {
    console.log(`DB: ${s.dbName}  Coll: ${s.collectionName}  Samples: ${s.sampleCount}  Fields: ${Object.keys(s.fields).length}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
