import csv
import io
import logging
import sqlite3
import time
import uuid
from collections import Counter
from contextlib import asynccontextmanager
from datetime import date, timedelta
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError

from .database import get_db, init_db
from .schemas import Alerte, Erreur, StageIn, StageOut, StagePatch, Statut

VERSION = "2.0.0"
STATIC_DIR = Path(__file__).resolve().parent / "static"

COLONNES = [
    "nom_etudiant", "entreprise", "intitule", "date_debut", "date_fin", "filiere", "ville",
    "tuteur_ecole", "maitre_stage", "convention_signee", "rapport_remis", "note", "commentaire",
]
TRIS = {"id", "nom_etudiant", "entreprise", "intitule", "date_debut", "date_fin", "ville", "filiere"}

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("stages.access")


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


DESCRIPTION = """
API REST de suivi des **stages des étudiants de l'école d'ingénieurs ISIS**.

* Ressource principale : **/stages** (étudiant, entreprise, intitulé, dates) avec CRUD complet :
  `POST`, `GET`, `PUT`, `PATCH`, `DELETE`
* Suivi : filière, ville, tuteurs, convention signée, rapport remis, note, commentaire
* Analyse : **/stats** (indicateurs), **/alertes** (actions à mener), **/stages/export.csv** (export Excel)
* Réponses en **JSON**, erreurs au format `{"detail": "..."}`

⚠️ Projet pédagogique : n'utilisez **aucune donnée personnelle réelle**.
Sur l'offre gratuite d'un PaaS, le disque est éphémère : les données SQLite peuvent être réinitialisées.
"""

app = FastAPI(
    title="API Gestion des stages — ISIS",
    description=DESCRIPTION,
    version=VERSION,
    lifespan=lifespan,
    openapi_tags=[
        {"name": "Stages", "description": "Création, consultation, modification et suppression des stages."},
        {"name": "Analyse", "description": "Statistiques et alertes calculées à partir des stages."},
        {"name": "Supervision", "description": "Santé du service et découverte de l'API."},
    ],
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
                   expose_headers=["Location", "X-Total-Count", "X-Request-ID", "Content-Disposition"])


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


def calculer_avancement(debut: str, fin: str, aujourdhui: date | None = None) -> int:
    jour = aujourdhui or date.today()
    d0, d1 = date.fromisoformat(debut), date.fromisoformat(fin)
    if jour < d0:
        return 0
    if jour > d1:
        return 100
    return round(((jour - d0).days + 1) / ((d1 - d0).days + 1) * 100)


def vers_sortie(row: sqlite3.Row) -> StageOut:
    donnees = dict(row)
    donnees["convention_signee"] = bool(donnees["convention_signee"])
    donnees["rapport_remis"] = bool(donnees["rapport_remis"])
    d0, d1 = date.fromisoformat(donnees["date_debut"]), date.fromisoformat(donnees["date_fin"])
    return StageOut(
        **donnees,
        statut=calculer_statut(donnees["date_debut"], donnees["date_fin"]),
        duree_jours=(d1 - d0).days + 1,
        avancement=calculer_avancement(donnees["date_debut"], donnees["date_fin"]),
    )


