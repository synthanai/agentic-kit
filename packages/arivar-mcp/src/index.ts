#!/usr/bin/env node
/**
 * ARIVAR MCP Server
 * 
 * Model Context Protocol server for Claude Desktop integration.
 * Enables AI assistants to invoke ARIVAR debates, manage sessions,
 * and interact with personas.
 * 
 * OpenClaw Pattern: MCP Server Layer
 * BMAD Pattern: Intent → Execution → Artifact
 * 
 * @author SYNTHAI Team
 * @version 1.0.0
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { debateTools, handleDebateTool } from "./tools/debate.js";
import { personaTools, handlePersonaTool } from "./tools/persona.js";
import { sessionTools, handleSessionTool } from "./tools/session.js";
import { modelTools, handleModelTool } from "./tools/model.js";
import { sessionResources, readSessionResource } from "./resources/sessions.js";
import { personaResources, readPersonaResource } from "./resources/personas.js";

// ============================================================
// Server Configuration
// ============================================================

const server = new Server(
    {
        name: "arivar-mcp",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
            resources: {},
        },
    }
);

// ============================================================
// Tool Registration
// ============================================================

const allTools = [
    ...debateTools,
    ...personaTools,
    ...sessionTools,
    ...modelTools,
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        // Route to appropriate handler
        if (name.startsWith("debate_")) {
            return await handleDebateTool(name, args);
        }
        if (name.startsWith("persona_")) {
            return await handlePersonaTool(name, args);
        }
        if (name.startsWith("session_")) {
            return await handleSessionTool(name, args);
        }
        if (name.startsWith("model_")) {
            return await handleModelTool(name, args);
        }

        throw new Error(`Unknown tool: ${name}`);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            content: [{ type: "text", text: `Error: ${message}` }],
            isError: true,
        };
    }
});

// ============================================================
// Resource Registration
// ============================================================

const allResources = [...sessionResources, ...personaResources];

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: allResources,
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (uri.startsWith("arivar://sessions/")) {
        return await readSessionResource(uri);
    }
    if (uri.startsWith("arivar://personas/")) {
        return await readPersonaResource(uri);
    }

    throw new Error(`Unknown resource: ${uri}`);
});

// ============================================================
// Server Startup
// ============================================================

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("ARIVAR MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
