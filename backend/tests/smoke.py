"""Smoke-тест ключевого флоу «Отклик» (без внешних сервисов).

Запуск:
    $env:DATABASE_URL="sqlite:///..."; python tests/smoke.py
"""

import io
import os
import sys

# --- настройка окружения до импорта приложения ---
TEST_DB = os.getenv(
    "TEST_DB", "sqlite:///C:/Users/Shchi/AppData/Local/Temp/opencode/smoke.db"
)
# чистая база при каждом прогоне
_db_path = TEST_DB.split("///")[1]
if "sqlite" in TEST_DB and os.path.exists(_db_path):
    os.remove(_db_path)
os.environ["DATABASE_URL"] = os.environ.get("DATABASE_URL", TEST_DB)
os.environ["UPLOAD_DIR"] = os.path.join(
    os.path.dirname(TEST_DB.split("///")[1]) if "sqlite" in TEST_DB else "/tmp", "smoke_uploads"
)
os.environ.setdefault("SECRET_KEY", "smoke")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient  # noqa: E402

from seed import seed  # noqa: E402
from app.main import app  # noqa: E402

result = {"passed": 0, "failed": 0}


def check(name: str, cond: bool, extra: str = ""):
    status = "PASS" if cond else "FAIL"
    print(f"[{status}] {name}{' — ' + extra if extra else ''}")
    result["passed" if cond else "failed"] += 1
    if not cond:
        result.setdefault("errors", []).append(name)


seed()
client = TestClient(app)

# ---------- С1: подача свободным текстом (школьник, на «ты») ----------
r = client.post("/api/v1/appeals", json={
    "applicant_type": "student",
    "is_category_path": False,
    "free_text": "В классе меня постоянно обзывают и высмеивают, не знаю что делать",
    "answers": {"where": "В школе", "since": "Пару месяцев"},
})
check("С1: создание обращения свободным текстом", r.status_code == 200, f"status={r.status_code} detail={r.json() if r.status_code!=200 else ''}")
appeal = r.json()
track1 = appeal["track_number"]
check("С1: формат трек-номера ОТК-XXXX-XXXX", track1.startswith("ОТК-") and track1.count("-") == 2)

r = client.get(f"/api/v1/categories")
check("С2: список категорий доступен", r.status_code == 200)
cat_fallback = next((c for c in r.json() if c["is_free_fallback"]), None)
check("С2: есть пункт «не знаю как назвать»", cat_fallback is not None)

# вложение (ТЗ 4.1): EXIF-очистка и лимит не проверяем тут, главное — сохранение
r = client.post(f"/api/v1/appeals/{track1}/attachments",
                files={"files": ("skrin.png", io.BytesIO(b"\x89PNG\r\n\x1a\n fake image bytes"), "image/png")})
check("ТЗ4.1: загрузка вложения", r.status_code == 200 and r.json()["count"] == 1, f"status={r.status_code}")

# ---------- С2: подача по категории (родитель, на «вы») ----------
r = client.post("/api/v1/appeals", json={
    "applicant_type": "parent",
    "is_category_path": True,
    "category_id": cat_fallback["id"],
    "free_text": None,
})
check("С2: подача по категории от взрослого", r.status_code == 200)
track2 = r.json()["track_number"]

# ---------- С6: кризисное обращение ----------
r = client.post("/api/v1/appeals", json={
    "applicant_type": "student",
    "is_category_path": False,
    "free_text": "У меня очень плохо, я хочу умереть, мне кажется никто не поможет",
})
check("С6: кризисное обращение распознано", r.status_code == 200 and r.json()["is_crisis"] is True)
track3 = r.json()["track_number"]

# ---------- Авторизация ролей ----------
op = client.post("/api/v1/auth/login", json={"username": "op", "password": "op123"})
check("C3: вход оператора", op.status_code == 200)
op_tok = op.json()["access_token"]
op_h = {"Authorization": f"Bearer {op_tok}"}

psy = client.post("/api/v1/auth/login", json={"username": "psy1", "password": "psy123"})
check("C4: вход эксперта", psy.status_code == 200)
psy_tok = psy.json()["access_token"]
psy_h = {"Authorization": f"Bearer {psy_tok}"}

adm = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
check("C7: вход админа", adm.status_code == 200)
adm_tok = adm.json()["access_token"]
adm_h = {"Authorization": f"Bearer {adm_tok}"}

# ---------- C3: очередь оператора ----------
queue = client.get("/api/v1/operator/queue", headers=op_h)
check("C3: очередь оператора", queue.status_code == 200)
queued_ids = [q["id"] for q in queue.json()["items"]]
ids_in_queue = []
# find the free-text appeal and crisis appeal
for q in queue.json()["items"]:
    if q["track_number"] == track1:
        ids_in_queue.append(q["id"])
