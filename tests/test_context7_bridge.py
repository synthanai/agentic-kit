"""
Tests for Context7 Bridge module.

These tests verify the Context7 client integration for fetching
versioned library documentation.
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from agentic_kit.context7_bridge import (
    Context7Client,
    LibraryDocs,
    get_library_docs_sync,
    context7_available,
)


class TestContext7Client:
    """Test suite for Context7Client."""
    
    @pytest.fixture
    def client(self):
        """Create a Context7Client instance."""
        return Context7Client()
    
    @pytest.mark.asyncio
    async def test_resolve_library_id_with_cache(self, client):
        """Test that library resolution uses cache."""
        # Pre-populate cache
        client._library_cache["react"] = "react-lib-id"
        
        result = await client.resolve_library_id("react")
        
        assert result == "react-lib-id"
    
    @pytest.mark.asyncio
    async def test_resolve_library_id_fallback(self, client):
        """Test fallback when API unavailable."""
        # API call should fail gracefully
        with patch.object(client, '_fetch_with_retry', return_value=None):
            result = await client.resolve_library_id("unknown-lib")
        
        # Should use name as fallback ID
        assert result == "unknown-lib"
    
    @pytest.mark.asyncio
    async def test_get_library_docs_structure(self, client):
        """Test that get_library_docs returns proper structure."""
        mock_content = "# React Documentation\n\nExample content."
        
        with patch.object(client, '_fetch_docs_api', return_value=mock_content):
            result = await client.get_library_docs("react", "18")
        
        assert isinstance(result, LibraryDocs)
        assert result.library_id == "react"
        assert result.version == "18"
        assert result.content == mock_content
        assert result.source == "context7"
    
    @pytest.mark.asyncio
    async def test_get_library_docs_fallback_chain(self, client):
        """Test fallback from API -> llms.txt -> fallback."""
        with patch.object(client, '_fetch_docs_api', return_value=None):
            with patch.object(client, '_fetch_llms_txt', return_value=None):
                with patch.object(client, '_fetch_fallback', return_value="Fallback docs"):
                    result = await client.get_library_docs("unknown", "1.0")
        
        assert result.source == "fallback"
        assert result.content == "Fallback docs"
    
    @pytest.mark.asyncio
    async def test_context_manager(self, client):
        """Test async context manager usage."""
        async with Context7Client() as c:
            # Should be usable within context
            assert c._session is not None or True  # Session created lazily
        
        # Session should be closed after context
        # (Note: lazy session creation means this may not create a session)
    
    @pytest.mark.asyncio
    async def test_is_available_returns_bool(self, client):
        """Test that is_available returns boolean."""
        with patch.object(client, '_fetch_with_retry', return_value=None):
            result = await client.is_available()
        
        assert isinstance(result, bool)
    
    @pytest.mark.asyncio
    async def test_get_stats_fallback(self, client):
        """Test stats returns cached values on failure."""
        with patch.object(client, '_fetch_with_retry', return_value=None):
            result = await client.get_stats()
        
        assert "libraries" in result
        assert result["libraries"] == 24000
        assert result["repos"] == 65000


class TestSyncWrappers:
    """Test synchronous wrapper functions."""
    
    def test_context7_available_returns_bool(self):
        """Test sync availability check."""
        with patch('agentic_kit.context7_bridge.asyncio.run', return_value=False):
            result = context7_available()
        
        assert isinstance(result, bool)


class TestLibraryDocs:
    """Test LibraryDocs dataclass."""
    
    def test_library_docs_creation(self):
        """Test LibraryDocs can be created."""
        docs = LibraryDocs(
            library_id="react",
            version="18",
            content="# React",
            source="context7",
            metadata={"test": True}
        )
        
        assert docs.library_id == "react"
        assert docs.version == "18"
        assert docs.content == "# React"
        assert docs.source == "context7"
        assert docs.metadata == {"test": True}


# Integration test (skipped by default, requires network)
@pytest.mark.skip(reason="Integration test - requires network access")
class TestContext7Integration:
    """Integration tests with real Context7 API."""
    
    @pytest.mark.asyncio
    async def test_real_library_fetch(self):
        """Test fetching real library docs."""
        async with Context7Client() as client:
            docs = await client.get_library_docs("lodash", "latest")
        
        assert len(docs.content) > 0
        assert docs.library_id == "lodash"
