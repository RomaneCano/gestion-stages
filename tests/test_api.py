import sqlite3
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

STAGE = {
    "nom_etudiant": "Camille Durand",
    "entreprise": "Altéa Systems",
    "intitule": "Développeur API REST",
    "date_debut": "2099-03-02",
    "date_fin": "2099-08-28",
}


def dates(debut: int, fin: int) -> dict:
    jour = date.today()
    return {"date_debut": (jour + timedelta(days=debut)).isoformat(), "date_fin": (jour + timedelta(days=fin)).isoformat()}


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
    assert corps["statut"] == "a_venir" and corps["avancement"] == 0 and corps["duree_jours"] == 180
    assert corps["convention_signee"] is False and corps["note"] is None
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
    r = client.put("/stages/1", json={**STAGE, "intitule": "Ingénieur DevOps", "ville": "Toulouse"})
    assert r.status_code == 200 and r.json()["intitule"] == "Ingénieur DevOps"
    assert client.get("/stages/1").json()["ville"] == "Toulouse"


def test_modification_partielle(client):
    client.post("/stages", json={**STAGE, "ville": "Lyon", "note": 12})
    r = client.patch("/stages/1", json={"convention_signee": True, "rapport_remis": True, "note": 16})
    assert r.status_code == 200
    corps = r.json()
    assert corps["convention_signee"] is True and corps["rapport_remis"] is True and corps["note"] == 16
    assert corps["ville"] == "Lyon" and corps["entreprise"] == "Altéa Systems"
    assert client.patch("/stages/1", json={"note": None}).json()["note"] is None


def test_patch_valide_les_donnees(client):
    client.post("/stages", json=STAGE)
    assert client.patch("/stages/1", json={"date_fin": "2099-01-01"}).status_code == 422
    assert client.patch("/stages/1", json={"note": 25}).status_code == 422
    assert client.patch("/stages/1", json={"inconnu": 1}).status_code == 422
    assert client.patch("/stages/1", json={"entreprise": None}).status_code == 422
    assert client.patch("/stages/999", json={"note": 10}).status_code == 404


def test_suppression(client):
    client.post("/stages", json=STAGE)
    assert client.delete("/stages/1").status_code == 204
    assert client.get("/stages/1").status_code == 404


@pytest.mark.parametrize("methode", ["get", "put", "patch", "delete"])
def test_stage_inexistant_retourne_404(client, methode):
    kwargs = {"json": STAGE} if methode in ("put", "patch") else {}
    r = getattr(client, methode)("/stages/999", **kwargs)
    assert r.status_code == 404
    assert r.json() == {"detail": "Stage 999 introuvable"}


def test_dates_incoherentes_refusees(client):
    r = client.post("/stages", json={**STAGE, "date_debut": "2099-09-01", "date_fin": "2099-03-01"})
    assert r.status_code == 422


def test_champs_invalides_refuses(client):
    assert client.post("/stages", json={**STAGE, "entreprise": "   "}).status_code == 422
    incomplet = {k: v for k, v in STAGE.items() if k != "intitule"}
    assert client.post("/stages", json=incomplet).status_code == 422
    assert client.post("/stages", json={**STAGE, "note": 21}).status_code == 422
    assert client.post("/stages", json={**STAGE, "note": -1}).status_code == 422


def test_champs_facultatifs_vides_deviennent_nuls(client):
    r = client.post("/stages", json={**STAGE, "ville": "  ", "commentaire": ""})
    assert r.json()["ville"] is None and r.json()["commentaire"] is None


def test_recherche_filtre_et_tri(client):
    client.post("/stages", json={**STAGE, "filiere": "Informatique", "ville": "Toulouse"})
    client.post("/stages", json={**STAGE, "nom_etudiant": "Louis Petit", "entreprise": "Novaterra",
                                 "date_debut": "2020-01-06", "date_fin": "2020-06-30", "filiere": "Santé",
                                 "convention_signee": True})
    assert [s["nom_etudiant"] for s in client.get("/stages", params={"q": "louis"}).json()] == ["Louis Petit"]
    assert len(client.get("/stages", params={"q": "toulouse"}).json()) == 1
    assert len(client.get("/stages", params={"entreprise": "Novaterra"}).json()) == 1
    assert len(client.get("/stages", params={"filiere": "Santé"}).json()) == 1
    assert len(client.get("/stages", params={"convention_signee": "true"}).json()) == 1
    assert len(client.get("/stages", params={"rapport_remis": "false"}).json()) == 2
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


def test_statut_calcule_selon_la_date():
    from app.main import calculer_avancement, calculer_statut

    jour = date(2026, 6, 15)
    assert calculer_statut("2026-07-01", "2026-09-01", jour) == "a_venir"
    assert calculer_statut("2026-06-01", "2026-09-01", jour) == "en_cours"
    assert calculer_statut("2026-06-15", "2026-06-15", jour) == "en_cours"
    assert calculer_statut("2026-01-01", "2026-06-14", jour) == "termine"
    assert calculer_avancement("2026-06-10", "2026-06-19", jour) == 60
    assert calculer_avancement("2026-07-01", "2026-09-01", jour) == 0
    assert calculer_avancement("2026-01-01", "2026-06-14", jour) == 100


