/**
 * Model Tools for ARIVAR MCP Server
 * 
 * Handles: model_list, model_test
 * OpenClaw Pattern: Graceful degradation, fallback chains
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { invokePythonBridge } from "../bridge.js";

// ============================================================
// Tool Definitions
// ============================================================

export const modelTools: Tool[] = [
    {
        name: "model_list",
        description: "List configured LLM providers and their availability status.",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "model_test",
        description: "Test the model fallback chain with a simple prompt.",
        inputSchema: {
            type: "object",
            properties: {
                prompt: {
                    type: "string",
                    description: "Test prompt to send",
                    default: "Hello, this is a test. Respond briefly.",
                },
            },
        },
    },
];

// ============================================================
// Tool Handlers
// ============================================================

export async function handleModelTool(
    name: string,
    args: Record<string, unknown> | undefined
): Promise<{ content: Array<{ type: string; text: string }> }> {
    switch (name) {
        case "model_list":
            return await handleModelList();
        case "model_test":
            return await handleModelTest(args);
        default:
            throw new Error(`Unknown model tool: ${name}`);
    }
}

async function handleModelList(): Promise<{
    content: Array<{ type: string; text: string }>;
}> {
    const result = await invokePythonBridge("model", "list", {});
    const providers = result.providers || [];

    // Format as table
    const lines = [
        "| Provider | Model | Status |",
        "|----------|-------|--------|",
    ];

    for (const provider of providers) {
        const status = provider.available ? "✓" : `✗ ${provider.reason || ""}`;
        lines.push(`| ${provider.name} | ${provider.model} | ${status} |`);
    }

    return {
        content: [
            {
                type: "text",
                text: `Model Fallback Chain\n\n${lines.join("\n")}\n\n` +
                    `Models are tried in order until one succeeds.`,
            },
        ],
    };
}

async function handleModelTest(
    args: Record<string, unknown> | undefined
): Promise<{ content: Array<{ type: string; text: string }> }> {
    const prompt =
        (args?.prompt as string) || "Hello, this is a test. Respond briefly.";

    const result = await invokePythonBridge("model", "test", { prompt });

    if (!result.success) {
        return {
            content: [
                {
                    type: "text",
                    text: `✗ All models failed\n\nError: ${result.error}`,
                },
            ],
        };
    }

    const response = result.response || "";
    return {
        content: [
            {
                type: "text",
                text: `✓ Model: ${result.model_used}\n\n` +
                    `Response:\n${response.slice(0, 500)}${response.length > 500 ? "..." : ""}`,
            },
        ],
    };
}
