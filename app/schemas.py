from datetime import date
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator, model_validator

Texte = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]
TexteFacultatif = Annotated[str, StringConstraints(strip_whitespace=True, max_length=150)]
Commentaire = Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)]

CHAMPS_TEXTE_FACULTATIFS = ("filiere", "ville", "tuteur_ecole", "maitre_stage", "commentaire")


class Statut(str, Enum):
    a_venir = "a_venir"
    en_cours = "en_cours"
    termine = "termine"


class StageIn(BaseModel):
    nom_etudiant: Texte = Field(description="Nom de l'étudiant (données fictives uniquement)")
    entreprise: Texte = Field(description="Entreprise d'accueil")
    intitule: Texte = Field(description="Intitulé du stage")
    date_debut: date = Field(description="Date de début (AAAA-MM-JJ)")
    date_fin: date = Field(description="Date de fin (AAAA-MM-JJ)")
    filiere: TexteFacultatif | None = Field(None, description="Filière de l'étudiant")
    ville: TexteFacultatif | None = Field(None, description="Ville du lieu de stage")
    tuteur_ecole: TexteFacultatif | None = Field(None, description="Tuteur pédagogique à l'école")
    maitre_stage: TexteFacultatif | None = Field(None, description="Maître de stage en entreprise")
    convention_signee: bool = Field(False, description="La convention de stage est-elle signée ?")
    rapport_remis: bool = Field(False, description="Le rapport de stage a-t-il été remis ?")
    note: int | None = Field(None, ge=0, le=20, description="Note finale sur 20")
    commentaire: Commentaire | None = Field(None, description="Remarques libres")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "nom_etudiant": "Camille Durand",
                "entreprise": "Altéa Systems",
                "intitule": "Développeur API REST",
                "date_debut": "2027-03-01",
                "date_fin": "2027-08-27",
                "filiere": "Informatique",
                "ville": "Toulouse",
                "tuteur_ecole": "Mme Lefèvre",
                "maitre_stage": "M. Garnier",
                "convention_signee": True,
                "rapport_remis": False,
                "note": None,
                "commentaire": "Mission autour d'une API de facturation.",
            }
        }
    )

    @field_validator(*CHAMPS_TEXTE_FACULTATIFS, mode="after")
    @classmethod
    def vide_devient_nul(cls, valeur: str | None) -> str | None:
        return valeur or None

    @model_validator(mode="after")
    def dates_coherentes(self) -> "StageIn":
        if self.date_fin < self.date_debut:
            raise ValueError("La date de fin doit être postérieure ou égale à la date de début")
        return self


class StagePatch(BaseModel):
    nom_etudiant: Texte | None = None
    entreprise: Texte | None = None
    intitule: Texte | None = None
    date_debut: date | None = None
    date_fin: date | None = None
    filiere: TexteFacultatif | None = None
    ville: TexteFacultatif | None = None
    tuteur_ecole: TexteFacultatif | None = None
    maitre_stage: TexteFacultatif | None = None
    convention_signee: bool | None = None
    rapport_remis: bool | None = None
    note: int | None = Field(None, ge=0, le=20)
    commentaire: Commentaire | None = None

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={"example": {"convention_signee": True, "rapport_remis": True, "note": 16}},
    )


class StageOut(StageIn):
    id: int = Field(description="Identifiant unique (URI : /stages/{id})")
    statut: Statut = Field(description="Calculé à partir des dates : a_venir, en_cours ou termine")
    duree_jours: int = Field(description="Durée du stage en jours (calendaires)")
    avancement: int = Field(description="Avancement en pourcentage (0 avant le début, 100 après la fin)")


class Alerte(BaseModel):
    stage_id: int
    nom_etudiant: str
    entreprise: str
    type: str = Field(description="fin_proche, debut_proche, convention_manquante, rapport_manquant, note_manquante")
    niveau: str = Field(description="urgent ou info")
    message: str


class Erreur(BaseModel):
    detail: str

    model_config = ConfigDict(json_schema_extra={"example": {"detail": "Stage 42 introuvable"}})