def test_statistiques(client):
    assert client.get("/stats").json()["total"] == 0
    client.post("/stages", json={**STAGE, **dates(-10, 20), "filiere": "Informatique", "convention_signee": True})
    client.post("/stages", json={**STAGE, **dates(-100, -40), "entreprise": "Novaterra", "filiere": "Informatique",
                                 "rapport_remis": True, "note": 16, "ville": "Lyon"})
    client.post("/stages", json={**STAGE, **dates(30, 90), "entreprise": "Novaterra"})
    s = client.get("/stats").json()
    assert s["total"] == 3 and s["par_statut"] == {"a_venir": 1, "en_cours": 1, "termine": 1}
    assert s["entreprises"] == 2 and s["conventions_signees"] == 1 and s["convention_signee_pct"] == 33
    assert s["stages_termines"] == 1 and s["rapport_remis_pct"] == 100 and s["note_moyenne"] == 16
    assert s["top_entreprises"][0] == {"nom": "Novaterra", "total": 2}
    assert s["par_filiere"] == [{"nom": "Informatique", "total": 2}]
    assert s["par_ville"] == [{"nom": "Lyon", "total": 1}]
    assert sum(t["total"] for t in s["notes"]) == 1 and len(s["par_mois"]) >= 3
    assert s["duree_moyenne_jours"] == pytest.approx((31 + 61 + 61) / 3, abs=0.1)


def test_alertes(client):
    client.post("/stages", json={**STAGE, **dates(-10, 5)})
    client.post("/stages", json={**STAGE, "nom_etudiant": "B", **dates(10, 100), "convention_signee": True})
    client.post("/stages", json={**STAGE, "nom_etudiant": "C", **dates(-200, -50), "convention_signee": True})
    client.post("/stages", json={**STAGE, "nom_etudiant": "D", **dates(-200, -50), "convention_signee": True,
                                 "rapport_remis": True})
    client.post("/stages", json={**STAGE, "nom_etudiant": "E", **dates(-10, 90), "convention_signee": True})
    a = client.get("/alertes").json()
    types = {(x["nom_etudiant"], x["type"]) for x in a}
    assert ("Camille Durand", "fin_proche") in types and ("Camille Durand", "convention_manquante") in types
    assert ("B", "debut_proche") in types
    assert ("C", "rapport_manquant") in types and ("D", "note_manquante") in types
    assert not [x for x in a if x["nom_etudiant"] == "E"]
    assert a[0]["niveau"] == "urgent" and a[-1]["niveau"] == "info"
    assert next(x for x in a if x["nom_etudiant"] == "C")["niveau"] == "urgent"


def test_export_csv(client):
    client.post("/stages", json={**STAGE, "nom_etudiant": "=SOMME(A1)", "ville": "Toulouse", "note": 15})
    client.post("/stages", json={**STAGE, "nom_etudiant": "Louis Petit", "entreprise": "Novaterra"})
    r = client.get("/stages/export.csv")
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/csv")
    assert "attachment" in r.headers["content-disposition"] and ".csv" in r.headers["content-disposition"]
    lignes = r.text.lstrip("﻿").strip().splitlines()
    assert lignes[0].startswith("id;etudiant;entreprise") and len(lignes) == 3
    assert "'=SOMME(A1)" in r.text and "Toulouse" in r.text
    assert len(client.get("/stages/export.csv", params={"entreprise": "Novaterra"}).text.strip().splitlines()) == 2


def test_migration_d_une_ancienne_base(tmp_path, monkeypatch):
    chemin = tmp_path / "ancienne.db"
    conn = sqlite3.connect(chemin)
    conn.executescript(
        "CREATE TABLE stages (id INTEGER PRIMARY KEY AUTOINCREMENT, nom_etudiant TEXT NOT NULL, entreprise TEXT NOT NULL,"
        " intitule TEXT NOT NULL, date_debut TEXT NOT NULL, date_fin TEXT NOT NULL, CHECK (date_fin >= date_debut));"
        "INSERT INTO stages (nom_etudiant, entreprise, intitule, date_debut, date_fin)"
        " VALUES ('Ancien', 'Vieille Entreprise', 'Stage', '2020-01-01', '2020-03-01');"
    )
    conn.commit()
    conn.close()
    monkeypatch.setenv("DATABASE_PATH", str(chemin))
    from app.main import app

    with TestClient(app) as c:
        stage = c.get("/stages/1").json()
        assert stage["nom_etudiant"] == "Ancien" and stage["convention_signee"] is False and stage["ville"] is None
        assert c.patch("/stages/1", json={"ville": "Paris"}).json()["ville"] == "Paris"


def test_requetes_concurrentes(client):
    from concurrent.futures import ThreadPoolExecutor

    with ThreadPoolExecutor(8) as pool:
        codes = list(pool.map(lambda _: client.post("/stages", json=STAGE).status_code, range(24)))
        lectures = list(pool.map(lambda _: client.get("/stages").status_code, range(24)))
    assert set(codes) == {201} and set(lectures) == {200}
    assert len(client.get("/stages").json()) == 24


def test_health_docs_et_interface(client):
    assert client.get("/health").json()["status"] == "ok"
    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").json()["info"]["title"] == "API Gestion des stages — ISIS"
    assert "text/html" in client.get("/").headers["content-type"]
    liens = client.get("/api").json()["links"]
    assert {"stages", "statistiques", "alertes", "export_csv"} <= set(liens)
    assert client.get("/static/logo.png").status_code == 200
