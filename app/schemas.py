from datetime import date
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

Texte = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]


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

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "nom_etudiant": "Camille Durand",
                "entreprise": "Altéa Systems",
                "intitule": "Développeur API REST",
                "date_debut": "2027-03-01",
                "date_fin": "2027-08-27",
            }
        }
    )

    @model_validator(mode="after")
    def dates_coherentes(self) -> "StageIn":
        if self.date_fin < self.date_debut:
            raise ValueError("La date de fin doit être postérieure ou égale à la date de début")
        return self


class StageOut(StageIn):

    id: int = Field(description="Identifiant unique (URI : /stages/{id})")
    statut: Statut = Field(description="Calculé à partir des dates : a_venir, en_cours ou termine")


class Erreur(BaseModel):
    detail: str

    model_config = ConfigDict(json_schema_extra={"example": {"detail": "Stage 42 introuvable"}})
