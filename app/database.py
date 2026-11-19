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


def get_db() -> Iterator[sqlite3.Connection]:
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()
