import type { ComplianceAnforderungen, Informationssicherheitsrisiken, InterneAudits, RisikobehandlungMassnahmenplan, Risikobewertung } from './app';

export type EnrichedRisikobehandlungMassnahmenplan = RisikobehandlungMassnahmenplan & {
  massnahme_is_risikoName: string;
  massnahme_kontrolleName: string;
};

export type EnrichedComplianceAnforderungen = ComplianceAnforderungen & {
  verknuepfte_kontrollenName: string;
};

export type EnrichedInterneAudits = InterneAudits & {
  geprueft_kontrolleName: string;
  geprueft_complianceName: string;
};

export type EnrichedRisikobewertung = Risikobewertung & {
  betroffene_assetsName: string;
  zugehoerige_kontrollenName: string;
};

export type EnrichedInformationssicherheitsrisiken = Informationssicherheitsrisiken & {
  is_betroffenes_assetName: string;
  is_mitigierende_kontrolleName: string;
  is_relevante_complianceName: string;
};
