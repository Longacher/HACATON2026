"""Очереди: Redis + RabbitMQ.

- Redis: кэш, rate-limit трек-номера, живые агрегаты аналитики, Pub/Sub для уведомлений.
- RabbitMQ: событийная шина (аналитический поток, обработка кризисных, авто-классификация).
"""

import json
import os

import pika

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
amqp_url = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")


class EventBus:
    """Обёртка над RabbitMQ (pika). Публикация событий для асинхронной обработки."""

    EXCHANGE = "otklik.events"

    def __init__(self):
        self._connection = None
        self._channel = None

    def _get_channel(self):
        if self._connection is None or self._connection.is_closed:
            self._connection = pika.BlockingConnection(pika.URLParameters(amqp_url))
            self._channel = self._connection.channel()
            self._channel.exchange_declare(exchange=self.EXCHANGE, exchange_type="topic", durable=True)
        return self._channel

    def publish(self, routing_key: str, payload: dict):
        body = json.dumps(payload, default=str)
        try:
            self._publish(routing_key, body)
        except Exception:
            # Стейл-коннекция (сервер закрыл канал, pika ещё не узнал): сброс и повтор.
            self._reset()
            try:
                self._publish(routing_key, body)
            except Exception:
                raise

    def _publish(self, routing_key: str, body: str):
        self._get_channel().basic_publish(
            exchange=self.EXCHANGE,
            routing_key=routing_key,
            body=body,
            properties=pika.BasicProperties(delivery_mode=2),  # persistent
        )

    def _reset(self):
        try:
            if self._connection and not self._connection.is_closed:
                self._connection.close()
        except Exception:
            pass
        self._connection = None
        self._channel = None

    def close(self):
        if self._connection and not self._connection.is_closed:
            self._connection.close()


_event_bus = EventBus()


def publish_event(routing_key: str, payload: dict):
    """Публикует событие в RabbitMQ, толерантно к недоступности (не роняем API)."""
    try:
        _event_bus.publish(routing_key, payload)
    except Exception as exc:
        # В dev/без RabbitMQ — не критично, накапливается через ретраи воркера.
        print("publish_event failed:", type(exc).__name__, exc)
        pass
