/**
 * Persona Resources for ARIVAR MCP Server
 * 
 * Provides read access to persona definitions via MCP resources.
 * URI format: arivar://personas/{persona_name}
 * 
 * BMAD Pattern: 4-element persona model (Role, Identity, Style, Principles)
 */

import { Resource } from "@modelcontextprotocol/sdk/types.js";
import { invokePythonBridge } from "../bridge.js";

// ============================================================
// Resource Definitions
// ============================================================

export const personaResources: Resource[] = [
    {
        uri: "arivar://personas/strategist",
        name: "Strategist Persona",
        description: "Strategic analyst with long-term, systemic thinking",
        mimeType: "application/json",
    },
    {
        uri: "arivar://personas/sentinel",
        name: "Sentinel Persona",
        description: "Risk-aware governance specialist",
        mimeType: "application/json",
    },
    {
        uri: "arivar://personas/synthesist",
        name: "Synthesist Persona",
        description: "Integration expert bridging perspectives",
        mimeType: "application/json",
    },
    {
        uri: "arivar://personas/pragmatist",
        name: "Pragmatist Persona",
        description: "Practical implementation specialist",
        mimeType: "application/json",
    },
    {
        uri: "arivar://personas/visionary",
        name: "Visionary Persona",
        description: "Future-oriented innovation thinker",
        mimeType: "application/json",
    },
];

// ============================================================
// Resource Handlers
// ============================================================

export async function readPersonaResource(
    uri: string
): Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }> {
    // Parse persona name from URI
    const match = uri.match(/^arivar:\/\/personas\/(.+)$/);
    if (!match) {
        throw new Error(`Invalid persona URI: ${uri}`);
    }

    const personaName = match[1];

    // Get all personas and filter
    const result = await invokePythonBridge("persona", "list", {});
    const persona = result.personas?.find(
        (p: { id: string }) => p.id === personaName
    );

    if (!persona) {
        return {
            contents: [
                {
                    uri,
                    mimeType: "application/json",
                    text: JSON.stringify({ error: `Persona not found: ${personaName}` }, null, 2),
                },
            ],
        };
    }

    return {
        contents: [
            {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(persona, null, 2),
            },
        ],
    };
}
