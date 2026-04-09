import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Assets, Sicherheitskontrollen, ComplianceAnforderungen, Risikobewertung, InterneAudits } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [assets, setAssets] = useState<Assets[]>([]);
  const [sicherheitskontrollen, setSicherheitskontrollen] = useState<Sicherheitskontrollen[]>([]);
  const [complianceAnforderungen, setComplianceAnforderungen] = useState<ComplianceAnforderungen[]>([]);
  const [risikobewertung, setRisikobewertung] = useState<Risikobewertung[]>([]);
  const [interneAudits, setInterneAudits] = useState<InterneAudits[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [assetsData, sicherheitskontrollenData, complianceAnforderungenData, risikobewertungData, interneAuditsData] = await Promise.all([
        LivingAppsService.getAssets(),
        LivingAppsService.getSicherheitskontrollen(),
        LivingAppsService.getComplianceAnforderungen(),
        LivingAppsService.getRisikobewertung(),
        LivingAppsService.getInterneAudits(),
      ]);
      setAssets(assetsData);
      setSicherheitskontrollen(sicherheitskontrollenData);
      setComplianceAnforderungen(complianceAnforderungenData);
      setRisikobewertung(risikobewertungData);
      setInterneAudits(interneAuditsData);
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
        const [assetsData, sicherheitskontrollenData, complianceAnforderungenData, risikobewertungData, interneAuditsData] = await Promise.all([
          LivingAppsService.getAssets(),
          LivingAppsService.getSicherheitskontrollen(),
          LivingAppsService.getComplianceAnforderungen(),
          LivingAppsService.getRisikobewertung(),
          LivingAppsService.getInterneAudits(),
        ]);
        setAssets(assetsData);
        setSicherheitskontrollen(sicherheitskontrollenData);
        setComplianceAnforderungen(complianceAnforderungenData);
        setRisikobewertung(risikobewertungData);
        setInterneAudits(interneAuditsData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const assetsMap = useMemo(() => {
    const m = new Map<string, Assets>();
    assets.forEach(r => m.set(r.record_id, r));
    return m;
  }, [assets]);

  const sicherheitskontrollenMap = useMemo(() => {
    const m = new Map<string, Sicherheitskontrollen>();
    sicherheitskontrollen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [sicherheitskontrollen]);

  const complianceAnforderungenMap = useMemo(() => {
    const m = new Map<string, ComplianceAnforderungen>();
    complianceAnforderungen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [complianceAnforderungen]);

  return { assets, setAssets, sicherheitskontrollen, setSicherheitskontrollen, complianceAnforderungen, setComplianceAnforderungen, risikobewertung, setRisikobewertung, interneAudits, setInterneAudits, loading, error, fetchAll, assetsMap, sicherheitskontrollenMap, complianceAnforderungenMap };
}