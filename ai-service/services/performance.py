# -*- coding: utf-8 -*-
"""
AegisFlow AI — Performance Optimization Utilities
Caching, batch processing, và async improvements.
"""

import time
import asyncio
import hashlib
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass
from collections import OrderedDict
from functools import wraps
import threading


@dataclass
class CacheEntry:
    """Một entry trong cache."""
    key: str
    value: Any
    created_at: datetime
    expires_at: datetime
    hits: int = 0


class LRUCache:
    """
    LRU Cache với TTL support.
    Thread-safe implementation.
    """
    
    def __init__(self, max_size: int = 1000, default_ttl_seconds: int = 300):
        self.max_size = max_size
        self.default_ttl = default_ttl_seconds
        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = threading.RLock()
        self._hits = 0
        self._misses = 0
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        with self._lock:
            if key not in self._cache:
                self._misses += 1
                return None
            
            entry = self._cache[key]
            
            # Check expiration
            if datetime.now() > entry.expires_at:
                del self._cache[key]
                self._misses += 1
                return None
            
            # Move to end (most recently used)
            self._cache.move_to_end(key)
            entry.hits += 1
            self._hits += 1
            
            return entry.value
    
    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None):
        """Set value in cache."""
        with self._lock:
            ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl
            now = datetime.now()
            
            # Remove if exists
            if key in self._cache:
                del self._cache[key]
            
            # Evict oldest if at capacity
            while len(self._cache) >= self.max_size:
                self._cache.popitem(last=False)
            
            # Add new entry
            self._cache[key] = CacheEntry(
                key=key,
                value=value,
                created_at=now,
                expires_at=now + timedelta(seconds=ttl),
            )
    
    def delete(self, key: str) -> bool:
        """Delete key from cache."""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False
    
    def clear(self):
        """Clear all cache."""
        with self._lock:
            self._cache.clear()
            self._hits = 0
            self._misses = 0
    
    def stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self._lock:
            total = self._hits + self._misses
            hit_rate = self._hits / total if total > 0 else 0
            
            return {
                "size": len(self._cache),
                "max_size": self.max_size,
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate": round(hit_rate, 4),
            }


# Global cache instances
_flood_risk_cache = LRUCache(max_size=500, default_ttl_seconds=60)
_prediction_cache = LRUCache(max_size=200, default_ttl_seconds=300)
_route_cache = LRUCache(max_size=100, default_ttl_seconds=600)


def cache_key(*args, **kwargs) -> str:
    """Generate cache key from arguments."""
    key_data = {
        "args": args,
        "kwargs": kwargs,
    }
    key_str = json.dumps(key_data, sort_keys=True, default=str)
    return hashlib.md5(key_str.encode()).hexdigest()


def cached(cache: LRUCache, ttl_seconds: Optional[int] = None):
    """Decorator for caching function results."""
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            key = f"{func.__name__}:{cache_key(*args, **kwargs)}"
            
            # Try cache
            result = cache.get(key)
            if result is not None:
                return result
            
            # Compute and cache
            result = func(*args, **kwargs)
            cache.set(key, result, ttl_seconds)
            
            return result
        return wrapper
    return decorator


def async_cached(cache: LRUCache, ttl_seconds: Optional[int] = None):
    """Decorator for caching async function results."""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            key = f"{func.__name__}:{cache_key(*args, **kwargs)}"
            
            result = cache.get(key)
            if result is not None:
                return result
            
            result = await func(*args, **kwargs)
            cache.set(key, result, ttl_seconds)
            
            return result
        return wrapper
    return decorator


