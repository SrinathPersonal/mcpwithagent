import knex from "knex";
import { CollectionSchema, FieldInfo } from "./mongo-utils.js";

export async function inferSqlSchema(config: any): Promise<CollectionSchema[]> {
    const db = knex(config);
    try {
        const tables = await db.raw("SELECT name FROM sqlite_master WHERE type='table'"); // Fallback for sqlite
        // For general SQL, it would be information_schema
        const results: CollectionSchema[] = [];

        for (const table of tables) {
            const tableName = table.name || table.TABLE_NAME;
            const columns = await db(tableName).columnInfo();

            const fields: Record<string, FieldInfo> = {};
            for (const [colName, info] of Object.entries(columns)) {
                fields[colName] = {
                    types: [(info as any).type],
                    examples: [] // Could fetch samples if needed
                };
            }

            const countRes = await db(tableName).count("* as count");
            const sampleCount = (countRes[0] as any).count;

            results.push({
                dbName: config.connection.database || "SQLServer",
                collectionName: tableName,
                sampleCount,
                fields
            });
        }
        return results;
    } finally {
        await db.destroy();
    }
}

export async function fetchSqlData(config: any, tableName: string, query: any, limit: number = 50, projection?: string[]) {
    const db = knex(config);
    try {
        let q = db(tableName).where(query || {}).limit(limit);
        if (projection && projection.length > 0) {
            q = q.select(projection);
        }
        return await q;
    } finally {
        await db.destroy();
    }
}
