"""Tests for agentic_kit.memory module."""

import pytest
import tempfile
import os
from pathlib import Path

from agentic_kit.memory import SemanticMemoryStore, SimpleMemoryStore, StoredItem


class TestSemanticMemoryStore:
    """Tests for SemanticMemoryStore."""
    
    def test_init_default(self):
        """Test default initialization."""
        store = SemanticMemoryStore()
        assert len(store) == 0
        assert store.similarity_threshold == 0.5
    
    def test_add_item(self):
        """Test adding an item."""
        store = SemanticMemoryStore()
        item_id = store.add({
            "id": "test-001",
            "question": "Should we migrate?",
            "answer": "Yes"
        })
        
        assert item_id == "test-001"
        assert len(store) == 1
    
    def test_add_generates_id(self):
        """Test that ID is generated if not provided."""
        store = SemanticMemoryStore()
        item_id = store.add({"question": "Test question"})
        
        assert item_id.startswith("item-")
        assert len(store) == 1
    
    def test_query_empty_store(self):
        """Test querying empty store."""
        store = SemanticMemoryStore()
        results = store.query("anything")
        
        assert results == []
    
    def test_query_returns_results(self):
        """Test basic query returns results."""
        store = SimpleMemoryStore()  # Use keyword matching
        store.similarity_threshold = 0.0  # Allow all results
        
        store.add({"id": "1", "content": "microservice migration plan"})
        store.add({"id": "2", "content": "database upgrade strategy"})
        
        results = store.query("microservice", limit=5)
        
        assert len(results) >= 1
        assert any("microservice" in str(r) for r in results)
    
    def test_get_item(self):
        """Test getting item by ID."""
        store = SemanticMemoryStore()
        store.add({"id": "test-001", "data": "value"})
        
        item = store.get("test-001")
        assert item is not None
        assert item["data"] == "value"
    
    def test_get_nonexistent(self):
        """Test getting nonexistent item."""
        store = SemanticMemoryStore()
        item = store.get("nonexistent")
        
        assert item is None
    
    def test_remove_item(self):
        """Test removing item."""
        store = SemanticMemoryStore()
        store.add({"id": "test-001", "data": "value"})
        
        assert store.remove("test-001") is True
        assert len(store) == 0
    
    def test_remove_nonexistent(self):
        """Test removing nonexistent item."""
        store = SemanticMemoryStore()
        assert store.remove("nonexistent") is False
    
    def test_update_existing(self):
        """Test updating existing item."""
        store = SemanticMemoryStore()
        store.add({"id": "test-001", "version": 1})
        store.add({"id": "test-001", "version": 2})
        
        assert len(store) == 1
        item = store.get("test-001")
        assert item["version"] == 2
    
    def test_custom_scorer(self):
        """Test custom scorer function."""
        def high_scorer(data):
            return 10.0 if data.get("priority") == "high" else 1.0
        
        store = SemanticMemoryStore(scorer=high_scorer)
        store.add({"id": "1", "priority": "high"})
        store.add({"id": "2", "priority": "low"})
        
        assert len(store) == 2
    
    def test_stats(self):
        """Test stats method."""
        store = SemanticMemoryStore()
        store.add({"id": "1"})
        store.add({"id": "2"})
        
        stats = store.stats()
        
        assert stats["total_items"] == 2
        assert "has_embeddings" in stats


class TestSimpleMemoryStore:
    """Tests for SimpleMemoryStore (keyword-based)."""
    
    def test_no_embeddings(self):
        """Test that SimpleMemoryStore has no embeddings."""
        store = SimpleMemoryStore()
        assert store.has_embeddings is False
        assert store.model is None
    
    def test_keyword_matching(self):
        """Test keyword-based matching."""
        store = SimpleMemoryStore()
        store.similarity_threshold = 0.0
        
        store.add({"id": "1", "content": "apple banana cherry"})
        store.add({"id": "2", "content": "dog cat mouse"})
        
        results = store.query("apple", limit=5)
        
        assert len(results) >= 1


class TestPersistence:
    """Tests for memory persistence."""
    
    def test_save_and_load(self):
        """Test saving and loading from disk."""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "memory.json")
            
            # Create and save
            store1 = SimpleMemoryStore(persist_path=path)
            store1.add({"id": "1", "data": "test"})
            
            # Load in new instance
            store2 = SimpleMemoryStore(persist_path=path)
            
            assert len(store2) == 1
            assert store2.get("1")["data"] == "test"
