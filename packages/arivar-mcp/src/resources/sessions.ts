/**
 * Session Resources for ARIVAR MCP Server
 * 
 * Provides read access to session data via MCP resources.
 * URI format: arivar://sessions/{session_id}
 */

import { Resource } from "@modelcontextprotocol/sdk/types.js";
import { invokePythonBridge } from "../bridge.js";

// ============================================================
// Resource Definitions
// ============================================================

export const sessionResources: Resource[] = [
    {
        uri: "arivar://sessions/current",
        name: "Current Session",
        description: "The most recent active ARIVAR debate session",
        mimeType: "application/json",
    },
];

// ============================================================
// Resource Handlers
// ============================================================

export async function readSessionResource(
    uri: string
): Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }> {
    // Parse session ID from URI
    const match = uri.match(/^arivar:\/\/sessions\/(.+)$/);
    if (!match) {
        throw new Error(`Invalid session URI: ${uri}`);
    }

    const sessionId = match[1];

    // Use implicit current session if "current" is specified
    const args = sessionId === "current" ? {} : { session_id: sessionId };

    const result = await invokePythonBridge("debate", "status", args);

    if (!result.session_id) {
        return {
            contents: [
                {
                    uri,
                    mimeType: "application/json",
                    text: JSON.stringify({ error: "No session found" }, null, 2),
                },
            ],
        };
    }

    return {
        contents: [
            {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(result, null, 2),
            },
        ],
    };
}
