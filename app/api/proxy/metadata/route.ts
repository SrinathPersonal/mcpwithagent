import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const mcpUrl = process.env.MCP_SERVER_URL || "http://localhost:4000";
        const resp = await fetch(`${mcpUrl}/metadata`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (!resp.ok) {
            const errorText = await resp.text();
            return NextResponse.json({ error: errorText }, { status: resp.status });
        }
        const data = await resp.json();
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