def lire_ou_404(db: sqlite3.Connection, stage_id: int) -> sqlite3.Row:
    row = db.execute("SELECT * FROM stages WHERE id = ?", (stage_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Stage {stage_id} introuvable")
    return row


def valeurs(stage: StageIn) -> list:
    donnees = stage.model_dump()
    donnees["date_debut"] = stage.date_debut.isoformat()
    donnees["date_fin"] = stage.date_fin.isoformat()
    donnees["convention_signee"] = int(stage.convention_signee)
    donnees["rapport_remis"] = int(stage.rapport_remis)
    return [donnees[c] for c in COLONNES]


def filtres(
    q: Annotated[str | None, Query(description="Recherche texte (étudiant, entreprise, intitulé, ville, filière)")] = None,
    entreprise: Annotated[str | None, Query(description="Filtre exact sur l'entreprise")] = None,
    filiere: Annotated[str | None, Query(description="Filtre exact sur la filière")] = None,
    ville: Annotated[str | None, Query(description="Filtre exact sur la ville")] = None,
    statut: Annotated[Statut | None, Query(description="Filtre sur le statut calculé")] = None,
    convention_signee: Annotated[bool | None, Query(description="Convention signée ou non")] = None,
    rapport_remis: Annotated[bool | None, Query(description="Rapport remis ou non")] = None,
) -> tuple[str, list]:
    where, params = [], []
    if q:
        champs = ["nom_etudiant", "entreprise", "intitule", "ville", "filiere"]
        where.append("(" + " OR ".join(f"{c} LIKE ?" for c in champs) + ")")
        params += [f"%{q}%"] * len(champs)
    for champ, valeur in (("entreprise", entreprise), ("filiere", filiere), ("ville", ville)):
        if valeur:
            where.append(f"{champ} = ?")
            params.append(valeur)
    if convention_signee is not None:
        where.append("convention_signee = ?")
        params.append(int(convention_signee))
    if rapport_remis is not None:
        where.append("rapport_remis = ?")
        params.append(int(rapport_remis))
    if statut:
        jour = date.today().isoformat()
        where.append({Statut.a_venir: "date_debut > ?", Statut.termine: "date_fin < ?",
                      Statut.en_cours: "(date_debut <= ? AND date_fin >= ?)"}[statut])
        params += [jour, jour] if statut == Statut.en_cours else [jour]
    return (f"WHERE {' AND '.join(where)}" if where else ""), params


Filtre = Annotated[tuple[str, list], Depends(filtres)]

NOT_FOUND = {404: {"model": Erreur, "description": "Le stage demandé n'existe pas"}}


@app.post("/stages", response_model=StageOut, status_code=status.HTTP_201_CREATED, tags=["Stages"],
          summary="Créer un stage",
          description="Crée un stage. Retourne **201** avec le stage créé et son URI dans l'en-tête `Location`. "
                      "Seuls l'étudiant, l'entreprise, l'intitulé et les dates sont obligatoires.")
def creer_stage(stage: StageIn, response: Response, db: Db):
    with db:
        cur = db.execute(
            f"INSERT INTO stages ({', '.join(COLONNES)}) VALUES ({', '.join('?' * len(COLONNES))})",
            valeurs(stage),
        )
    response.headers["Location"] = f"/stages/{cur.lastrowid}"
    return vers_sortie(lire_ou_404(db, cur.lastrowid))


@app.get("/stages", response_model=list[StageOut], tags=["Stages"], summary="Lister les stages",
         description="Retourne la liste des stages (tableau JSON), filtrable et triable. "
                     "Le nombre total de résultats est dans l'en-tête `X-Total-Count`.")
def lister_stages(
    response: Response,
    db: Db,
    filtre: Filtre,
    tri: Annotated[str, Query(description="Champ de tri, préfixer par `-` pour l'ordre décroissant")] = "-date_debut",
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    champ = tri.lstrip("-")
    if champ not in TRIS:
        raise HTTPException(status_code=422, detail=f"Tri invalide : choisir parmi {', '.join(sorted(TRIS))}")
    ordre = "DESC" if tri.startswith("-") else "ASC"
    clause, params = filtre
    total = db.execute(f"SELECT COUNT(*) FROM stages {clause}", params).fetchone()[0]
    rows = db.execute(
        f"SELECT * FROM stages {clause} ORDER BY {champ} {ordre}, id DESC LIMIT ? OFFSET ?",
        [*params, limit, offset],
    ).fetchall()
    response.headers["X-Total-Count"] = str(total)
    return [vers_sortie(r) for r in rows]


def neutraliser(valeur):
    if isinstance(valeur, str) and valeur[:1] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + valeur
    return valeur


@app.get("/stages/export.csv", tags=["Stages"], summary="Exporter les stages en CSV",
         description="Fichier CSV (séparateur `;`, UTF-8 avec BOM) directement ouvrable dans Excel. "
                     "Accepte les mêmes filtres que `GET /stages`.")
def exporter_csv(db: Db, filtre: Filtre):
    clause, params = filtre
    rows = db.execute(f"SELECT * FROM stages {clause} ORDER BY date_debut DESC, id DESC", params).fetchall()
    tampon = io.StringIO()
    ecrivain = csv.writer(tampon, delimiter=";")
    ecrivain.writerow(["id", "etudiant", "entreprise", "intitule", "date_debut", "date_fin", "duree_jours", "statut",
                       "filiere", "ville", "tuteur_ecole", "maitre_stage", "convention_signee", "rapport_remis",
                       "note", "commentaire"])
    for row in rows:
        s = vers_sortie(row)
        ecrivain.writerow([neutraliser(v) for v in (
            s.id, s.nom_etudiant, s.entreprise, s.intitule, s.date_debut.isoformat(), s.date_fin.isoformat(),
            s.duree_jours, s.statut.value, s.filiere or "", s.ville or "", s.tuteur_ecole or "", s.maitre_stage or "",
            "oui" if s.convention_signee else "non", "oui" if s.rapport_remis else "non",
            "" if s.note is None else s.note, s.commentaire or "")])
    return Response(
        "﻿" + tampon.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="stages-isis-{date.today().isoformat()}.csv"'},
    )


@app.get("/stages/{stage_id}", response_model=StageOut, responses=NOT_FOUND, tags=["Stages"],
         summary="Consulter un stage", description="Retourne un stage, ou **404** s'il n'existe pas.")
def lire_stage(stage_id: int, db: Db):
    return vers_sortie(lire_ou_404(db, stage_id))


@app.put("/stages/{stage_id}", response_model=StageOut, responses=NOT_FOUND, tags=["Stages"],
         summary="Modifier un stage (remplacement complet)",
         description="Remplace tous les champs d'un stage (les champs facultatifs omis sont remis à leur valeur par "
                     "défaut), ou **404** s'il n'existe pas. Pour ne changer qu'un champ, utiliser `PATCH`.")
def modifier_stage(stage_id: int, stage: StageIn, db: Db):
    lire_ou_404(db, stage_id)
    with db:
        db.execute(
            f"UPDATE stages SET {', '.join(c + '=?' for c in COLONNES)} WHERE id=?",
            [*valeurs(stage), stage_id],
        )
    return vers_sortie(lire_ou_404(db, stage_id))


@app.patch("/stages/{stage_id}", response_model=StageOut, responses=NOT_FOUND, tags=["Stages"],
           summary="Modifier partiellement un stage",
           description="Ne modifie que les champs envoyés (par exemple cocher `convention_signee`). "
                       "Envoyer `null` efface un champ facultatif.")
def modifier_partiellement(stage_id: int, patch: StagePatch, db: Db):
    row = lire_ou_404(db, stage_id)
    actuel = {c: row[c] for c in COLONNES}
    actuel["convention_signee"] = bool(actuel["convention_signee"])
    actuel["rapport_remis"] = bool(actuel["rapport_remis"])
    fusion = {**actuel, **patch.model_dump(exclude_unset=True)}
    try:
        stage = StageIn(**fusion)
    except ValidationError as erreur:
        message = " · ".join(e["msg"].removeprefix("Value error, ") for e in erreur.errors())
        raise HTTPException(status_code=422, detail=message)
    with db:
        db.execute(
            f"UPDATE stages SET {', '.join(c + '=?' for c in COLONNES)} WHERE id=?",
            [*valeurs(stage), stage_id],
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


def tous_les_stages(db: sqlite3.Connection) -> list[StageOut]:
    return [vers_sortie(r) for r in db.execute("SELECT * FROM stages").fetchall()]


def classement(compteur: Counter, limite: int = 8) -> list[dict]:
    tries = sorted(compteur.items(), key=lambda kv: (-kv[1], kv[0]))
    return [{"nom": nom, "total": total} for nom, total in tries[:limite]]


def mois_suivant(jour: date) -> date:
    return (jour.replace(day=1) + timedelta(days=32)).replace(day=1)


def activite_par_mois(stages: list[StageOut]) -> list[dict]:
    if not stages:
        return []
    debut = min(s.date_debut for s in stages).replace(day=1)
    fin = max(s.date_fin for s in stages).replace(day=1)
    mois, courant = [], debut
    while courant <= fin and len(mois) < 36:
        suivant = mois_suivant(courant)
        dernier = suivant - timedelta(days=1)
        mois.append({
            "mois": courant.strftime("%Y-%m"),
            "actifs": sum(1 for s in stages if s.date_debut <= dernier and s.date_fin >= courant),
            "debuts": sum(1 for s in stages if courant <= s.date_debut <= dernier),
        })
        courant = suivant
    return mois


TRANCHES_NOTES = [("0-9", 0, 9), ("10-11", 10, 11), ("12-13", 12, 13), ("14-15", 14, 15), ("16-17", 16, 17),
                  ("18-20", 18, 20)]


@app.get("/stats", tags=["Analyse"], summary="Indicateurs et statistiques",
         description="Totaux, répartition par statut, filière, entreprise et ville, activité mois par mois, "
                     "durée moyenne, avancement du suivi administratif et distribution des notes.")
def statistiques(db: Db):
    stages = tous_les_stages(db)
    termines = [s for s in stages if s.statut == Statut.termine]
    notes = [s.note for s in stages if s.note is not None]
    par_statut = Counter(s.statut.value for s in stages)
    conventions = sum(1 for s in stages if s.convention_signee)
    rapports = sum(1 for s in termines if s.rapport_remis)
    return {
        "total": len(stages),
        "par_statut": {k: par_statut.get(k, 0) for k in ("a_venir", "en_cours", "termine")},
        "entreprises": len({s.entreprise for s in stages}),
        "duree_moyenne_jours": round(sum(s.duree_jours for s in stages) / len(stages), 1) if stages else None,
        "conventions_signees": conventions,
        "convention_signee_pct": round(100 * conventions / len(stages)) if stages else None,
        "stages_termines": len(termines),
        "rapports_remis": rapports,
        "rapport_remis_pct": round(100 * rapports / len(termines)) if termines else None,
        "note_moyenne": round(sum(notes) / len(notes), 1) if notes else None,
        "top_entreprises": classement(Counter(s.entreprise for s in stages)),
        "par_filiere": classement(Counter(s.filiere for s in stages if s.filiere)),
        "par_ville": classement(Counter(s.ville for s in stages if s.ville)),
        "par_mois": activite_par_mois(stages),
        "notes": [{"tranche": nom, "total": sum(1 for n in notes if bas <= n <= haut)}
                  for nom, bas, haut in TRANCHES_NOTES],
    }


def libelle_jours(n: int, futur: bool = True) -> str:
    if futur:
        if n < 0:
            return f"depuis {-n} jour{'s' if -n > 1 else ''}"
        return "aujourd'hui" if n == 0 else "demain" if n == 1 else f"dans {n} jours"
    return f"{n} jour{'s' if n > 1 else ''}"


@app.get("/alertes", response_model=list[Alerte], tags=["Analyse"], summary="Actions à mener",
         description="Liste priorisée (urgent puis info) : conventions non signées, stages qui démarrent ou se "
                     "terminent bientôt, rapports non remis, notes à saisir.")
def alertes(db: Db):
    aujourdhui = date.today()
    resultats = []

    def ajouter(s: StageOut, type_: str, niveau: str, message: str) -> None:
        resultats.append(Alerte(stage_id=s.id, nom_etudiant=s.nom_etudiant, entreprise=s.entreprise,
                                type=type_, niveau=niveau, message=message))

    for s in tous_les_stages(db):
        avant_debut = (s.date_debut - aujourdhui).days
        avant_fin = (s.date_fin - aujourdhui).days
        if s.statut == Statut.en_cours and avant_fin <= 14:
            ajouter(s, "fin_proche", "urgent" if avant_fin <= 7 else "info",
                    f"Le stage se termine {libelle_jours(avant_fin)}")
        if s.statut == Statut.a_venir and avant_debut <= 14:
            ajouter(s, "debut_proche", "info", f"Le stage démarre {libelle_jours(avant_debut)}")
        if not s.convention_signee and (s.statut == Statut.en_cours or (s.statut == Statut.a_venir and avant_debut <= 30)):
            ajouter(s, "convention_manquante", "urgent", "Convention de stage non signée")
        if s.statut == Statut.termine:
            depuis = -avant_fin
            if not s.rapport_remis:
                ajouter(s, "rapport_manquant", "urgent" if depuis > 30 else "info",
                        f"Rapport non remis (stage terminé depuis {libelle_jours(depuis, futur=False)})")
            elif s.note is None:
                ajouter(s, "note_manquante", "info", "Note finale à saisir")
    resultats.sort(key=lambda a: (a.niveau != "urgent", a.type, a.stage_id))
    return resultats


@app.get("/health", tags=["Supervision"], summary="Santé du service",
         description="Utilisé par la plateforme cloud (health check) et par l'interface web.")
def health(db: Db):
    total = db.execute("SELECT COUNT(*) FROM stages").fetchone()[0]
    return {"status": "ok", "version": VERSION, "stages": total}


@app.get("/api", tags=["Supervision"], summary="Point d'entrée de l'API (liens)",
         description="Réponse avec liens de navigation (principe HATEOAS évoqué dans le cours).")
def racine_api():
    return {
        "nom": "API Gestion des stages — ISIS",
        "version": VERSION,
        "links": {
            "stages": "/stages",
            "export_csv": "/stages/export.csv",
            "statistiques": "/stats",
            "alertes": "/alertes",
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
