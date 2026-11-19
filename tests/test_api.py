import pytest
from fastapi.testclient import TestClient

STAGE = {
    "nom_etudiant": "Camille Durand",
    "entreprise": "Altéa Systems",
    "intitule": "Développeur API REST",
    "date_debut": "2099-03-02",
    "date_fin": "2099-08-28",
}


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "test.db"))
    from app.main import app

    with TestClient(app) as c:
        yield c


def test_creation_retourne_201_et_location(client):
    r = client.post("/stages", json=STAGE)
    assert r.status_code == 201
    corps = r.json()
    assert corps["id"] == 1 and corps["nom_etudiant"] == "Camille Durand"
    assert r.headers["Location"] == "/stages/1"


def test_liste_et_consultation(client):
    client.post("/stages", json=STAGE)
    client.post("/stages", json={**STAGE, "nom_etudiant": "Louis Petit", "entreprise": "Novaterra"})
    r = client.get("/stages")
    assert r.status_code == 200 and len(r.json()) == 2
    assert r.headers["X-Total-Count"] == "2"
    assert client.get("/stages/2").json()["entreprise"] == "Novaterra"


def test_modification(client):
    client.post("/stages", json=STAGE)
    r = client.put("/stages/1", json={**STAGE, "intitule": "Ingénieur DevOps"})
    assert r.status_code == 200 and r.json()["intitule"] == "Ingénieur DevOps"
    assert client.get("/stages/1").json()["intitule"] == "Ingénieur DevOps"


def test_suppression(client):
    client.post("/stages", json=STAGE)
    assert client.delete("/stages/1").status_code == 204
    assert client.get("/stages/1").status_code == 404


@pytest.mark.parametrize("methode", ["get", "put", "delete"])
def test_stage_inexistant_retourne_404(client, methode):
    kwargs = {"json": STAGE} if methode == "put" else {}
    r = getattr(client, methode)("/stages/999", **kwargs)
    assert r.status_code == 404
    assert r.json() == {"detail": "Stage 999 introuvable"}


def test_dates_incoherentes_refusees(client):
    r = client.post("/stages", json={**STAGE, "date_debut": "2099-09-01", "date_fin": "2099-03-01"})
    assert r.status_code == 422


def test_champ_vide_ou_manquant_refuse(client):
    assert client.post("/stages", json={**STAGE, "entreprise": "   "}).status_code == 422
    incomplet = {k: v for k, v in STAGE.items() if k != "intitule"}
    assert client.post("/stages", json=incomplet).status_code == 422


def test_recherche_filtre_et_tri(client):
    client.post("/stages", json=STAGE)
    client.post("/stages", json={**STAGE, "nom_etudiant": "Louis Petit", "entreprise": "Novaterra",
                                 "date_debut": "2020-01-06", "date_fin": "2020-06-30"})
    assert [s["nom_etudiant"] for s in client.get("/stages", params={"q": "louis"}).json()] == ["Louis Petit"]
    assert len(client.get("/stages", params={"entreprise": "Novaterra"}).json()) == 1
    termines = client.get("/stages", params={"statut": "termine"}).json()
    assert [s["statut"] for s in termines] == ["termine"]
    ordre = client.get("/stages", params={"tri": "date_debut"}).json()
    assert [s["id"] for s in ordre] == [2, 1]
    assert client.get("/stages", params={"tri": "mot_de_passe"}).status_code == 422


def test_injection_sql_neutralisee(client):
    client.post("/stages", json=STAGE)
    r = client.get("/stages", params={"q": "'; DROP TABLE stages; --"})
    assert r.status_code == 200 and r.json() == []
    assert len(client.get("/stages").json()) == 1


def test_health_docs_et_interface(client):
    assert client.get("/health").json()["status"] == "ok"
    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").json()["info"]["title"] == "API Gestion des stages"
    assert "text/html" in client.get("/").headers["content-type"]
    assert "stages" in client.get("/api").json()["links"]


def test_statut_calcule_selon_la_date():
    from datetime import date

    from app.main import calculer_statut

    jour = date(2026, 6, 15)
    assert calculer_statut("2026-07-01", "2026-09-01", jour) == "a_venir"
    assert calculer_statut("2026-06-01", "2026-09-01", jour) == "en_cours"
    assert calculer_statut("2026-06-15", "2026-06-15", jour) == "en_cours"
    assert calculer_statut("2026-01-01", "2026-06-14", jour) == "termine"


def test_requetes_concurrentes(client):
    from concurrent.futures import ThreadPoolExecutor

    with ThreadPoolExecutor(8) as pool:
        codes = list(pool.map(lambda _: client.post("/stages", json=STAGE).status_code, range(24)))
        lectures = list(pool.map(lambda _: client.get("/stages").status_code, range(24)))
    assert set(codes) == {201} and set(lectures) == {200}
    assert len(client.get("/stages").json()) == 24
