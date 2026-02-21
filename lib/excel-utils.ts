import XLSX from "xlsx";
import { CollectionSchema, FieldInfo } from "./mongo-utils.js";
import path from "path";
import fs from "fs";

const WORKBOOK_CACHE = new Map<string, { workbook: XLSX.WorkBook, mtime: number }>();

function getCachedWorkbook(resolvedPath: string): XLSX.WorkBook {
    const stats = fs.statSync(resolvedPath);
    const cached = WORKBOOK_CACHE.get(resolvedPath);

    if (cached && cached.mtime === stats.mtimeMs) {
        return cached.workbook;
    }

    console.log(`Cache miss/stale for: ${resolvedPath}. Reading file...`);
    const workbook = XLSX.readFile(resolvedPath);
    WORKBOOK_CACHE.set(resolvedPath, { workbook, mtime: stats.mtimeMs });
    return workbook;
}

export async function inferExcelSchema(filePath: string): Promise<CollectionSchema[]> {
    const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(resolvedPath)) throw new Error(`File not found: ${resolvedPath}`);
    if (fs.statSync(resolvedPath).isDirectory()) throw new Error(`EISDIR: ${resolvedPath} is a directory, not a file.`);

    const workbook = getCachedWorkbook(resolvedPath);
    const results: CollectionSchema[] = [];

    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet) as any[];

        if (data.length === 0) continue;

        const fields: Record<string, FieldInfo> = {};
        const sampleSize = Math.min(data.length, 100);

        for (let i = 0; i < sampleSize; i++) {
            const row = data[i];
            for (const key of Object.keys(row)) {
                if (!fields[key]) fields[key] = { types: [], examples: [] };
                const type = typeof row[key];
                if (!fields[key].types.includes(type)) fields[key].types.push(type);
                if (fields[key].examples.length < 3) fields[key].examples.push(row[key]);
            }
        }

        results.push({
            dbName: "ExcelFile",
            collectionName: sheetName,
            sampleCount: data.length,
            fields
        });
    }

    return results;
}

export async function fetchExcelData(filePath: string, sheetName: string, query: any, limit: number = 50, projection?: string[]): Promise<any[]> {
    const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
    console.log(`Fetching Excel data from: ${resolvedPath}, sheet: ${sheetName}`);
    if (!fs.existsSync(resolvedPath)) throw new Error(`File not found: ${resolvedPath}`);
    if (fs.statSync(resolvedPath).isDirectory()) throw new Error(`EISDIR: ${resolvedPath} is a directory, not a file.`);

    const workbook = getCachedWorkbook(resolvedPath);

    // Find sheet (case insensitive fallback)
    let sheet = workbook.Sheets[sheetName];
    if (!sheet) {
        const lowerSheetName = sheetName.toLowerCase();
        const matchedKey = Object.keys(workbook.Sheets).find(k => k.toLowerCase() === lowerSheetName);
        if (matchedKey) {
            sheet = workbook.Sheets[matchedKey];
            console.log(`Sheet "${sheetName}" not found, using "${matchedKey}" instead`);
        } else {
            sheet = workbook.Sheets[workbook.SheetNames[0]];
            console.log(`Sheet "${sheetName}" not found, using first sheet: "${workbook.SheetNames[0]}"`);
        }
    }

    // Standard parsing produces objects where row[key] works correctly
    const MAX_ROWS = 10000;
    const jsonData = XLSX.utils.sheet_to_json(sheet, {
        raw: false,
        defval: ""
    });

    const limitedData = jsonData.slice(0, MAX_ROWS);
    console.log(`Loaded ${limitedData.length} records from Excel (max: ${MAX_ROWS})`);

    // Case-insensitive filtering
    const filtered = limitedData.filter((row: any) => {
        // Handle malformed query (AI sometimes sends array instead of object)
        if (Array.isArray(query) || typeof query !== 'object') {
            return true;
        }

        return Object.keys(query).every(key => {
            const val = query[key];
            // Skip filter if value is null, undefined, empty string, or just whitespace
            if (val === undefined || val === null || String(val).trim() === "") return true;

            const rowVal = String(row[key] || "").toLowerCase();
            const queryVal = String(val).toLowerCase();
            return rowVal.includes(queryVal);
        });
    });

    console.log(`Query: ${JSON.stringify(query)} | Filtered to ${filtered.length} rows`);

    // Apply projection if specified
    const projected = projection && projection.length > 0
        ? filtered.map((row: any) => {
            const newRow: any = {};
            projection.forEach(key => {
                newRow[key] = row[key];
            });
            return newRow;
        })
        : filtered;

    return projected.slice(0, limit);
}
