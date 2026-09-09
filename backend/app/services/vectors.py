"""Векторные данные в Milvus (ТЗ: потенциал, автоклассификация, похожие обращения).

Используется для:
- векторного поиска похожих обращений (дубли, цепочки инцидентов);
- эмбеддинг свободного текста + ответов на уточняющие вопросы.

Векторы считаем простым TF/char-грамм хэшем (без внешнего ML), чтобы MVP работал офлайн.
В проде заменяется на эмбеддинги (sentence-transformers и т.д.).
"""

import hashlib
import os
from typing import Iterable

milvus_url = os.getenv("MILVUS_URL", "localhost:19530")
COLLECTION = "otklik_appeals"
DIM = 256


def embed_text(text: str, dim: int = DIM) -> list[float]:
    """Грубый эмбеддинг char-граммами (детерминированный, без внешних моделей)."""
    vec = [0.0] * dim
    norm = max(len(text), 1)
    grams = set()
    t = (text or "").lower()
    for i in range(max(0, len(t) - 2)):
        grams.add(t[i:i + 3])
    for g in grams:
        h = int(hashlib.sha256(g.encode()).hexdigest()[:8], 16)
        vec[h % dim] += 1
    total = sum(vec) or 1.0
    return [v / total for v in vec]


class VectorStore:
    def __init__(self):
        self._client = None

    def _c(self):
        if self._client is None:
            from pymilvus import MilvusClient
            self._client = MilvusClient(uri=f"http://{milvus_url}")
        return self._client

    def ensure_collection(self):
        c = self._c()
        if not c.has_collection(COLLECTION):
            from pymilvus import CollectionSchema, DataType, FieldSchema
            fields = [
                FieldSchema(name="appeal_id", dtype=DataType.VARCHAR, max_length=64, is_primary=True),
                FieldSchema(name="vector", dtype=DataType.FLOAT_VECTOR, dim=DIM),
            ]
            schema = CollectionSchema(fields, description="appeals")
            c.create_collection(COLLECTION, schema=schema, metric_type="COSINE")
        try:
            if not c.list_indexes(COLLECTION):
                index_params = c.prepare_index_params()
                index_params.add_index(field_name="vector", index_type="AUTOINDEX", metric_type="COSINE")
                c.create_index(COLLECTION, index_params)
        except Exception:
            pass
        try:
            c.load_collection(COLLECTION)
        except Exception:
            pass

    def upsert(self, appeal_id: str, vector: list[float]):
        try:
            self._c().upsert(COLLECTION, data=[{"appeal_id": appeal_id, "vector": vector}])
        except Exception:
            pass  # Milvus может быть недоступен — не роняем основной путь

    def search(self, vector: list[float], top_k: int = 5, exclude: str | None = None) -> list[dict]:
        try:
            res = self._c().search(COLLECTION, data=[vector], limit=top_k, output_fields=["appeal_id"])
            out = []
            for hit in (res[0] if res else []):
                rid = hit.get("entity", {}).get("appeal_id")
                if rid and rid != exclude:
                    out.append({"appeal_id": rid, "score": hit.get("distance")})
            return out
        except Exception:
            return []


vector_store = VectorStore()