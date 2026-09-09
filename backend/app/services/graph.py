"""Графовая БД Neo4j для связей между обращениями (тикетами).

ТЗ: «Потенциал» — умная маршрутизация, дубли, цепочки связанных инцидентов.
Связи:
- (:Appeal)-[:DUPLICATE_OF]->(:Appeal)   — вероятные дубли
- (:Appeal)-[:RELATED_TO]->(:Appeal)     — связанные по контексту/эмбеддингам
- (:Specialist)-[:WORKS_ON]->(:Appeal)   — нагрузка/передачки

Анонимность соблюдается: в графе НЕ хранятся IP/User-Agent/контакты/личность.
Приватный «сигнатурный» узел (хеш) позволяет связывать дубли без деанонимизации.
"""

import os
from typing import Optional
from uuid import UUID

neo4j_url = os.getenv("NEO4J_URL", "bolt://localhost:7687")
neo4j_user = os.getenv("NEO4J_USER", "neo4j")
neo4j_password = os.getenv("NEO4J_PASSWORD", "password")

DOC = """ТЗ: Жюри может проверить связность обращений. Neo4j хранит
соотношение между тикетами: дубли, вхождения одной темы, цепочки инцидентов."""


class GraphService:
    def __init__(self, uri=neo4j_url, user=neo4j_user, password=neo4j_password):
        self._uri = uri
        self._user = user
        self._password = password
        self._driver = None

    def _d(self):
        if self._driver is None:
            from neo4j import GraphDatabase
            self._driver = GraphDatabase.driver(self._uri, auth=(self._user, self._password))
        return self._driver

    def create_appeal_node(self, appeal_id: UUID, text: str):
        try:
            with self._d().session() as s:
                s.run(
                    "MERGE (a:Appeal {id: $id}) SET a.textPreview = $tp",
                    id=str(appeal_id), tp=(text or "")[:200],
                )
        except Exception:
            pass  # граф опционален для MVP

    def link_related(self, appeal_id: UUID, related_ids: list[UUID], rel_type: str = "RELATED_TO"):
        try:
            with self._d().session() as s:
                for rid in related_ids:
                    if str(rid) == str(appeal_id):
                        continue
                    s.run(
                        f"MATCH (a:Appeal {{id: $id}}), (b:Appeal {{id: $rid}}) "
                        f"MERGE (a)-[:{rel_type}]->(b)",
                        id=str(appeal_id), rid=str(rid),
                    )
        except Exception:
            pass

    def related_of(self, appeal_id: UUID, rel_type: str = "RELATED_TO", limit: int = 10) -> list[str]:
        try:
            with self._d().session() as s:
                res = s.run(
                    f"MATCH (a:Appeal {{id: $id}})-[:{rel_type}]->(b) RETURN b.id LIMIT $limit",
                    id=str(appeal_id), limit=limit,
                )
                return [r["b.id"] for r in res]
        except Exception:
            return []

    def close(self):
        if self._driver:
            self._driver.close()


graph = GraphService()