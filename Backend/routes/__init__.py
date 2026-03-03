# Backend/routes/__init__.py

from fastapi import APIRouter

from .auth import router as auth_router
from .croisement_routes import router as croisement_router
from .croisement import router as croisement_alt_router
from .debug_db import router as debug_router
from .dossiers import router as dossiers_router
from .export_dossiers import router as export_router
from .health import router as health_router
from .imports import router as imports_router
from .intervention_routes import router as intervention_router
from .orange_ppd import router as orange_ppd_router
from .praxedo_scraper import router as scraper_router
from .regles import router as regles_router
from .admin import router as admin_router  # ✅ Version FastAPI

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(croisement_router)
api_router.include_router(croisement_alt_router)
api_router.include_router(debug_router)
api_router.include_router(dossiers_router)
api_router.include_router(export_router)
api_router.include_router(health_router)
api_router.include_router(imports_router)
api_router.include_router(intervention_router)
api_router.include_router(orange_ppd_router)
api_router.include_router(scraper_router)
api_router.include_router(regles_router)
api_router.include_router(admin_router)

__all__ = ["api_router"]