import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichRisikobehandlungMassnahmenplan, enrichComplianceAnforderungen, enrichInterneAudits, enrichRisikobewertung, enrichInformationssicherheitsrisiken } from '@/lib/enrich';
import type { EnrichedRisikobehandlungMassnahmenplan, EnrichedInformationssicherheitsrisiken } from '@/types/enriched';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/StatCard';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconShieldCheck, IconFileText, IconClipboardList, IconServer,
  IconPlus, IconPencil, IconTrash, IconChevronRight, IconAlertTriangle,
  IconShieldX, IconFilter, IconEye
} from '@tabler/icons-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { InformationssicherheitsrisikenDialog } from '@/components/dialogs/InformationssicherheitsrisikenDialog';
import { RisikobehandlungMassnahmenplanDialog } from '@/components/dialogs/RisikobehandlungMassnahmenplanDialog';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { APP_IDS } from '@/types/app';

const APPGROUP_ID = '69d7bc0d9c9f4375d52ed8b4';
const REPAIR_ENDPOINT = '/claude/build/repair';

type RisikoStatus = 'offen' | 'in_behandlung' | 'akzeptiert' | 'geschlossen' | 'alle';

const STATUS_COLUMNS: { key: RisikoStatus; label: string; color: string; bg: string; border: string }[] = [
  { key: 'offen', label: 'Offen', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/20', border: 'border-red-200 dark:border-red-800' },
  { key: 'in_behandlung', label: 'In Behandlung', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-800' },
  { key: 'akzeptiert', label: 'Akzeptiert', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-800' },
  { key: 'geschlossen', label: 'Geschlossen', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/20', border: 'border-green-200 dark:border-green-800' },
];

const RISIKO_FARBE: Record<string, string> = {
  niedrig: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  mittel: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  hoch: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  kritisch: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const MASSNAHME_STATUS_FARBE: Record<string, string> = {
  geplant: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  in_umsetzung: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  umgesetzt: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  abgebrochen: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  ueberprueft: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export default function DashboardOverview() {
  const {
    risikobehandlungMassnahmenplan, complianceAnforderungen, interneAudits, sicherheitskontrollen,
    assets, risikobewertung, informationssicherheitsrisiken,
    complianceAnforderungenMap, sicherheitskontrollenMap, assetsMap, informationssicherheitsrisikenMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const [filterStatus, setFilterStatus] = useState<RisikoStatus>('alle');
  const [filterRisiko, setFilterRisiko] = useState<string>('alle');
  const [selectedRisiko, setSelectedRisiko] = useState<EnrichedInformationssicherheitsrisiken | null>(null);
  const [risikoDialogOpen, setRisikoDialogOpen] = useState(false);
  const [editRisiko, setEditRisiko] = useState<EnrichedInformationssicherheitsrisiken | null>(null);
  const [deleteRisikoTarget, setDeleteRisikoTarget] = useState<EnrichedInformationssicherheitsrisiken | null>(null);
  const [massnahmeDialogOpen, setMassnahmeDialogOpen] = useState(false);
  const [editMassnahme, setEditMassnahme] = useState<EnrichedRisikobehandlungMassnahmenplan | null>(null);
  const [deleteMassnahmeTarget, setDeleteMassnahmeTarget] = useState<EnrichedRisikobehandlungMassnahmenplan | null>(null);
  const [newMassnahmeForRisiko, setNewMassnahmeForRisiko] = useState<string | null>(null);

  const enrichedRisikobehandlungMassnahmenplan = enrichRisikobehandlungMassnahmenplan(risikobehandlungMassnahmenplan, { informationssicherheitsrisikenMap, sicherheitskontrollenMap });
  const enrichedComplianceAnforderungen = enrichComplianceAnforderungen(complianceAnforderungen, { sicherheitskontrollenMap });
  const enrichedInterneAudits = enrichInterneAudits(interneAudits, { sicherheitskontrollenMap, complianceAnforderungenMap });
  const enrichedRisikobewertung = enrichRisikobewertung(risikobewertung, { assetsMap, sicherheitskontrollenMap });
  const enrichedInformationssicherheitsrisiken = enrichInformationssicherheitsrisiken(informationssicherheitsrisiken, { assetsMap, sicherheitskontrollenMap, complianceAnforderungenMap });

  // KPI-Berechnungen
  const kpiStats = useMemo(() => {
    const offeneRisiken = informationssicherheitsrisiken.filter(r => r.fields.is_status?.key === 'offen').length;
    const kritischeRisiken = informationssicherheitsrisiken.filter(r => r.fields.is_gesamtrisiko?.key === 'kritisch').length;
    const complianceKonform = complianceAnforderungen.filter(r => r.fields.compliance_status?.key === 'konform').length;
    const complianceGesamt = complianceAnforderungen.length;
    const offeneMassnahmen = risikobehandlungMassnahmenplan.filter(m => m.fields.massnahme_status?.key !== 'umgesetzt' && m.fields.massnahme_status?.key !== 'abgebrochen').length;
    const aktiveAudits = interneAudits.filter(a => a.fields.audit_status?.key === 'in_durchfuehrung').length;
    const implementierteKontrollen = sicherheitskontrollen.filter(k => k.fields.implementierungsstatus?.key === 'implementiert').length;
    const kontrollenGesamt = sicherheitskontrollen.length;
    return { offeneRisiken, kritischeRisiken, complianceKonform, complianceGesamt, offeneMassnahmen, aktiveAudits, implementierteKontrollen, kontrollenGesamt };
  }, [informationssicherheitsrisiken, complianceAnforderungen, risikobehandlungMassnahmenplan, interneAudits, sicherheitskontrollen]);

  // Gefilterte Risiken
  const filteredRisiken = useMemo(() => {
    return enrichedInformationssicherheitsrisiken.filter(r => {
      const statusOk = filterStatus === 'alle' || r.fields.is_status?.key === filterStatus;
      const risikoOk = filterRisiko === 'alle' || r.fields.is_gesamtrisiko?.key === filterRisiko;
      return statusOk && risikoOk;
    });
  }, [enrichedInformationssicherheitsrisiken, filterStatus, filterRisiko]);

  // Massnahmen für ausgewähltes Risiko
  const massnahmenFuerRisiko = useMemo(() => {
    if (!selectedRisiko) return [];
    return enrichedRisikobehandlungMassnahmenplan.filter(m => {
      const risikoId = m.fields.massnahme_is_risiko;
      if (!risikoId) return false;
      return risikoId.includes(selectedRisiko.record_id);
    });
  }, [enrichedRisikobehandlungMassnahmenplan, selectedRisiko]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const handleDeleteRisiko = async () => {
    if (!deleteRisikoTarget) return;
    await LivingAppsService.deleteInformationssicherheitsrisikenEntry(deleteRisikoTarget.record_id);
    if (selectedRisiko?.record_id === deleteRisikoTarget.record_id) setSelectedRisiko(null);
    setDeleteRisikoTarget(null);
    fetchAll();
  };

  const handleDeleteMassnahme = async () => {
    if (!deleteMassnahmeTarget) return;
    await LivingAppsService.deleteRisikobehandlungMassnahmenplanEntry(deleteMassnahmeTarget.record_id);
    setDeleteMassnahmeTarget(null);
    fetchAll();
  };

  const complianceRate = kpiStats.complianceGesamt > 0
    ? Math.round((kpiStats.complianceKonform / kpiStats.complianceGesamt) * 100)
    : 0;
  const kontrollenRate = kpiStats.kontrollenGesamt > 0
    ? Math.round((kpiStats.implementierteKontrollen / kpiStats.kontrollenGesamt) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* KPI-Karten */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Offene Risiken"
          value={String(kpiStats.offeneRisiken)}
          description={`${kpiStats.kritischeRisiken} kritisch`}
          icon={<IconShieldX size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Compliance"
          value={`${complianceRate}%`}
          description={`${kpiStats.complianceKonform} / ${kpiStats.complianceGesamt} konform`}
          icon={<IconFileText size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Maßnahmen offen"
          value={String(kpiStats.offeneMassnahmen)}
          description={`${enrichedRisikobewertung.length} Risikobewertungen`}
          icon={<IconClipboardList size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Kontrollen impl."
          value={`${kontrollenRate}%`}
          description={`${kpiStats.aktiveAudits} Audits laufend`}
          icon={<IconShieldCheck size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Hauptbereich: Risiken + Detailansicht */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Risikoregister links */}
        <div className="lg:col-span-3 space-y-3">
          {/* Header mit Filter */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">Informationssicherheitsrisiken</h2>
            <Button size="sm" onClick={() => { setEditRisiko(null); setRisikoDialogOpen(true); }}>
              <IconPlus size={14} className="shrink-0 mr-1" />Neu
            </Button>
          </div>

          {/* Filter-Leiste */}
          <div className="flex flex-wrap gap-2 items-center">
            <IconFilter size={14} className="shrink-0 text-muted-foreground" />
            <div className="flex flex-wrap gap-1">
              {(['alle', 'offen', 'in_behandlung', 'akzeptiert', 'geschlossen'] as RisikoStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                    filterStatus === s
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
                  }`}
                >
                  {s === 'alle' ? 'Alle Status' : s === 'in_behandlung' ? 'In Behandlung' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 ml-1">
              {(['alle', 'kritisch', 'hoch', 'mittel', 'niedrig'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setFilterRisiko(r)}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                    filterRisiko === r
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
                  }`}
                >
                  {r === 'alle' ? 'Alle Stufen' : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Risiko-Karten */}
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {filteredRisiken.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-3 text-muted-foreground">
                <IconShieldCheck size={40} stroke={1.5} />
                <p className="text-sm">Keine Risiken gefunden</p>
              </div>
            ) : (
              filteredRisiken.map(risiko => {
                const isSelected = selectedRisiko?.record_id === risiko.record_id;
                const gesamtrisiko = risiko.fields.is_gesamtrisiko?.key ?? '';
                const status = risiko.fields.is_status?.key ?? '';
                const statusCol = STATUS_COLUMNS.find(c => c.key === status);
                return (
                  <div
                    key={risiko.record_id}
                    onClick={() => setSelectedRisiko(isSelected ? null : risiko)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all overflow-hidden ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-card hover:border-foreground/30 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {gesamtrisiko && (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${RISIKO_FARBE[gesamtrisiko] ?? 'bg-muted text-muted-foreground'}`}>
                              {risiko.fields.is_gesamtrisiko?.label}
                            </span>
                          )}
                          {statusCol && (
                            <span className={`px-1.5 py-0.5 rounded text-xs ${statusCol.color}`}>
                              {statusCol.label}
                            </span>
                          )}
                          {risiko.fields.is_bedrohungsart && (
                            <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-xs">
                              {risiko.fields.is_bedrohungsart.label}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">
                          {risiko.fields.is_risiko_name ?? '(kein Name)'}
                        </p>
                        {risiko.is_betroffenes_assetName && (
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <IconServer size={11} className="shrink-0" />{risiko.is_betroffenes_assetName}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); setEditRisiko(risiko); setRisikoDialogOpen(true); }}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <IconPencil size={13} className="shrink-0" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteRisikoTarget(risiko); }}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <IconTrash size={13} className="shrink-0" />
                        </button>
                        <IconChevronRight size={14} className={`shrink-0 text-muted-foreground transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Detail-Panel rechts */}
        <div className="lg:col-span-2">
          {selectedRisiko ? (
            <RisikoDetailPanel
              risiko={selectedRisiko}
              massnahmen={massnahmenFuerRisiko}
              onEditRisiko={() => { setEditRisiko(selectedRisiko); setRisikoDialogOpen(true); }}
              onAddMassnahme={() => {
                setNewMassnahmeForRisiko(selectedRisiko.record_id);
                setEditMassnahme(null);
                setMassnahmeDialogOpen(true);
              }}
              onEditMassnahme={(m) => { setEditMassnahme(m); setNewMassnahmeForRisiko(null); setMassnahmeDialogOpen(true); }}
              onDeleteMassnahme={(m) => setDeleteMassnahmeTarget(m)}
            />
          ) : (
            <div className="h-full min-h-[200px] flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border text-muted-foreground p-8">
              <IconEye size={36} stroke={1.5} />
              <div className="text-center">
                <p className="text-sm font-medium">Risiko auswählen</p>
                <p className="text-xs">Klicke auf ein Risiko, um Details und Maßnahmen anzuzeigen</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Unterer Bereich: Compliance + Audits Übersicht */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Compliance Anforderungen */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Compliance-Anforderungen</h3>
            <span className="text-xs text-muted-foreground">{enrichedComplianceAnforderungen.length} gesamt</span>
          </div>
          <div className="p-3 space-y-2 max-h-52 overflow-y-auto">
            {enrichedComplianceAnforderungen.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Keine Anforderungen vorhanden</p>
            ) : (
              enrichedComplianceAnforderungen.slice(0, 8).map(ca => {
                const status = ca.fields.compliance_status?.key ?? '';
                const statusLabel = ca.fields.compliance_status?.label ?? '';
                const statusColor = status === 'konform' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : status === 'nicht_konform' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : status === 'teilweise_konform' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-muted text-muted-foreground';
                return (
                  <div key={ca.record_id} className="flex items-center gap-2 min-w-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {ca.fields.anforderung_name ?? '(kein Name)'}
                      </p>
                      <p className="text-xs text-muted-foreground">{ca.fields.rahmenwerk?.label}</p>
                    </div>
                    {statusLabel && (
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${statusColor}`}>
                        {statusLabel}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Interne Audits */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Interne Audits</h3>
            <span className="text-xs text-muted-foreground">{enrichedInterneAudits.length} gesamt</span>
          </div>
          <div className="p-3 space-y-2 max-h-52 overflow-y-auto">
            {enrichedInterneAudits.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Keine Audits vorhanden</p>
            ) : (
              enrichedInterneAudits.slice(0, 6).map(audit => {
                const auditStatus = audit.fields.audit_status?.key ?? '';
                const auditStatusColor = auditStatus === 'abgeschlossen' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : auditStatus === 'in_durchfuehrung' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : auditStatus === 'geplant' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-muted text-muted-foreground';
                return (
                  <div key={audit.record_id} className="flex items-start gap-2 min-w-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {audit.fields.audit_titel ?? '(kein Titel)'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {audit.fields.audit_startdatum ? formatDate(audit.fields.audit_startdatum) : '–'}
                        {audit.fields.auditor_vorname ? ` · ${audit.fields.auditor_vorname} ${audit.fields.auditor_nachname ?? ''}`.trim() : ''}
                      </p>
                    </div>
                    {audit.fields.audit_status?.label && (
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${auditStatusColor}`}>
                        {audit.fields.audit_status.label}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Assets Übersicht */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <IconServer size={15} className="shrink-0 text-muted-foreground" />
            Assets
          </h3>
          <span className="text-xs text-muted-foreground">{assets.length} gesamt</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Asset</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden sm:table-cell">Typ</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden md:table-cell">Verantwortlicher</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Kritikalität</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {assets.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted-foreground py-6">Keine Assets vorhanden</td></tr>
              ) : (
                assets.slice(0, 8).map(asset => {
                  const krit = asset.fields.asset_kritikalitaet?.key ?? '';
                  const kritColor = RISIKO_FARBE[krit] ?? 'bg-muted text-muted-foreground';
                  const assetStatus = asset.fields.asset_status?.key ?? '';
                  const assetStatusColor = assetStatus === 'aktiv' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : assetStatus === 'inaktiv' ? 'bg-muted text-muted-foreground'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
                  return (
                    <tr key={asset.record_id} className="border-b border-border/60 hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium text-foreground max-w-[180px] truncate">{asset.fields.asset_name ?? '–'}</td>
                      <td className="px-4 py-2 text-muted-foreground hidden sm:table-cell">{asset.fields.asset_typ?.label ?? '–'}</td>
                      <td className="px-4 py-2 text-muted-foreground hidden md:table-cell">
                        {[asset.fields.verantwortlicher_vorname, asset.fields.verantwortlicher_nachname].filter(Boolean).join(' ') || '–'}
                      </td>
                      <td className="px-4 py-2">
                        {asset.fields.asset_kritikalitaet?.label && (
                          <span className={`px-1.5 py-0.5 rounded font-medium ${kritColor}`}>
                            {asset.fields.asset_kritikalitaet.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {asset.fields.asset_status?.label && (
                          <span className={`px-1.5 py-0.5 rounded font-medium ${assetStatusColor}`}>
                            {asset.fields.asset_status.label}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialoge */}
      <InformationssicherheitsrisikenDialog
        open={risikoDialogOpen}
        onClose={() => { setRisikoDialogOpen(false); setEditRisiko(null); }}
        onSubmit={async (fields) => {
          if (editRisiko) {
            await LivingAppsService.updateInformationssicherheitsrisikenEntry(editRisiko.record_id, fields);
          } else {
            await LivingAppsService.createInformationssicherheitsrisikenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editRisiko?.fields}
        assetsList={assets}
        sicherheitskontrollenList={sicherheitskontrollen}
        compliance_anforderungenList={complianceAnforderungen}
        enablePhotoScan={AI_PHOTO_SCAN['Informationssicherheitsrisiken']}
      />

      <RisikobehandlungMassnahmenplanDialog
        open={massnahmeDialogOpen}
        onClose={() => { setMassnahmeDialogOpen(false); setEditMassnahme(null); setNewMassnahmeForRisiko(null); }}
        onSubmit={async (fields) => {
          if (editMassnahme) {
            await LivingAppsService.updateRisikobehandlungMassnahmenplanEntry(editMassnahme.record_id, fields);
          } else {
            const enrichedFields = newMassnahmeForRisiko
              ? { ...fields, massnahme_is_risiko: createRecordUrl(APP_IDS.INFORMATIONSSICHERHEITSRISIKEN, newMassnahmeForRisiko) }
              : fields;
            await LivingAppsService.createRisikobehandlungMassnahmenplanEntry(enrichedFields);
          }
          fetchAll();
        }}
        defaultValues={editMassnahme
          ? editMassnahme.fields
          : newMassnahmeForRisiko
            ? { massnahme_is_risiko: createRecordUrl(APP_IDS.INFORMATIONSSICHERHEITSRISIKEN, newMassnahmeForRisiko) }
            : undefined
        }
        informationssicherheitsrisikenList={informationssicherheitsrisiken}
        sicherheitskontrollenList={sicherheitskontrollen}
        enablePhotoScan={AI_PHOTO_SCAN['RisikobehandlungMassnahmenplan']}
      />

      <ConfirmDialog
        open={!!deleteRisikoTarget}
        title="Risiko löschen"
        description={`Soll das Risiko "${deleteRisikoTarget?.fields.is_risiko_name ?? ''}" wirklich gelöscht werden?`}
        onConfirm={handleDeleteRisiko}
        onClose={() => setDeleteRisikoTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteMassnahmeTarget}
        title="Maßnahme löschen"
        description={`Soll die Maßnahme "${deleteMassnahmeTarget?.fields.massnahme_name ?? ''}" wirklich gelöscht werden?`}
        onConfirm={handleDeleteMassnahme}
        onClose={() => setDeleteMassnahmeTarget(null)}
      />
    </div>
  );
}

// --- Risiko Detail Panel ---
interface RisikoDetailPanelProps {
  risiko: EnrichedInformationssicherheitsrisiken;
  massnahmen: EnrichedRisikobehandlungMassnahmenplan[];
  onEditRisiko: () => void;
  onAddMassnahme: () => void;
  onEditMassnahme: (m: EnrichedRisikobehandlungMassnahmenplan) => void;
  onDeleteMassnahme: (m: EnrichedRisikobehandlungMassnahmenplan) => void;
}

function RisikoDetailPanel({ risiko, massnahmen, onEditRisiko, onAddMassnahme, onEditMassnahme, onDeleteMassnahme }: RisikoDetailPanelProps) {
  const gesamtrisiko = risiko.fields.is_gesamtrisiko?.key ?? '';
  const statusCol = STATUS_COLUMNS.find(c => c.key === (risiko.fields.is_status?.key ?? ''));

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{risiko.fields.is_risiko_name ?? '(kein Name)'}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {gesamtrisiko && (
              <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${RISIKO_FARBE[gesamtrisiko] ?? 'bg-muted text-muted-foreground'}`}>
                {risiko.fields.is_gesamtrisiko?.label}
              </span>
            )}
            {statusCol && (
              <span className={`px-1.5 py-0.5 rounded text-xs ${statusCol.color}`}>
                {statusCol.label}
              </span>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onEditRisiko} className="shrink-0">
          <IconPencil size={13} className="shrink-0 mr-1" />Bearbeiten
        </Button>
      </div>

      {/* Risiko Details */}
      <div className="px-4 py-3 space-y-2 border-b border-border flex-shrink-0">
        {risiko.fields.is_risiko_beschreibung && (
          <p className="text-xs text-muted-foreground line-clamp-2">{risiko.fields.is_risiko_beschreibung}</p>
        )}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {risiko.fields.is_bedrohungsquelle && (
            <div>
              <span className="text-muted-foreground">Bedrohungsquelle: </span>
              <span className="text-foreground">{risiko.fields.is_bedrohungsquelle.label}</span>
            </div>
          )}
          {risiko.fields.is_bedrohungsart && (
            <div>
              <span className="text-muted-foreground">Bedrohungsart: </span>
              <span className="text-foreground">{risiko.fields.is_bedrohungsart.label}</span>
            </div>
          )}
          {risiko.fields.is_eintrittswahrscheinlichkeit && (
            <div>
              <span className="text-muted-foreground">Wahrscheinlichkeit: </span>
              <span className="text-foreground">{risiko.fields.is_eintrittswahrscheinlichkeit.label}</span>
            </div>
          )}
          {risiko.is_betroffenes_assetName && (
            <div>
              <span className="text-muted-foreground">Asset: </span>
              <span className="text-foreground truncate">{risiko.is_betroffenes_assetName}</span>
            </div>
          )}
          {risiko.fields.is_verantwortlicher_vorname && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Verantwortlich: </span>
              <span className="text-foreground">{risiko.fields.is_verantwortlicher_vorname} {risiko.fields.is_verantwortlicher_nachname ?? ''}</span>
            </div>
          )}
          {risiko.fields.is_naechste_bewertung && (
            <div>
              <span className="text-muted-foreground">Nächste Bewertung: </span>
              <span className="text-foreground">{formatDate(risiko.fields.is_naechste_bewertung)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Maßnahmen */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <h4 className="text-xs font-semibold text-foreground">Maßnahmen ({massnahmen.length})</h4>
          <Button variant="outline" size="sm" onClick={onAddMassnahme} className="h-6 text-xs px-2">
            <IconPlus size={11} className="shrink-0 mr-0.5" />Neu
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {massnahmen.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2 text-muted-foreground">
              <IconAlertTriangle size={24} stroke={1.5} />
              <p className="text-xs">Keine Maßnahmen vorhanden</p>
              <Button variant="outline" size="sm" onClick={onAddMassnahme} className="text-xs h-7">
                <IconPlus size={11} className="mr-1" />Erste Maßnahme anlegen
              </Button>
            </div>
          ) : (
            massnahmen.map(m => {
              const mStatus = m.fields.massnahme_status?.key ?? '';
              const mPrio = m.fields.massnahme_prioritaet?.key ?? '';
              return (
                <div key={m.record_id} className="p-2.5 rounded-lg border border-border bg-background/60 space-y-1">
                  <div className="flex items-start justify-between gap-1.5 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate flex-1">{m.fields.massnahme_name ?? '(kein Name)'}</p>
                    <div className="flex gap-0.5 shrink-0">
                      <button
                        onClick={() => onEditMassnahme(m)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <IconPencil size={11} className="shrink-0" />
                      </button>
                      <button
                        onClick={() => onDeleteMassnahme(m)}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <IconTrash size={11} className="shrink-0" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {mStatus && (
                      <span className={`px-1.5 py-0.5 rounded text-xs ${MASSNAHME_STATUS_FARBE[mStatus] ?? 'bg-muted text-muted-foreground'}`}>
                        {m.fields.massnahme_status?.label}
                      </span>
                    )}
                    {mPrio && (
                      <span className={`px-1.5 py-0.5 rounded text-xs ${RISIKO_FARBE[mPrio] ?? 'bg-muted text-muted-foreground'}`}>
                        {m.fields.massnahme_prioritaet?.label}
                      </span>
                    )}
                    {m.fields.massnahme_geplantes_datum && (
                      <span className="text-xs text-muted-foreground">
                        bis {formatDate(m.fields.massnahme_geplantes_datum)}
                      </span>
                    )}
                  </div>
                  {m.fields.massnahme_verantwortlicher_vorname && (
                    <p className="text-xs text-muted-foreground">
                      {m.fields.massnahme_verantwortlicher_vorname} {m.fields.massnahme_verantwortlicher_nachname ?? ''}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// --- Skeleton ---
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}

// --- Error ---
function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
