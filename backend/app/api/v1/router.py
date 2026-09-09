from fastapi import APIRouter

from app.api.v1.endpoints import admin, auth, expert, operator, public, ws

api_router = APIRouter()

api_router.include_router(public.router, prefix="")
api_router.include_router(auth.router, prefix="")
api_router.include_router(operator.router, prefix="")
api_router.include_router(expert.router, prefix="")
api_router.include_router(admin.router, prefix="")
api_router.include_router(ws.router, prefix="")
