/**
 * KI Graph Generator
 * 
 * Scans ~/.gemini/antigravity/knowledge/ and generates a JSON-LD
 * knowledge graph conforming to the SKO schema.
 * 
 * Output: ~/.synthai/knowledge-graph.jsonld
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import { homedir } from 'os';

const KNOWLEDGE_DIR = join(homedir(), '.gemini/antigravity/knowledge');
const OUTPUT_DIR = join(homedir(), '.synthai');
const OUTPUT_FILE = join(OUTPUT_DIR, 'knowledge-graph.jsonld');

const SKO_CONTEXT = {
    "@context": {
        "sko": "https://synthai.tech/ontology/sko#",
        "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
        "xsd": "http://www.w3.org/2001/XMLSchema#",
        "title": "sko:title",
        "version": "sko:version",
        "summary": "sko:summary",
        "dependsOn": { "@id": "sko:dependsOn", "@type": "@id" },
        "hasArtifact": { "@id": "sko:hasArtifact", "@type": "@id" },
        "derivedFrom": { "@id": "sko:derivedFrom", "@type": "@id" }
    }
};

/**
 * Parse metadata.json and extract KI properties and relationships
 */
function parseKIMetadata(kiName, metadata) {
    const ki = {
        "@id": `sko:ki/${kiName}`,
        "@type": "sko:KnowledgeItem",
        "title": metadata.title || kiName,
        "summary": metadata.summary || ""
    };

    // Extract version from title if present (e.g., "v4.6")
    const versionMatch = metadata.title?.match(/\(v([\d.]+)\)/);
    if (versionMatch) {
        ki.version = versionMatch[1];
    }

    // Process references
    const dependencies = [];
    const artifacts = [];
    const conversations = [];

    for (const ref of metadata.references || []) {
        switch (ref.type) {
            case 'ki':
                dependencies.push({ "@id": `sko:ki/${ref.value}` });
                break;
            case 'artifact':
                artifacts.push({ "@id": `sko:artifact/${kiName}/${basename(ref.value)}` });
                break;
            case 'conversation_id':
                conversations.push({ "@id": `sko:conversation/${ref.value}` });
                break;
        }
    }

    if (dependencies.length > 0) ki.dependsOn = dependencies;
    if (artifacts.length > 0) ki.hasArtifact = artifacts;
    if (conversations.length > 0) ki.derivedFrom = conversations;

    return ki;
}

/**
 * Scan knowledge directory and build graph
 */
async function generateGraph() {
    const graph = {
        ...SKO_CONTEXT,
        "@graph": []
    };

    try {
        const entries = await readdir(KNOWLEDGE_DIR, { withFileTypes: true });

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;

            const metadataPath = join(KNOWLEDGE_DIR, entry.name, 'metadata.json');

            try {
                const content = await readFile(metadataPath, 'utf-8');
                const metadata = JSON.parse(content);
                const ki = parseKIMetadata(entry.name, metadata);
                graph["@graph"].push(ki);
            } catch (err) {
                console.warn(`Skipping ${entry.name}: ${err.message}`);
            }
        }

        // Ensure output directory exists
        await mkdir(OUTPUT_DIR, { recursive: true });

        // Write graph
        await writeFile(OUTPUT_FILE, JSON.stringify(graph, null, 2));

        console.log(`✅ Generated knowledge graph with ${graph["@graph"].length} KIs`);
        console.log(`📁 Output: ${OUTPUT_FILE}`);

        return graph;

    } catch (err) {
        console.error('Failed to generate graph:', err);
        throw err;
    }
}

/**
 * Query helper: Find all KIs that depend on a given KI
 */
function findDependents(graph, kiName) {
    const targetId = `sko:ki/${kiName}`;
    return graph["@graph"].filter(ki => {
        const deps = ki.dependsOn || [];
        return deps.some(d => d["@id"] === targetId);
    });
}

/**
 * Query helper: Get dependency tree for a KI
 */
function getDependencyTree(graph, kiName, visited = new Set()) {
    if (visited.has(kiName)) return null; // Circular reference
    visited.add(kiName);

    const ki = graph["@graph"].find(k => k["@id"] === `sko:ki/${kiName}`);
    if (!ki) return null;

    const deps = (ki.dependsOn || []).map(d => {
        const depName = d["@id"].replace('sko:ki/', '');
        return getDependencyTree(graph, depName, visited);
    }).filter(Boolean);

    return {
        name: kiName,
        title: ki.title,
        dependencies: deps
    };
}

export {
    generateGraph,
    parseKIMetadata,
    findDependents,
    getDependencyTree,
    SKO_CONTEXT
};

// CLI execution
if (process.argv[1]?.endsWith('ki-graph-generator.js')) {
    generateGraph().catch(console.error);
}
