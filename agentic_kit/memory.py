"""
Semantic Memory Store

Embedding-based memory retrieval with fallback to keyword matching.
Stores items with embeddings for similarity search.

Usage:
    from agentic_kit import SemanticMemoryStore
    
    store = SemanticMemoryStore()
    store.add({"id": "001", "question": "Should we migrate?", "answer": "Yes"})
    
    similar = store.query("migration strategy", limit=5)
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple, Callable
import json
import hashlib
from pathlib import Path

# Try to import sentence transformers
try:
    from sentence_transformers import SentenceTransformer
    import numpy as np
    HAS_EMBEDDINGS = True
except Exception:
    HAS_EMBEDDINGS = False


@dataclass
class StoredItem:
    """An item stored in memory with embedding."""
    item_id: str
    content: str
    score: float
    embedding: Optional[List[float]]
    created_at: str
    data: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)


class SemanticMemoryStore:
    """
    Semantic memory store with embedding-based similarity search.
    
    Falls back to keyword matching if sentence-transformers not available.
    
    Args:
        model_name: Name of sentence-transformers model (default: all-MiniLM-L6-v2)
        persist_path: Optional path to persist memory to disk
        similarity_threshold: Minimum similarity score to return (0-1)
        scorer: Optional callable to compute score for stored items
    """
    
    DEFAULT_MODEL = "all-MiniLM-L6-v2"
    
    def __init__(
        self,
        model_name: str = DEFAULT_MODEL,
        persist_path: Optional[str] = None,
        similarity_threshold: float = 0.5,
        scorer: Optional[Callable[[Dict[str, Any]], float]] = None
    ):
        self.persist_path = Path(persist_path) if persist_path else None
        self.similarity_threshold = similarity_threshold
        self.scorer = scorer or self._default_scorer
        self.items: List[StoredItem] = []
        
        # Initialize embedding model if available
        self.model = None
        if HAS_EMBEDDINGS:
            try:
                self.model = SentenceTransformer(model_name)
                self.has_embeddings = True
            except Exception as e:
                print(f"⚠️ Could not load embedding model: {e}")
                self.has_embeddings = False
        else:
            self.has_embeddings = False
        
        # Load persisted data
        if self.persist_path and self.persist_path.exists():
            self._load()
    
    def add(
        self,
        data: Dict[str, Any],
        content_fields: List[str] = None,
        id_field: str = "id"
    ) -> str:
        """
        Add an item to memory.
        
        Args:
            data: Dictionary containing the item data
            content_fields: Fields to use for embedding (default: ["question", "answer", "content"])
            id_field: Field to use as ID (default: "id")
            
        Returns:
            The generated or extracted ID
        """
        content_fields = content_fields or ["question", "answer", "content", "title", "description"]
        
        # Generate ID
        item_id = data.get(id_field) or self._generate_id(str(data))
        
        # Extract content for embedding
        content_parts = [str(data.get(f, "")) for f in content_fields if data.get(f)]
        content = " ".join(content_parts) or str(data)
        
        # Calculate score
        score = self.scorer(data)
        
        # Generate embedding
        embedding = None
        if self.has_embeddings and content:
            embedding = self.model.encode(content).tolist()
        
        # Create stored item
        item = StoredItem(
            item_id=item_id,
            content=content,
            score=score,
            embedding=embedding,
            created_at=datetime.now().isoformat(),
            data=data,
            metadata={}
        )
        
        # Add to store (update if exists)
        existing_idx = next(
            (i for i, d in enumerate(self.items) if d.item_id == item_id),
            None
        )
        if existing_idx is not None:
            self.items[existing_idx] = item
        else:
            self.items.append(item)
        
        # Persist
        if self.persist_path:
            self._save()
        
        return item_id
    
    def query(
        self,
        query: str,
        limit: int = 5,
        min_score: float = 0.0,
        filter_fn: Optional[Callable[[StoredItem], bool]] = None
    ) -> List[Dict[str, Any]]:
        """
        Query similar items from memory.
        
        Args:
            query: Search query string
            limit: Maximum number of results
            min_score: Minimum item score to include
            filter_fn: Optional function to filter items
            
        Returns:
            List of data dicts, most similar first
        """
        if not self.items:
            return []
        
        # Filter by score and custom filter
        candidates = [d for d in self.items if d.score >= min_score]
        if filter_fn:
            candidates = [d for d in candidates if filter_fn(d)]
        
        if not candidates:
            return []
        
        # Rank by similarity
        if self.has_embeddings:
            ranked = self._rank_by_embedding(query, candidates)
        else:
            ranked = self._rank_by_keywords(query, candidates)
        
        # Filter by threshold and limit
        results = [
            d.data for d, score in ranked
            if score >= self.similarity_threshold
        ][:limit]
        
        return results
    
    def get(self, item_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific item by ID."""
        for item in self.items:
            if item.item_id == item_id:
                return item.data
        return None
    
    def remove(self, item_id: str) -> bool:
        """Remove an item by ID."""
        for i, item in enumerate(self.items):
            if item.item_id == item_id:
                self.items.pop(i)
                if self.persist_path:
                    self._save()
                return True
        return False
    
    def _rank_by_embedding(
        self,
        query: str,
        candidates: List[StoredItem]
    ) -> List[Tuple[StoredItem, float]]:
        """Rank candidates by embedding similarity."""
        query_embedding = np.array(self.model.encode(query))
        
        scored = []
        for item in candidates:
            if item.embedding:
                candidate_embedding = np.array(item.embedding)
                # Cosine similarity
                similarity = np.dot(query_embedding, candidate_embedding) / (
                    np.linalg.norm(query_embedding) * np.linalg.norm(candidate_embedding)
                )
                scored.append((item, float(similarity)))
            else:
                scored.append((item, 0.0))
        
        return sorted(scored, key=lambda x: x[1], reverse=True)
    
    def _rank_by_keywords(
        self,
        query: str,
        candidates: List[StoredItem]
    ) -> List[Tuple[StoredItem, float]]:
        """Rank candidates by keyword overlap (fallback)."""
        query_words = set(query.lower().split())
        
        scored = []
        for item in candidates:
            doc_words = set(item.content.lower().split())
            
            # Jaccard similarity
            intersection = len(query_words & doc_words)
            union = len(query_words | doc_words)
            similarity = intersection / union if union > 0 else 0.0
            
            scored.append((item, similarity))
        
        return sorted(scored, key=lambda x: x[1], reverse=True)
    
    def _default_scorer(self, data: Dict[str, Any]) -> float:
        """Default scorer returns 1.0 for all items."""
        return 1.0
    
    def _generate_id(self, content: str) -> str:
        """Generate unique ID from content and timestamp."""
        data = f"{content}{datetime.now().isoformat()}"
        return f"item-{hashlib.sha256(data.encode()).hexdigest()[:12]}"
    
    def _save(self):
        """Persist items to disk."""
        if not self.persist_path:
            return
        
        self.persist_path.parent.mkdir(parents=True, exist_ok=True)
        
        data = []
        for item in self.items:
            data.append({
                "item_id": item.item_id,
                "content": item.content,
                "score": item.score,
                "embedding": item.embedding,
                "created_at": item.created_at,
                "data": item.data,
                "metadata": item.metadata
            })
        
        with open(self.persist_path, 'w') as f:
            json.dump(data, f, indent=2)
    
    def _load(self):
        """Load items from disk."""
        if not self.persist_path or not self.persist_path.exists():
            return
        
        try:
            with open(self.persist_path, 'r') as f:
                data = json.load(f)
            
            self.items = [
                StoredItem(
                    item_id=d["item_id"],
                    content=d["content"],
                    score=d["score"],
                    embedding=d.get("embedding"),
                    created_at=d["created_at"],
                    data=d["data"],
                    metadata=d.get("metadata", {})
                )
                for d in data
            ]
        except Exception as e:
            print(f"⚠️ Could not load memory: {e}")
            self.items = []
    
    def __len__(self) -> int:
        return len(self.items)
    
    def stats(self) -> Dict[str, Any]:
        """Return memory statistics."""
        return {
            "total_items": len(self.items),
            "has_embeddings": self.has_embeddings,
            "persist_path": str(self.persist_path) if self.persist_path else None
        }


class SimpleMemoryStore(SemanticMemoryStore):
    """Simple keyword-based memory store without embeddings."""
    
    def __init__(self, persist_path: Optional[str] = None):
        super().__init__(persist_path=persist_path)
        self.has_embeddings = False
        self.model = None


if __name__ == "__main__":
    # Demo
    store = SemanticMemoryStore()
    
    store.add({
        "id": "decision-001",
        "question": "Should we migrate to microservices?",
        "answer": "Yes, with phased approach"
    })
    
    store.add({
        "id": "decision-002", 
        "question": "Should we upgrade the database?",
        "answer": "No, current capacity is sufficient"
    })
    
    results = store.query("microservice migration", limit=3)
    print(f"Found {len(results)} similar items")
    for r in results:
        print(f"  - {r.get('question')}")
    
    print(f"\nStats: {store.stats()}")
