import type { ComplianceAnforderungen, InterneAudits, Risikobewertung } from './app';

export type EnrichedComplianceAnforderungen = ComplianceAnforderungen & {
  verknuepfte_kontrollenName: string;
};

export type EnrichedRisikobewertung = Risikobewertung & {
  betroffene_assetsName: string;
  zugehoerige_kontrollenName: string;
};

export type EnrichedInterneAudits = InterneAudits & {
  geprueft_kontrolleName: string;
  geprueft_complianceName: string;
};
