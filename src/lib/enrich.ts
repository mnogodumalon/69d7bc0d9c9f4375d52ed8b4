import type { EnrichedComplianceAnforderungen, EnrichedInterneAudits, EnrichedRisikobewertung } from '@/types/enriched';
import type { Assets, ComplianceAnforderungen, InterneAudits, Risikobewertung, Sicherheitskontrollen } from '@/types/app';
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
