import { useState, useEffect, useMemo, useCallback } from 'react';
import type { RisikobehandlungMassnahmenplan, ComplianceAnforderungen, InterneAudits, Sicherheitskontrollen, Assets, Risikobewertung, Informationssicherheitsrisiken } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [risikobehandlungMassnahmenplan, setRisikobehandlungMassnahmenplan] = useState<RisikobehandlungMassnahmenplan[]>([]);
  const [complianceAnforderungen, setComplianceAnforderungen] = useState<ComplianceAnforderungen[]>([]);
  const [interneAudits, setInterneAudits] = useState<InterneAudits[]>([]);
  const [sicherheitskontrollen, setSicherheitskontrollen] = useState<Sicherheitskontrollen[]>([]);
  const [assets, setAssets] = useState<Assets[]>([]);
  const [risikobewertung, setRisikobewertung] = useState<Risikobewertung[]>([]);
  const [informationssicherheitsrisiken, setInformationssicherheitsrisiken] = useState<Informationssicherheitsrisiken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [risikobehandlungMassnahmenplanData, complianceAnforderungenData, interneAuditsData, sicherheitskontrollenData, assetsData, risikobewertungData, informationssicherheitsrisikenData] = await Promise.all([
        LivingAppsService.getRisikobehandlungMassnahmenplan(),
        LivingAppsService.getComplianceAnforderungen(),
        LivingAppsService.getInterneAudits(),
        LivingAppsService.getSicherheitskontrollen(),
        LivingAppsService.getAssets(),
        LivingAppsService.getRisikobewertung(),
        LivingAppsService.getInformationssicherheitsrisiken(),
      ]);
      setRisikobehandlungMassnahmenplan(risikobehandlungMassnahmenplanData);
      setComplianceAnforderungen(complianceAnforderungenData);
      setInterneAudits(interneAuditsData);
      setSicherheitskontrollen(sicherheitskontrollenData);
      setAssets(assetsData);
      setRisikobewertung(risikobewertungData);
      setInformationssicherheitsrisiken(informationssicherheitsrisikenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [risikobehandlungMassnahmenplanData, complianceAnforderungenData, interneAuditsData, sicherheitskontrollenData, assetsData, risikobewertungData, informationssicherheitsrisikenData] = await Promise.all([
          LivingAppsService.getRisikobehandlungMassnahmenplan(),
          LivingAppsService.getComplianceAnforderungen(),
          LivingAppsService.getInterneAudits(),
          LivingAppsService.getSicherheitskontrollen(),
          LivingAppsService.getAssets(),
          LivingAppsService.getRisikobewertung(),
          LivingAppsService.getInformationssicherheitsrisiken(),
        ]);
        setRisikobehandlungMassnahmenplan(risikobehandlungMassnahmenplanData);
        setComplianceAnforderungen(complianceAnforderungenData);
        setInterneAudits(interneAuditsData);
        setSicherheitskontrollen(sicherheitskontrollenData);
        setAssets(assetsData);
        setRisikobewertung(risikobewertungData);
        setInformationssicherheitsrisiken(informationssicherheitsrisikenData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const complianceAnforderungenMap = useMemo(() => {
    const m = new Map<string, ComplianceAnforderungen>();
    complianceAnforderungen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [complianceAnforderungen]);

  const sicherheitskontrollenMap = useMemo(() => {
    const m = new Map<string, Sicherheitskontrollen>();
    sicherheitskontrollen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [sicherheitskontrollen]);

  const assetsMap = useMemo(() => {
    const m = new Map<string, Assets>();
    assets.forEach(r => m.set(r.record_id, r));
    return m;
  }, [assets]);

  const informationssicherheitsrisikenMap = useMemo(() => {
    const m = new Map<string, Informationssicherheitsrisiken>();
    informationssicherheitsrisiken.forEach(r => m.set(r.record_id, r));
    return m;
  }, [informationssicherheitsrisiken]);

  return { risikobehandlungMassnahmenplan, setRisikobehandlungMassnahmenplan, complianceAnforderungen, setComplianceAnforderungen, interneAudits, setInterneAudits, sicherheitskontrollen, setSicherheitskontrollen, assets, setAssets, risikobewertung, setRisikobewertung, informationssicherheitsrisiken, setInformationssicherheitsrisiken, loading, error, fetchAll, complianceAnforderungenMap, sicherheitskontrollenMap, assetsMap, informationssicherheitsrisikenMap };
}