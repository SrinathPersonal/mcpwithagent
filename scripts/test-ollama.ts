import "dotenv/config";
import { ollama } from "ollama-ai-provider";
import { generateObject } from "ai";
import { z } from "zod";

async function test() {
    const modelName = process.env.OLLAMA_MODEL || "llama3.2";
    console.log(`Testing with model: ${modelName}`);

    try {
        const result = await generateObject({
            model: ollama(modelName),
            schema: z.object({
                test: z.string()
            }),
            prompt: "Say hello",
        });
        console.log("Result received:", JSON.stringify(result.object));
    } catch (err: any) {
        console.error("Caught error:", err.message);
    }
}

test().catch(err => {
    console.error("Global catch active");
    console.error("Test failed with unhandled rejection:", err.message || err);
});

// Prevent process exit for as long as possible to see logs
setTimeout(() => { }, 10000);
