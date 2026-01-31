"""
OpenClaw Model Fallback Chain for ARIVAR

Implements graceful degradation across multiple LLM providers.
Based on Peter Steinberger's pattern from Oracle.

Author: SYNTHAI Team
Version: 1.0.0
"""

import asyncio
import logging
import os
from dataclasses import dataclass
from enum import Enum
from typing import Optional, List, Callable, Any
from pathlib import Path
import json

logger = logging.getLogger(__name__)


class ModelProvider(Enum):
    """Supported model providers."""
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    GOOGLE = "google"
    OLLAMA = "ollama"


@dataclass
class ModelConfig:
    """Configuration for a single model."""
    provider: ModelProvider
    model_id: str
    api_key_env: str
    base_url: Optional[str] = None
    max_tokens: int = 4096
    temperature: float = 0.7


# Default fallback chain (configurable via config.json)
DEFAULT_FALLBACK_CHAIN: List[ModelConfig] = [
    ModelConfig(
        provider=ModelProvider.ANTHROPIC,
        model_id="claude-opus-4",
        api_key_env="ANTHROPIC_API_KEY",
    ),
    ModelConfig(
        provider=ModelProvider.OPENAI,
        model_id="gpt-5.2-pro",
        api_key_env="OPENAI_API_KEY",
    ),
    ModelConfig(
        provider=ModelProvider.GOOGLE,
        model_id="gemini-3-pro",
        api_key_env="GOOGLE_API_KEY",
    ),
    ModelConfig(
        provider=ModelProvider.OLLAMA,
        model_id="llama-3.1-70b",
        api_key_env="",  # Ollama doesn't need API key
        base_url="http://localhost:11434",
    ),
]


class FallbackError(Exception):
    """All providers in fallback chain exhausted."""
    pass


class RetryableError(Exception):
    """Error that should trigger retry with next provider."""
    pass


async def invoke_anthropic(
    prompt: str,
    model: str,
    api_key: str,
    max_tokens: int = 4096,
    temperature: float = 0.7,
) -> str:
    """Invoke Anthropic Claude API."""
    try:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=api_key)
        response = await client.messages.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text
    except anthropic.RateLimitError as e:
        raise RetryableError(f"Anthropic rate limit: {e}")
    except anthropic.APIConnectionError as e:
        raise RetryableError(f"Anthropic connection error: {e}")
    except Exception as e:
        logger.error(f"Anthropic error: {e}")
        raise


async def invoke_openai(
    prompt: str,
    model: str,
    api_key: str,
    max_tokens: int = 4096,
    temperature: float = 0.7,
) -> str:
    """Invoke OpenAI API."""
    try:
        import openai
        client = openai.AsyncOpenAI(api_key=api_key)
        response = await client.chat.completions.create(
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content
    except openai.RateLimitError as e:
        raise RetryableError(f"OpenAI rate limit: {e}")
    except openai.APIConnectionError as e:
        raise RetryableError(f"OpenAI connection error: {e}")
    except Exception as e:
        logger.error(f"OpenAI error: {e}")
        raise


async def invoke_google(
    prompt: str,
    model: str,
    api_key: str,
    max_tokens: int = 4096,
    temperature: float = 0.7,
) -> str:
    """Invoke Google Gemini API."""
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=model,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                max_output_tokens=max_tokens,
                temperature=temperature,
            ),
        )
        return response.text
    except Exception as e:
        if "quota" in str(e).lower() or "rate" in str(e).lower():
            raise RetryableError(f"Google rate limit: {e}")
        logger.error(f"Google error: {e}")
        raise


async def invoke_ollama(
    prompt: str,
    model: str,
    base_url: str = "http://localhost:11434",
    max_tokens: int = 4096,
    temperature: float = 0.7,
    **kwargs,
) -> str:
    """Invoke local Ollama API."""
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "options": {
                        "num_predict": max_tokens,
                        "temperature": temperature,
                    },
                    "stream": False,
                },
                timeout=120.0,
            )
            response.raise_for_status()
            return response.json()["response"]
    except httpx.ConnectError as e:
        raise RetryableError(f"Ollama not running: {e}")
    except Exception as e:
        logger.error(f"Ollama error: {e}")
        raise


# Provider dispatch map
PROVIDER_INVOKERS = {
    ModelProvider.ANTHROPIC: invoke_anthropic,
    ModelProvider.OPENAI: invoke_openai,
    ModelProvider.GOOGLE: invoke_google,
    ModelProvider.OLLAMA: invoke_ollama,
}


