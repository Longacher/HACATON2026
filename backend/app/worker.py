"""RabbitMQ worker: consumes events, обновляет Redis-агрегаты и граф/векторные данные.

Запуск: python -m app.worker
"""

import json
import time
import os

import pika

from app.services.analytics_redis import aggregator
from app.services.vectors import embed_text, vector_store
from app.services.graph import graph

AMQP_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
EXCHANGE = "otklik.events"

routing_bindings = [
    ("appeal.*", "analytics_queue"),
    ("appeal.created", "index_queue"),
]


def _on_analytics(ch, method, properties, body):
    try:
        event = json.loads(body)
        aggregator.record(event)
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as exc:
        print("worker analytics error:", exc)
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


def _on_index(ch, method, properties, body):
    try:
        event = json.loads(body)
        appeal_id = event.get("appeal_id")
        text = event.get("free_text", "") or ""
        answers = " ".join(str(v) for v in (event.get("answers") or {}).values())
        vector_store.ensure_collection()
        vector_store.upsert(appeal_id, embed_text(text + " " + answers))
        graph.create_appeal_node(appeal_id, text)
        # похожие → связь
        similar = vector_store.search(embed_text(text + " " + answers), top_k=3, exclude=appeal_id)
        similar_ids = [s["appeal_id"] for s in similar if s.get("appeal_id")]
        if similar_ids:
            graph.link_related(appeal_id, similar_ids)
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as exc:
        print("worker index error:", exc)
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


def main():
    conn = pika.BlockingConnection(pika.URLParameters(AMQP_URL))
    channel = conn.channel()
    channel.exchange_declare(exchange=EXCHANGE, exchange_type="topic", durable=True)

    for binding, queue in routing_bindings:
        channel.queue_declare(queue=queue, durable=True)
        channel.queue_bind(exchange=EXCHANGE, queue=queue, routing_key=binding)

    channel.basic_qos(prefetch_count=10)
    channel.basic_consume(queue="analytics_queue", on_message_callback=_on_analytics, auto_ack=False)
    channel.basic_consume(queue="index_queue", on_message_callback=_on_index, auto_ack=False)

    print("Worker стартовал, слушает события...")
    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        channel.stop_consuming()
    conn.close()


if __name__ == "__main__":
    main()