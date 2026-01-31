/**
 * Persona Tools for ARIVAR MCP Server
 * 
 * Handles: persona_invoke, persona_list
 * BMAD Pattern: 4-element persona model (Role, Identity, Style, Principles)
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { invokePythonBridge } from "../bridge.js";

// ============================================================
// Tool Definitions
// ============================================================

export const personaTools: Tool[] = [
    {
        name: "persona_invoke",
        description: "Invoke a specific persona to contribute to the current debate. Updates the session checkpoint.",
        inputSchema: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "Persona name (e.g., 'strategist', 'sentinel', 'synthesist')",
                },
                prompt: {
                    type: "string",
                    description: "Optional prompt or question for the persona",
                },
            },
            required: ["name"],
        },
    },
    {
        name: "persona_list",
        description: "List all available personas with their roles, styles, and principles.",
        inputSchema: {
            type: "object",
            properties: {
                category: {
                    type: "string",
                    description: "Filter by category (e.g., 'council', 'specialist')",
                },
            },
        },
    },
];

// ============================================================
// Tool Handlers
// ============================================================

export async function handlePersonaTool(
    name: string,
    args: Record<string, unknown> | undefined
): Promise<{ content: Array<{ type: string; text: string }> }> {
    switch (name) {
        case "persona_invoke":
            return await handlePersonaInvoke(args);
        case "persona_list":
            return await handlePersonaList(args);
        default:
            throw new Error(`Unknown persona tool: ${name}`);
    }
}

async function handlePersonaInvoke(
    args: Record<string, unknown> | undefined
): Promise<{ content: Array<{ type: string; text: string }> }> {
    const personaName = args?.name as string;
    const prompt = args?.prompt as string | undefined;

    if (!personaName) {
        throw new Error("Persona name is required");
    }

    const result = await invokePythonBridge("persona", "invoke", {
        name: personaName,
        prompt,
    });

    if (!result.success) {
        throw new Error(result.error || "Failed to invoke persona");
    }

    return {
        content: [
            {
                type: "text",
                text: `✓ Invoked: ${result.persona_name}\n\n` +
                    `Role: ${result.role}\n` +
                    `Turn: ${result.turn}\n` +
                    `\n---\n\n` +
                    `${result.response}`,
            },
        ],
    };
}

async function handlePersonaList(
    args: Record<string, unknown> | undefined
): Promise<{ content: Array<{ type: string; text: string }> }> {
    const category = args?.category as string | undefined;

    const result = await invokePythonBridge("persona", "list", { category });
    const personas = result.personas || [];

    // Format as table (BMAD 4-element model)
    const lines = ["| Persona | Role | Style | Principles |", "|---------|------|-------|------------|"];

    for (const persona of personas) {
        const principles = persona.principles?.slice(0, 2).join("; ") || "-";
        lines.push(
            `| ${persona.id} | ${persona.role} | ${persona.style} | ${principles} |`
        );
    }

    return {
        content: [
            {
                type: "text",
                text: `Available Personas (${personas.length})\n\n${lines.join("\n")}`,
            },
        ],
    };
}