async def invoke_with_fallback(
    prompt: str,
    fallback_chain: Optional[List[ModelConfig]] = None,
    max_tokens: int = 4096,
    temperature: float = 0.7,
) -> tuple[str, ModelConfig]:
    """
    Invoke LLM with fallback chain.
    
    Returns tuple of (response, model_config_used).
    Raises FallbackError if all providers exhausted.
    """
    chain = fallback_chain or DEFAULT_FALLBACK_CHAIN
    
    for config in chain:
        # Get API key from environment
        api_key = os.getenv(config.api_key_env, "") if config.api_key_env else ""
        
        # Skip if no API key (except Ollama)
        if config.provider != ModelProvider.OLLAMA and not api_key:
            logger.debug(f"Skipping {config.provider.value}: no API key")
            continue
        
        invoker = PROVIDER_INVOKERS[config.provider]
        
        try:
            logger.info(f"Trying {config.provider.value}/{config.model_id}")
            
            if config.provider == ModelProvider.OLLAMA:
                response = await invoker(
                    prompt=prompt,
                    model=config.model_id,
                    base_url=config.base_url or "http://localhost:11434",
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
            else:
                response = await invoker(
                    prompt=prompt,
                    model=config.model_id,
                    api_key=api_key,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
            
            logger.info(f"Success with {config.provider.value}/{config.model_id}")
            return response, config
            
        except RetryableError as e:
            logger.warning(f"{config.provider.value} failed (retryable): {e}")
            continue
        except Exception as e:
            logger.error(f"{config.provider.value} failed (non-retryable): {e}")
            continue
    
    raise FallbackError("All providers in fallback chain exhausted")


def load_fallback_chain_from_config(config_path: Optional[Path] = None) -> List[ModelConfig]:
    """Load fallback chain from config file."""
    if config_path is None:
        config_path = Path.home() / ".arivar" / "config.json"
    
    if not config_path.exists():
        return DEFAULT_FALLBACK_CHAIN
    
    try:
        with open(config_path) as f:
            # Strip JSONC comments
            content = "\n".join(
                line for line in f.readlines()
                if not line.strip().startswith("//")
            )
            config = json.loads(content)
        
        chain_specs = config.get("models", {}).get("fallback_chain", [])
        chain = []
        
        for spec in chain_specs:
            # Parse "provider/model" format
            if "/" in spec:
                provider_str, model_id = spec.split("/", 1)
                provider = ModelProvider(provider_str)
                chain.append(ModelConfig(
                    provider=provider,
                    model_id=model_id,
                    api_key_env=f"{provider_str.upper()}_API_KEY",
                    base_url=config.get("models", {}).get("ollama_base_url")
                    if provider == ModelProvider.OLLAMA else None,
                ))
        
        return chain if chain else DEFAULT_FALLBACK_CHAIN
        
    except Exception as e:
        logger.warning(f"Failed to load config, using defaults: {e}")
        return DEFAULT_FALLBACK_CHAIN


# Convenience function for ARIVAR integration
async def arivar_invoke(
    prompt: str,
    model_override: Optional[str] = None,
    **kwargs,
) -> tuple[str, str]:
    """
    ARIVAR-specific model invocation.
    
    Returns tuple of (response, model_used_string).
    """
    chain = load_fallback_chain_from_config()
    
    # If model override specified, try that first
    if model_override:
        for config in chain:
            if f"{config.provider.value}/{config.model_id}" == model_override:
                chain = [config] + [c for c in chain if c != config]
                break
    
    response, config_used = await invoke_with_fallback(
        prompt=prompt,
        fallback_chain=chain,
        **kwargs,
    )
    
    return response, f"{config_used.provider.value}/{config_used.model_id}"


# GAUGE event logging hook
def log_invocation_to_gauge(
    prompt: str,
    response: str,
    model_used: str,
    duration_ms: int,
    session_id: Optional[str] = None,
):
    """Log model invocation as GAUGE event for metacognitive learning."""
    event = {
        "event": "model.invocation.complete",
        "model": model_used,
        "prompt_tokens": len(prompt.split()),  # Rough estimate
        "response_tokens": len(response.split()),
        "duration_ms": duration_ms,
        "session_id": session_id,
        "timestamp": __import__("datetime").datetime.now().isoformat(),
    }
    logger.info(json.dumps(event))
    
    # TODO: Emit to GAUGE event bus when available
    # gauge_bus.emit(event)
