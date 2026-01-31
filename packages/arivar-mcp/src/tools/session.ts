/**
 * Session Tools for ARIVAR MCP Server
 * 
 * Handles: session_list, session_cleanup
 * OpenClaw Pattern: Implicit session tracking, 24h auto-cleanup
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { invokePythonBridge } from "../bridge.js";

// ============================================================
// Tool Definitions
// ============================================================

export const sessionTools: Tool[] = [
    {
        name: "session_list",
        description: "List recent debate sessions with their status and checkpoints.",
        inputSchema: {
            type: "object",
            properties: {
                limit: {
                    type: "number",
                    description: "Maximum number of sessions to return",
                    default: 10,
                },
            },
        },
    },
    {
        name: "session_cleanup",
        description: "Clean up old sessions (older than 24 hours).",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
];

// ============================================================
// Tool Handlers
// ============================================================

export async function handleSessionTool(
    name: string,
    args: Record<string, unknown> | undefined
): Promise<{ content: Array<{ type: string; text: string }> }> {
    switch (name) {
        case "session_list":
            return await handleSessionList(args);
        case "session_cleanup":
            return await handleSessionCleanup();
        default:
            throw new Error(`Unknown session tool: ${name}`);
    }
}

async function handleSessionList(
    args: Record<string, unknown> | undefined
): Promise<{ content: Array<{ type: string; text: string }> }> {
    const limit = (args?.limit as number) || 10;

    const result = await invokePythonBridge("session", "list", { limit });
    const sessions = result.sessions || [];

    if (sessions.length === 0) {
        return {
            content: [
                {
                    type: "text",
                    text: "No sessions found. Use 'debate_start' to begin a new debate.",
                },
            ],
        };
    }

    // Format as table
    const lines = [
        "| Session ID | Topic | Phase | Updated |",
        "|------------|-------|-------|---------|",
    ];

    for (const session of sessions) {
        const shortId = session.session_id.slice(0, 25) + "...";
        const shortTopic = (session.topic || "").slice(0, 35);
        const updated = session.updated_at.slice(0, 19);
        lines.push(`| ${shortId} | ${shortTopic} | ${session.phase} | ${updated} |`);
    }

    return {
        content: [
            {
                type: "text",
                text: `Recent Sessions (${sessions.length})\n\n${lines.join("\n")}`,
            },
        ],
    };
}

async function handleSessionCleanup(): Promise<{
    content: Array<{ type: string; text: string }>;
}> {
    const result = await invokePythonBridge("session", "cleanup", {});

    return {
        content: [
            {
                type: "text",
                text: `✓ Cleaned up ${result.removed} old sessions`,
            },
        ],
    };
}