crisis_ids = [q["id"] for q in queue.json()["items"] if q["is_crisis"]]
check("C3: кризисное сверху очереди", crisis_ids and queue.json()["items"][0]["is_crisis"] is True)

# ---------- маршрутизация: подсказка ----------
hint = client.get(f"/api/v1/operator/hint/{ids_in_queue[0]}", headers=op_h)
check("C4: подсказка маршрутизации по категории/свободному", hint.status_code == 200)
psy_id = None
try:
    psy_id = hint.json()["groups"][0]["experts"][0]["id"]
except Exception:
    pass
check("C4: подсказка предлагает эксперта", psy_id is not None)

# ---------- оператор назначает исполнителя ----------
app1_id = None
for q in queue.json()["items"]:
    if q["track_number"] == track2:
        app1_id = q["id"]
        break
if app1_id and psy_id:
    r = client.post(f"/api/v1/operator/appeals/{app1_id}/process", headers=op_h, json={
        "action": "assign", "priority": "standard", "expert_id": psy_id,
    })
    check("C3: назначение исполнителя -> Распределено", r.status_code == 200 and r.json()["status"] == "assigned")

# ---------- C4: эксперт ----------
my_appeals = client.get("/api/v1/expert/appeals", headers=psy_h)
check("C4: эксперт видит назначенные", my_appeals.status_code == 200)
mine = my_appeals.json()
check("C4: назначенное обращение у эксперта", len(mine) >= 1)
ex_app = mine[0]
r = client.post(f"/api/v1/expert/appeals/{ex_app['id']}/take", headers=psy_h)
check("C4: взять в работу -> В работе", r.status_code == 200 and r.json()["status"] == "in_progress")

r = client.post(f"/api/v1/expert/appeals/{ex_app['id']}/note", headers=psy_h, json={"text": "Созаметка: проверить динамику"})
check("C4: внутренняя заметка", r.status_code == 200)

r = client.post(f"/api/v1/expert/appeals/{ex_app['id']}/message", headers=psy_h, json={"text": "Привет! Расскажи подробнее, что происходит?"})
check("C4: эксперт пишет в чат", r.status_code == 200)

r = client.post(f"/api/v1/expert/appeals/{ex_app['id']}/status", headers=psy_h, json={"to_status": "answer_ready"})
check("C4: статус Ответ готов", r.status_code == 200 and r.json()["status"] == "answer_ready")

# ---------- C5: ветка «не помогло» → возврат оператору ----------
r = client.post(f"/api/v1/appeals/{track2}/return", json={"text": "Не помогло, хочется другого специалиста"})
check("C5: возврат заявителя", r.status_code == 200 and r.json()["status"] == "returned")

queue2 = client.get("/api/v1/operator/queue", headers=op_h)
returned = [q for q in queue2.json()["items"] if q["track_number"] == track2]
check("C5: возврат вернулся оператору", len(returned) == 1 and returned[0]["status"] == "returned")

# ---------- C7: админ меняет статус + журнал ----------
client.post("/api/v1/admin/categories", headers=adm_h, json={"name": "Новая категория"})
r = client.get("/api/v1/admin/categories", headers=adm_h)
check("C7: админ добавил категорию", r.status_code == 200 and any(c["name"] == "Новая категория" for c in r.json()))

# ---------- C8: аналитика + CSV без текстов ----------
r = client.get("/api/v1/admin/analytics?period_days=30", headers=adm_h)
check("C8: дашборд аналитики", r.status_code == 200 and r.json()["total"] >= 3, f"total={r.json().get('total') if r.status_code==200 else ''}")

r = client.get("/api/v1/admin/report.csv", headers=adm_h)
csv_text = r.text
check("C8: CSV-выгрузка", r.status_code == 200 and "created_at" in csv_text)
check("C8: в CSV нет текстов обращений", "обзывают" not in csv_text and "хочу умереть" not in csv_text)
check("C8: в CSV нет трек-номеров", "ОТК-" not in csv_text)

# ---------- TZ 4.7: rate-limit трек-номера ----------
# 5 попыток за минуту с одного адреса разрешены, 6-я — нет
from app.services.ratelimit import _attempts  # noqa
_attempts.clear()
codes = []
for _ in range(6):
    r = client.get(f"/api/v1/appeals/{track1}")
    codes.append(r.status_code)
check("TZ4.7: rate-limit (6-я попытка -> 429)", codes[-1] == 429, f"codes={codes}")

print()
print(f"ИТОГО: {result['passed']} passed, {result['failed']} failed")
if result["failed"]:
    print("Ошибки:", result.get("errors"))
    sys.exit(1)