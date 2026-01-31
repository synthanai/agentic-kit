/**
 * Workflow Scanner
 * 
 * Scans .agent/workflows/*.md and extracts intent patterns
 * for the 3-layer router.
 * 
 * Based on BMAD's bmad-translator pattern.
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Parse YAML frontmatter from workflow file
 */
function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};

    const frontmatter = {};
    const lines = match[1].split('\n');

    for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
            frontmatter[key.trim()] = valueParts.join(':').trim();
        }
    }

    return frontmatter;
}

/**
 * Extract potential intent triggers from workflow content
 */
function extractIntentPatterns(name, content) {
    const patterns = [];

    // Workflow name as base pattern
    const baseName = name.replace('.md', '').replace(/-/g, ' ');
    patterns.push(new RegExp(baseName, 'i'));

    // Extract action verbs from content
    const actionVerbs = content.match(/\b(analyze|research|write|review|validate|generate|create|build|run|execute|start|begin)\b/gi);
    if (actionVerbs) {
        const uniqueVerbs = [...new Set(actionVerbs.map(v => v.toLowerCase()))];
        for (const verb of uniqueVerbs.slice(0, 3)) {
            patterns.push(new RegExp(`${verb}\\s+(.+)`, 'i'));
        }
    }

    return patterns;
}

/**
 * Determine default personas based on workflow type
 */
function inferPersonas(name, content) {
    const personaMap = {
        'research': ['strategist', 'skeptic', 'synthesist'],
        'write': ['author'],
        'review': ['skeptic', 'sentinel', 'guardian'],
        'debate': ['strategist', 'sentinel', 'synthesist'],
        'validate': ['sentinel', 'skeptic'],
        'audit': ['sentinel', 'guardian']
    };

    for (const [keyword, personas] of Object.entries(personaMap)) {
        if (name.includes(keyword) || content.toLowerCase().includes(keyword)) {
            return personas;
        }
    }

    return ['synthesist']; // Default
}

/**
 * Scan workflows directory and build routing table
 */
async function scanWorkflows(workflowsDir) {
    const routingTable = {};

    try {
        const files = await readdir(workflowsDir);
        const mdFiles = files.filter(f => f.endsWith('.md'));

        for (const file of mdFiles) {
            const content = await readFile(join(workflowsDir, file), 'utf-8');
            const frontmatter = parseFrontmatter(content);
            const name = file.replace('.md', '');

            routingTable[name] = {
                name,
                description: frontmatter.description || '',
                patterns: extractIntentPatterns(name, content),
                personas: inferPersonas(name, content),
                path: `.agent/workflows/${file}`
            };
        }

        console.log(`✅ Scanned ${Object.keys(routingTable).length} workflows`);
        return routingTable;

    } catch (err) {
        console.error('Failed to scan workflows:', err);
        throw err;
    }
}

/**
 * Generate router config from routing table
 */
function generateRouterConfig(routingTable) {
    const config = {};

    for (const [name, workflow] of Object.entries(routingTable)) {
        config[name] = {
            patterns: workflow.patterns.map(p => p.toString()),
            workflow: name,
            personas: workflow.personas,
            description: workflow.description
        };
    }

    return config;
}

/**
 * Match user input against all workflows
 */
function matchIntent(input, routingTable) {
    const normalizedInput = input.trim().toLowerCase();
    const matches = [];

    for (const [name, workflow] of Object.entries(routingTable)) {
        for (const pattern of workflow.patterns) {
            if (pattern.test(normalizedInput)) {
                matches.push({
                    workflow: name,
                    confidence: 0.8,
                    personas: workflow.personas,
                    description: workflow.description
                });
                break;
            }
        }
    }

    // Sort by specificity (longer workflow names = more specific)
    matches.sort((a, b) => b.workflow.length - a.workflow.length);

    return matches[0] || null;
}

export {
    scanWorkflows,
    generateRouterConfig,
    matchIntent,
    parseFrontmatter,
    extractIntentPatterns,
    inferPersonas
};

// CLI execution
if (process.argv[1]?.endsWith('workflow-scanner.js')) {
    const workflowsDir = process.argv[2] || '.agent/workflows';
    scanWorkflows(workflowsDir)
        .then(table => {
            console.log('\nRouting Table:');
            console.log(JSON.stringify(generateRouterConfig(table), null, 2));
        })
        .catch(console.error);
}