class BatchProcessor:
    """
    Batch processor cho multiple requests.
    Giảm số lần gọi ML model.
    """
    
    def __init__(self, batch_size: int = 10, max_wait_ms: int = 100):
        self.batch_size = batch_size
        self.max_wait_ms = max_wait_ms
        self._queue: List[tuple] = []
        self._lock = threading.Lock()
        self._event = threading.Event()
    
    def add(self, item_id: str, data: Any, callback: Callable) -> None:
        """Add item to batch queue."""
        with self._lock:
            self._queue.append({
                "id": item_id,
                "data": data,
                "callback": callback,
                "added_at": time.time(),
            })
    
    async def process(self, processor_func: Callable) -> List[Any]:
        """Process batch with provided function."""
        with self._lock:
            if not self._queue:
                return []
            
            batch = self._queue[:self.batch_size]
            self._queue = self._queue[self.batch_size:]
        
        # Process batch
        results = []
        for item in batch:
            try:
                result = await processor_func(item["data"])
                item["callback"](result)
                results.append({"id": item["id"], "success": True, "result": result})
            except Exception as e:
                item["callback"](None)
                results.append({"id": item["id"], "success": False, "error": str(e)})
        
        return results


class RateLimiter:
    """
    Simple rate limiter using token bucket algorithm.
    """
    
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: List[float] = []
        self._lock = threading.Lock()
    
    def is_allowed(self) -> bool:
        """Check if request is allowed."""
        with self._lock:
            now = time.time()
            cutoff = now - self.window_seconds
            
            # Remove old requests
            self._requests = [t for t in self._requests if t > cutoff]
            
            if len(self._requests) >= self.max_requests:
                return False
            
            self._requests.append(now)
            return True
    
    def wait_time(self) -> float:
        """Get seconds to wait before next request."""
        with self._lock:
            if len(self._requests) < self.max_requests:
                return 0
            
            oldest = self._requests[0]
            return max(0, self.window_seconds - (time.time() - oldest))


class PerformanceMonitor:
    """
    Monitor performance metrics.
    """
    
    def __init__(self):
        self._metrics: Dict[str, List[float]] = {}
        self._lock = threading.Lock()
    
    def record(self, metric_name: str, value: float):
        """Record a metric value."""
        with self._lock:
            if metric_name not in self._metrics:
                self._metrics[metric_name] = []
            
            self._metrics[metric_name].append(value)
            
            # Keep last 1000 values
            if len(self._metrics[metric_name]) > 1000:
                self._metrics[metric_name] = self._metrics[metric_name][-1000:]
    
    def get_stats(self, metric_name: str) -> Dict[str, float]:
        """Get statistics for a metric."""
        with self._lock:
            values = self._metrics.get(metric_name, [])
            
            if not values:
                return {"count": 0}
            
            sorted_values = sorted(values)
            
            return {
                "count": len(values),
                "min": min(values),
                "max": max(values),
                "avg": sum(values) / len(values),
                "p50": sorted_values[len(values) // 2],
                "p95": sorted_values[int(len(values) * 0.95)],
                "p99": sorted_values[int(len(values) * 0.99)],
            }
    
    def get_all_stats(self) -> Dict[str, Dict[str, float]]:
        """Get statistics for all metrics."""
        with self._lock:
            return {name: self.get_stats(name) for name in self._metrics.keys()}


# Global performance monitor
_performance_monitor = PerformanceMonitor()


def get_performance_monitor() -> PerformanceMonitor:
    """Get global performance monitor."""
    return _performance_monitor


def get_flood_risk_cache() -> LRUCache:
    """Get flood risk cache."""
    return _flood_risk_cache


def get_prediction_cache() -> LRUCache:
    """Get prediction cache."""
    return _prediction_cache


def get_route_cache() -> LRUCache:
    """Get route cache."""
    return _route_cache


# Performance monitoring decorator
def monitor(metric_name: str):
    """Decorator to monitor function performance."""
    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start = time.time()
            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                elapsed = (time.time() - start) * 1000
                _performance_monitor.record(f"{metric_name}_ms", elapsed)
                _performance_monitor.record(f"{metric_name}_success", 1)
        return async_wrapper
    return decorator
