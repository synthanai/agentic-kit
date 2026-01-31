/**
 * Debate Tools for ARIVAR MCP Server
 * 
 * Handles: debate_start, debate_resume, debate_status
 * OpenClaw Pattern: Entity-Action commands, Implicit session state
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { invokePythonBridge } from "../bridge.js";

// ============================================================
// Tool Definitions
// ============================================================

export const debateTools: Tool[] = [
    {
        name: "debate_start",
        description: "Start a new SPAR debate on a topic. Creates a new session for implicit tracking.",
        inputSchema: {
            type: "object",
            properties: {
                topic: {
                    type: "string",
                    description: "The topic or question to debate",
                },
                depth: {
                    type: "string",
                    enum: ["QUICK", "DEEP", "ULTRA"],
                    description: "Debate depth: QUICK (5 min), DEEP (15 min), ULTRA (30+ min)",
                    default: "DEEP",
                },
                panel: {
                    type: "string",
                    description: "Persona panel to use (e.g., 'emergence_council', 'strategy_council')",
                },
            },
            required: ["topic"],
        },
    },
    {
        name: "debate_resume",
        description: "Resume a debate from its last checkpoint. Uses implicit session if no ID provided.",
        inputSchema: {
            type: "object",
            properties: {
                session_id: {
                    type: "string",
                    description: "Explicit session ID (optional, uses most recent if omitted)",
                },
            },
        },
    },
    {
        name: "debate_status",
        description: "Get the current status of the active debate session.",
        inputSchema: {
            type: "object",
            properties: {
                session_id: {
                    type: "string",
                    description: "Explicit session ID (optional)",
                },
            },
        },
    },
];

// ============================================================
// Tool Handlers
// ============================================================

export async function handleDebateTool(
    name: string,
    args: Record<string, unknown> | undefined
): Promise<{ content: Array<{ type: string; text: string }> }> {
    switch (name) {
        case "debate_start":
            return await handleDebateStart(args);
        case "debate_resume":
            return await handleDebateResume(args);
        case "debate_status":
            return await handleDebateStatus(args);
        default:
            throw new Error(`Unknown debate tool: ${name}`);
    }
}

async function handleDebateStart(
    args: Record<string, unknown> | undefined
): Promise<{ content: Array<{ type: string; text: string }> }> {
    const topic = args?.topic as string;
    const depth = (args?.depth as string) || "DEEP";
    const panel = args?.panel as string | undefined;

    if (!topic) {
        throw new Error("Topic is required");
    }

    const result = await invokePythonBridge("debate", "start", {
        topic,
        depth,
        panel,
    });

    return {
        content: [
            {
                type: "text",
                text: `✓ Debate session created\n\nSession ID: ${result.session_id}\nTopic: ${topic}\nDepth: ${depth}\nPhase: FRAME\n\nUse 'debate_status' to check progress or 'persona_invoke' to start the dialogue.`,
            },
        ],
    };
}

async function handleDebateResume(
    args: Record<string, unknown> | undefined
): Promise<{ content: Array<{ type: string; text: string }> }> {
    const sessionId = args?.session_id as string | undefined;

    const result = await invokePythonBridge("debate", "resume", {
        session_id: sessionId,
    });

    if (!result.session_id) {
        return {
            content: [
                {
                    type: "text",
                    text: "No session found to resume. Use 'debate_start' to begin a new debate.",
                },
            ],
        };
    }

    return {
        content: [
            {
                type: "text",
                text: `✓ Resumed debate session\n\nSession: ${result.session_id}\nPhase: ${result.phase}\nTurn: ${result.turn}\nLast Persona: ${result.last_persona || "None"}`,
            },
        ],
    };
}

async function handleDebateStatus(
    args: Record<string, unknown> | undefined
): Promise<{ content: Array<{ type: string; text: string }> }> {
    const sessionId = args?.session_id as string | undefined;

    const result = await invokePythonBridge("debate", "status", {
        session_id: sessionId,
    });

    if (!result.session_id) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active debate session. Use 'debate_start' to begin.",
                },
            ],
        };
    }

    return {
        content: [
            {
                type: "text",
                text: `Debate Status\n\n` +
                    `Session: ${result.session_id}\n` +
                    `Topic: ${result.topic}\n` +
                    `Phase: ${result.phase}\n` +
                    `Turn: ${result.turn}\n` +
                    `Last Persona: ${result.last_persona || "None"}\n` +
                    `Updated: ${result.updated_at}`,
            },
        ],
    };
}
