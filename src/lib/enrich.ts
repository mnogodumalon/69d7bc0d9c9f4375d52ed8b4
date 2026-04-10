import type { EnrichedComplianceAnforderungen, EnrichedInformationssicherheitsrisiken, EnrichedInterneAudits, EnrichedRisikobehandlungMassnahmenplan, EnrichedRisikobewertung } from '@/types/enriched';
import type { Assets, ComplianceAnforderungen, Informationssicherheitsrisiken, InterneAudits, RisikobehandlungMassnahmenplan, Risikobewertung, Sicherheitskontrollen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface RisikobehandlungMassnahmenplanMaps {
  informationssicherheitsrisikenMap: Map<string, Informationssicherheitsrisiken>;
  sicherheitskontrollenMap: Map<string, Sicherheitskontrollen>;
}

export function enrichRisikobehandlungMassnahmenplan(
  risikobehandlungMassnahmenplan: RisikobehandlungMassnahmenplan[],
  maps: RisikobehandlungMassnahmenplanMaps
): EnrichedRisikobehandlungMassnahmenplan[] {
  return risikobehandlungMassnahmenplan.map(r => ({
    ...r,
    massnahme_is_risikoName: resolveDisplay(r.fields.massnahme_is_risiko, maps.informationssicherheitsrisikenMap, 'is_risiko_name'),
    massnahme_kontrolleName: resolveDisplay(r.fields.massnahme_kontrolle, maps.sicherheitskontrollenMap, 'kontrolle_name'),
  }));
}

interface ComplianceAnforderungenMaps {
  sicherheitskontrollenMap: Map<string, Sicherheitskontrollen>;
}

export function enrichComplianceAnforderungen(
  complianceAnforderungen: ComplianceAnforderungen[],
  maps: ComplianceAnforderungenMaps
): EnrichedComplianceAnforderungen[] {
  return complianceAnforderungen.map(r => ({
    ...r,
    verknuepfte_kontrollenName: resolveDisplay(r.fields.verknuepfte_kontrollen, maps.sicherheitskontrollenMap, 'kontrolle_name'),
  }));
}

interface InterneAuditsMaps {
  sicherheitskontrollenMap: Map<string, Sicherheitskontrollen>;
  complianceAnforderungenMap: Map<string, ComplianceAnforderungen>;
}

export function enrichInterneAudits(
  interneAudits: InterneAudits[],
  maps: InterneAuditsMaps
): EnrichedInterneAudits[] {
  return interneAudits.map(r => ({
    ...r,
    geprueft_kontrolleName: resolveDisplay(r.fields.geprueft_kontrolle, maps.sicherheitskontrollenMap, 'kontrolle_name'),
    geprueft_complianceName: resolveDisplay(r.fields.geprueft_compliance, maps.complianceAnforderungenMap, 'anforderung_name'),
  }));
}

interface RisikobewertungMaps {
  assetsMap: Map<string, Assets>;
  sicherheitskontrollenMap: Map<string, Sicherheitskontrollen>;
}

export function enrichRisikobewertung(
  risikobewertung: Risikobewertung[],
  maps: RisikobewertungMaps
): EnrichedRisikobewertung[] {
  return risikobewertung.map(r => ({
    ...r,
    betroffene_assetsName: resolveDisplay(r.fields.betroffene_assets, maps.assetsMap, 'asset_name'),
    zugehoerige_kontrollenName: resolveDisplay(r.fields.zugehoerige_kontrollen, maps.sicherheitskontrollenMap, 'kontrolle_name'),
  }));
}

interface InformationssicherheitsrisikenMaps {
  assetsMap: Map<string, Assets>;
  sicherheitskontrollenMap: Map<string, Sicherheitskontrollen>;
  complianceAnforderungenMap: Map<string, ComplianceAnforderungen>;
}

export function enrichInformationssicherheitsrisiken(
  informationssicherheitsrisiken: Informationssicherheitsrisiken[],
  maps: InformationssicherheitsrisikenMaps
): EnrichedInformationssicherheitsrisiken[] {
  return informationssicherheitsrisiken.map(r => ({
    ...r,
    is_betroffenes_assetName: resolveDisplay(r.fields.is_betroffenes_asset, maps.assetsMap, 'asset_name'),
    is_mitigierende_kontrolleName: resolveDisplay(r.fields.is_mitigierende_kontrolle, maps.sicherheitskontrollenMap, 'kontrolle_name'),
    is_relevante_complianceName: resolveDisplay(r.fields.is_relevante_compliance, maps.complianceAnforderungenMap, 'anforderung_name'),
  }));
}
