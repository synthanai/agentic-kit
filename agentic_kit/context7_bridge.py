"""
Context7 MCP Bridge for Agentic-Kit

Provides integration with Context7 for fetching versioned library documentation.
This is an optional module - gracefully degrades if Context7 is unavailable.

Usage:
    from agentic_kit import Context7Client
    
    client = Context7Client()
    docs = await client.get_library_docs("react", "18")
"""

import asyncio
import aiohttp
import logging
from dataclasses import dataclass
from typing import Optional, Dict, Any
from functools import lru_cache

logger = logging.getLogger(__name__)

# Configuration
CONTEXT7_BASE_URL = "https://context7.com/api"
CONTEXT7_TIMEOUT = 10.0
CONTEXT7_RETRIES = 2


@dataclass
class LibraryInfo:
    """Information about a resolved library."""
    name: str
    library_id: str
    version: str
    source: str = "context7"


@dataclass
class LibraryDocs:
    """Documentation content for a library."""
    library_id: str
    version: str
    content: str
    source: str
    metadata: Dict[str, Any]


class Context7Client:
    """
    Async client for Context7 MCP integration.
    
    Provides:
    - Library ID resolution
    - Versioned documentation fetching
    - Fallback mechanisms for offline usage
    """
    
    def __init__(
        self,
        base_url: str = CONTEXT7_BASE_URL,
        timeout: float = CONTEXT7_TIMEOUT,
        retries: int = CONTEXT7_RETRIES
    ):
        self.base_url = base_url
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self.retries = retries
        self._session: Optional[aiohttp.ClientSession] = None
        self._library_cache: Dict[str, str] = {}
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self._ensure_session()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
    
    async def _ensure_session(self):
        """Ensure aiohttp session is created."""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(timeout=self.timeout)
    
    async def close(self):
        """Close the HTTP session."""
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None
    
    async def _fetch_with_retry(
        self,
        url: str,
        retries: Optional[int] = None
    ) -> Optional[aiohttp.ClientResponse]:
        """Fetch URL with exponential backoff retry."""
        await self._ensure_session()
        retries = retries if retries is not None else self.retries
        
        for attempt in range(retries + 1):
            try:
                response = await self._session.get(url)
                if response.status == 200:
                    return response
                elif response.status == 404:
                    return None
            except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                if attempt == retries:
                    logger.warning(f"Failed to fetch {url}: {e}")
                    return None
                # Exponential backoff
                await asyncio.sleep(2 ** attempt * 0.1)
        
        return None
    
    async def resolve_library_id(self, name: str) -> str:
        """
        Resolve library name to Context7 library ID.
        
        Args:
            name: Library name (e.g., "react", "tailwind")
            
        Returns:
            Library ID (may be same as name if resolution fails)
        """
        # Check cache
        if name in self._library_cache:
            return self._library_cache[name]
        
        logger.debug(f"Resolving library: {name}")
        
        try:
            url = f"{self.base_url}/resolve?name={name}"
            response = await self._fetch_with_retry(url)
            
            if response:
                data = await response.json()
                library_id = data.get("libraryId", name)
                self._library_cache[name] = library_id
                return library_id
        except Exception as e:
            logger.warning(f"Library resolution failed: {e}")
        
        # Fallback: use name as ID
        self._library_cache[name] = name
        return name
    
    async def get_library_docs(
        self,
        library_name: str,
        version: str = "latest"
    ) -> LibraryDocs:
        """
        Fetch library documentation from Context7.
        
        Args:
            library_name: Library name or ID
            version: Specific version (default: "latest")
            
        Returns:
            LibraryDocs with content and metadata
        """
        library_id = await self.resolve_library_id(library_name)
        
        logger.debug(f"Fetching docs: {library_id}@{version}")
        
        # Try primary API
        content = await self._fetch_docs_api(library_id, version)
        
        if content:
            return LibraryDocs(
                library_id=library_id,
                version=version,
                content=content,
                source="context7",
                metadata={"library_name": library_name}
            )
        
        # Fallback to llms.txt
        content = await self._fetch_llms_txt(library_id)
        
        if content:
            return LibraryDocs(
                library_id=library_id,
                version=version,
                content=content,
                source="context7-llms",
                metadata={"library_name": library_name}
            )
        
        # Final fallback
        content = await self._fetch_fallback(library_name)
        
        return LibraryDocs(
            library_id=library_id,
            version=version,
            content=content,
            source="fallback",
            metadata={"library_name": library_name, "warning": "using fallback"}
        )
    
    async def _fetch_docs_api(
        self,
        library_id: str,
        version: str
    ) -> Optional[str]:
        """Fetch from Context7 docs API."""
        try:
            url = f"{self.base_url}/docs/{library_id}?version={version}"
            response = await self._fetch_with_retry(url)
            
            if response:
                data = await response.json()
                return data.get("content") or data.get("docs")
        except Exception as e:
            logger.warning(f"Docs API failed: {e}")
        
        return None
    
    async def _fetch_llms_txt(self, library_id: str) -> Optional[str]:
        """Fetch llms.txt optimized format."""
        try:
            url = f"{self.base_url}/llms/{library_id}.txt"
            response = await self._fetch_with_retry(url)
            
            if response:
                return await response.text()
        except Exception as e:
            logger.debug(f"llms.txt not available: {e}")
        
        return None
    
    async def _fetch_fallback(self, library_name: str) -> str:
        """Fallback: try common documentation sources."""
        fallback_urls = [
            f"https://raw.githubusercontent.com/{library_name}/{library_name}/main/README.md",
            f"https://raw.githubusercontent.com/{library_name}/{library_name}/master/README.md",
        ]
        
        for url in fallback_urls:
            try:
                response = await self._fetch_with_retry(url, retries=0)
                if response:
                    content = await response.text()
                    logger.info(f"Fallback succeeded: {url}")
                    return content
            except Exception:
                continue
        
        return f"# {library_name}\n\n> Documentation could not be fetched."
    
    async def is_available(self) -> bool:
        """Check if Context7 service is available."""
        try:
            url = f"{self.base_url}/health"
            response = await self._fetch_with_retry(url, retries=0)
            return response is not None
        except Exception:
            return False
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get Context7 service statistics."""
        try:
            url = f"{self.base_url}/stats"
            response = await self._fetch_with_retry(url)
            
            if response:
                return await response.json()
        except Exception:
            pass
        
        # Return cached/default stats
        return {
            "libraries": 24000,
            "repos": 65000,
            "last_updated": "unknown",
            "note": "Stats unavailable, using cached values"
        }


# Synchronous wrapper for non-async contexts
def get_library_docs_sync(
    library_name: str,
    version: str = "latest"
) -> LibraryDocs:
    """
    Synchronous wrapper for get_library_docs.
    
    Usage:
        docs = get_library_docs_sync("react", "18")
        print(docs.content)
    """
    async def _fetch():
        async with Context7Client() as client:
            return await client.get_library_docs(library_name, version)
    
    return asyncio.run(_fetch())


# Convenience function
def context7_available() -> bool:
    """Check if Context7 is available (sync)."""
    async def _check():
        async with Context7Client() as client:
            return await client.is_available()
    
    try:
        return asyncio.run(_check())
    except Exception:
        return False
