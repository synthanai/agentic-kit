/**
 * Python Bridge for ARIVAR MCP Server
 * 
 * Invokes the ARIVAR CLI (Python) as a subprocess and parses JSON output.
 * This allows the TypeScript MCP server to leverage the existing Python
 * implementation of session management, model fallback, and SPAR bridge.
 * 
 * OpenClaw Pattern: Service-Oriented Architecture with shared core
 */

import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Path to ARIVAR CLI
const ARIVAR_CLI = resolve(
    __dirname,
    "../../../../apps/arivar_ite/arivar_cli.py"
);

// Fallback: use directly from agentic-kit if ARIVAR path not found
const AGENTIC_KIT_PATH = resolve(__dirname, "../../../..");

interface BridgeResult {
    success?: boolean;
    error?: string;
    session_id?: string;
    topic?: string;
    phase?: string;
    turn?: number;
    last_persona?: string;
    updated_at?: string;
    output?: string;
    response?: string;
    model_used?: string;
    removed?: number;
    personas?: Array<{
        id: string;
        role: string;
        style: string;
        principles?: string[];
    }>;
    sessions?: Array<{
        session_id: string;
        topic?: string;
        phase: string;
        updated_at: string;
    }>;
    providers?: Array<{
        name: string;
        model: string;
        available: boolean;
        reason?: string;
    }>;
    persona_name?: string;
    role?: string;
    [key: string]: unknown;
}

/**
 * Invoke the Python bridge to execute an ARIVAR command.
 * 
 * @param entity - Entity to operate on (debate, persona, session, model)
 * @param action - Action to perform (start, list, invoke, etc.)
 * @param args - Arguments to pass to the command
 * @returns Parsed JSON result from the CLI
 */
export async function invokePythonBridge(
    entity: string,
    action: string,
    args: Record<string, unknown>
): Promise<BridgeResult> {
    return new Promise((resolve, reject) => {
        // Build command arguments
        const cmdArgs = ["python3", ARIVAR_CLI, entity, action, "--json"];

        // Add arguments as flags
        for (const [key, value] of Object.entries(args)) {
            if (value !== undefined && value !== null) {
                const flag = `--${key.replace(/_/g, "-")}`;
                cmdArgs.push(flag, String(value));
            }
        }

        // Execute
        const proc = spawn("python3", [
            ARIVAR_CLI,
            entity,
            action,
            "--json",
            ...buildArgFlags(args),
        ], {
            env: {
                ...process.env,
                PYTHONPATH: AGENTIC_KIT_PATH,
            },
        });

        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        proc.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        proc.on("close", (code) => {
            if (code !== 0) {
                // Try to parse error from stderr or stdout
                const errorMsg = stderr || stdout || `Process exited with code ${code}`;
                reject(new Error(errorMsg.trim()));
                return;
            }

            try {
                // Parse JSON output
                const result = JSON.parse(stdout.trim());
                resolve(result);
            } catch (e) {
                // If not JSON, return as text
                resolve({
                    success: true,
                    output: stdout.trim(),
                });
            }
        });

        proc.on("error", (err) => {
            reject(new Error(`Failed to spawn process: ${err.message}`));
        });
    });
}

/**
 * Build command-line argument flags from an object.
 */
function buildArgFlags(args: Record<string, unknown>): string[] {
    const flags: string[] = [];

    for (const [key, value] of Object.entries(args)) {
        if (value === undefined || value === null) continue;
        if (value === true) {
            flags.push(`--${key.replace(/_/g, "-")}`);
        } else if (value !== false) {
            flags.push(`--${key.replace(/_/g, "-")}`, String(value));
        }
    }

    return flags;
}

/**
 * Check if the Python bridge is available.
 */
export async function checkBridgeHealth(): Promise<boolean> {
    try {
        await invokePythonBridge("model", "list", {});
        return true;
    } catch {
        return false;
    }
}
