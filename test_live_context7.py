#!/usr/bin/env python3
"""Quick test of Context7 bridge with live API."""
import asyncio
import sys
sys.path.insert(0, '.')

from agentic_kit.context7_bridge import Context7Client, context7_available

async def main():
    print("=== Context7 Live API Test ===\n")
    
    # Check availability
    print("1. Checking availability...")
    async with Context7Client() as client:
        available = await client.is_available()
        print(f"   Context7 available: {available}\n")
        
        # Get stats
        print("2. Fetching stats...")
        stats = await client.get_stats()
        print(f"   Libraries: {stats.get('libraries', 'N/A')}")
        print(f"   Repos: {stats.get('repos', 'N/A')}\n")
        
        # Try to fetch a library
        print("3. Fetching 'lodash' docs...")
        try:
            docs = await client.get_library_docs("lodash", "latest")
            print(f"   Library ID: {docs.library_id}")
            print(f"   Version: {docs.version}")
            print(f"   Source: {docs.source}")
            print(f"   Content length: {len(docs.content)} chars")
            print(f"   Preview: {docs.content[:200]}...")
        except Exception as e:
            print(f"   Error: {e}")
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    asyncio.run(main())
