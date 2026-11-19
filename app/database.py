import os
import sqlite3
from pathlib import Path
from typing import Iterator

DEFAULT_DB = Path(__file__).resolve().parent.parent / "data" / "stages.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS stages (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nom_etudiant  TEXT NOT NULL,
    entreprise    TEXT NOT NULL,
    intitule      TEXT NOT NULL,
    date_debut    TEXT NOT NULL,
    date_fin      TEXT NOT NULL,
    CHECK (date_fin >= date_debut)
);
CREATE INDEX IF NOT EXISTS idx_stages_date_debut ON stages (date_debut);
"""

COLONNES_FACULTATIVES = {
    "filiere": "TEXT",
    "ville": "TEXT",
    "tuteur_ecole": "TEXT",
    "maitre_stage": "TEXT",
    "convention_signee": "INTEGER NOT NULL DEFAULT 0",
    "rapport_remis": "INTEGER NOT NULL DEFAULT 0",
    "note": "INTEGER",
    "commentaire": "TEXT",
}


def db_path() -> str:
    return os.getenv("DATABASE_PATH", str(DEFAULT_DB))


def connect() -> sqlite3.Connection:
    path = Path(db_path())
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)
        existantes = {row["name"] for row in conn.execute("PRAGMA table_info(stages)")}
        for nom, definition in COLONNES_FACULTATIVES.items():
            if nom not in existantes:
                conn.execute(f"ALTER TABLE stages ADD COLUMN {nom} {definition}")


def get_db() -> Iterator[sqlite3.Connection]:
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()
