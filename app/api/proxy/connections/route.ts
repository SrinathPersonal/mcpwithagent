import { NextResponse } from "next/server";

export async function GET() {
    try {
        const mcpUrl = process.env.MCP_SERVER_URL || "http://localhost:4000";
        const resp = await fetch(`${mcpUrl}/connections`);
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
