import { NextResponse } from "next/server";


export async function GET() {
  const data = {
    message: "Hello, World!",
    timeStamp: new Date().toISOString(),
    tip: "This is a response from the MCP server endpoint.",
  };
  return NextResponse.json(data);
}