import logging
import sqlite3
import time
import uuid
from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .database import get_db, init_db
from .schemas import Erreur, StageIn, StageOut, Statut

VERSION = "1.0.0"
STATIC_DIR = Path(__file__).resolve().parent / "static"


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("stages.access")


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


DESCRIPTION = """
API REST pour **gérer les stages des étudiants** d'une école d'ingénieurs.

* Une ressource : **/stages** (un stage = id, nom de l'étudiant, entreprise, intitulé, dates de début et de fin)
* CRUD complet : `POST`, `GET`, `PUT`, `DELETE`
* Réponses en **JSON**, erreurs au format `{"detail": "..."}`

⚠️ Projet pédagogique : n'utilisez **aucune donnée personnelle réelle**.
Sur l'offre gratuite d'un PaaS, le disque est éphémère : les données SQLite peuvent être réinitialisées.
"""

app = FastAPI(
    title="API Gestion des stages",
    description=DESCRIPTION,
    version=VERSION,
    lifespan=lifespan,
    openapi_tags=[
        {"name": "Stages", "description": "Création, consultation, modification et suppression des stages."},
        {"name": "Supervision", "description": "Santé du service et découverte de l'API."},
    ],
)


app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
                   expose_headers=["Location", "X-Total-Count", "X-Request-ID"])


@app.middleware("http")
async def journaliser(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
    debut = time.perf_counter()
    response = await call_next(request)
    duree = (time.perf_counter() - debut) * 1000
    response.headers["X-Request-ID"] = request_id
    if not request.url.path.startswith("/static"):
        log.info("%s %s %s %.1fms id=%s", request.method, request.url.path, response.status_code, duree, request_id)
    return response


Db = Annotated[sqlite3.Connection, Depends(get_db)]


def calculer_statut(debut: str, fin: str, aujourdhui: date | None = None) -> Statut:
    jour = (aujourdhui or date.today()).isoformat()
    if jour < debut:
        return Statut.a_venir
    if jour > fin:
        return Statut.termine
    return Statut.en_cours


def vers_sortie(row: sqlite3.Row) -> StageOut:
    return StageOut(**dict(row), statut=calculer_statut(row["date_debut"], row["date_fin"]))


def lire_ou_404(db: sqlite3.Connection, stage_id: int) -> sqlite3.Row:
    row = db.execute("SELECT * FROM stages WHERE id = ?", (stage_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Stage {stage_id} introuvable")
    return row


NOT_FOUND = {404: {"model": Erreur, "description": "Le stage demandé n'existe pas"}}
TRIS = {"id", "nom_etudiant", "entreprise", "intitule", "date_debut", "date_fin"}


@app.post("/stages", response_model=StageOut, status_code=status.HTTP_201_CREATED, tags=["Stages"],
          summary="Créer un stage",
          description="Crée un stage. Retourne **201** avec le stage créé et son URI dans l'en-tête `Location`.")
def creer_stage(stage: StageIn, response: Response, db: Db):
    with db:
        cur = db.execute(
            "INSERT INTO stages (nom_etudiant, entreprise, intitule, date_debut, date_fin) VALUES (?,?,?,?,?)",
            (stage.nom_etudiant, stage.entreprise, stage.intitule, stage.date_debut.isoformat(),
             stage.date_fin.isoformat()),
        )
    response.headers["Location"] = f"/stages/{cur.lastrowid}"
    return vers_sortie(lire_ou_404(db, cur.lastrowid))


@app.get("/stages", response_model=list[StageOut], tags=["Stages"], summary="Lister les stages",
          description="Retourne la liste des stages (tableau JSON). Le nombre total est dans l'en-tête `X-Total-Count`.")
def lister_stages(
    response: Response,
    db: Db,
    q: Annotated[str | None, Query(description="Recherche texte (étudiant, entreprise ou intitulé)")] = None,
    entreprise: Annotated[str | None, Query(description="Filtre exact sur l'entreprise")] = None,
    statut: Annotated[Statut | None, Query(description="Filtre sur le statut calculé")] = None,
    tri: Annotated[str, Query(description="Champ de tri, préfixer par `-` pour l'ordre décroissant")] = "-date_debut",
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    champ = tri.lstrip("-")
    if champ not in TRIS:
        raise HTTPException(status_code=422, detail=f"Tri invalide : choisir parmi {', '.join(sorted(TRIS))}")
    ordre = "DESC" if tri.startswith("-") else "ASC"

    where, params = [], []
    if q:
        where.append("(nom_etudiant LIKE ? OR entreprise LIKE ? OR intitule LIKE ?)")
        params += [f"%{q}%"] * 3
    if entreprise:
        where.append("entreprise = ?")
        params.append(entreprise)
    if statut:
        jour = date.today().isoformat()
        where.append({Statut.a_venir: "date_debut > ?", Statut.termine: "date_fin < ?",
                      Statut.en_cours: "(date_debut <= ? AND date_fin >= ?)"}[statut])
        params += [jour, jour] if statut == Statut.en_cours else [jour]
    clause = f"WHERE {' AND '.join(where)}" if where else ""

    total = db.execute(f"SELECT COUNT(*) FROM stages {clause}", params).fetchone()[0]
    rows = db.execute(
        f"SELECT * FROM stages {clause} ORDER BY {champ} {ordre}, id DESC LIMIT ? OFFSET ?",
        [*params, limit, offset],
    ).fetchall()
    response.headers["X-Total-Count"] = str(total)
    return [vers_sortie(r) for r in rows]


@app.get("/stages/{stage_id}", response_model=StageOut, responses=NOT_FOUND, tags=["Stages"],
         summary="Consulter un stage",
          description="Retourne un stage, ou **404** s'il n'existe pas.")
def lire_stage(stage_id: int, db: Db):
    return vers_sortie(lire_ou_404(db, stage_id))


@app.put("/stages/{stage_id}", response_model=StageOut, responses=NOT_FOUND, tags=["Stages"],
         summary="Modifier un stage",
          description="Remplace tous les champs d'un stage, ou **404** s'il n'existe pas.")
def modifier_stage(stage_id: int, stage: StageIn, db: Db):
    lire_ou_404(db, stage_id)
    with db:
        db.execute(
            "UPDATE stages SET nom_etudiant=?, entreprise=?, intitule=?, date_debut=?, date_fin=? WHERE id=?",
            (stage.nom_etudiant, stage.entreprise, stage.intitule, stage.date_debut.isoformat(),
             stage.date_fin.isoformat(), stage_id),
        )
    return vers_sortie(lire_ou_404(db, stage_id))


@app.delete("/stages/{stage_id}", status_code=status.HTTP_204_NO_CONTENT, responses=NOT_FOUND, tags=["Stages"],
            summary="Supprimer un stage",
          description="Supprime un stage (**204**, sans contenu), ou **404** s'il n'existe pas.")
def supprimer_stage(stage_id: int, db: Db):
    lire_ou_404(db, stage_id)
    with db:
        db.execute("DELETE FROM stages WHERE id = ?", (stage_id,))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/health", tags=["Supervision"], summary="Santé du service",
          description="Utilisé par la plateforme cloud (health check) et par l'interface web.")
def health(db: Db):
    total = db.execute("SELECT COUNT(*) FROM stages").fetchone()[0]
    return {"status": "ok", "version": VERSION, "stages": total}


@app.get("/api", tags=["Supervision"], summary="Point d'entrée de l'API (liens)",
          description='Réponse avec liens de navigation (principe HATEOAS évoqué dans le cours).')
def racine_api():
    return {
        "nom": "API Gestion des stages",
        "version": VERSION,
        "links": {
            "stages": "/stages",
            "documentation_swagger": "/docs",
            "documentation_redoc": "/redoc",
            "openapi": "/openapi.json",
            "health": "/health",
        },
    }


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
def interface():
    return FileResponse(STATIC_DIR / "index.html")
