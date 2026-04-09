import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichComplianceAnforderungen, enrichRisikobewertung, enrichInterneAudits } from '@/lib/enrich';
import type { EnrichedRisikobewertung } from '@/types/enriched';
import type { Assets, Sicherheitskontrollen, ComplianceAnforderungen, InterneAudits } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AssetsDialog } from '@/components/dialogs/AssetsDialog';
import { SicherheitskontrollenDialog } from '@/components/dialogs/SicherheitskontrollenDialog';
import { ComplianceAnforderungenDialog } from '@/components/dialogs/ComplianceAnforderungenDialog';
import { RisikobewertungDialog } from '@/components/dialogs/RisikobewertungDialog';
import { InterneAuditsDialog } from '@/components/dialogs/InterneAuditsDialog';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconShieldCheck, IconAlertTriangle, IconClipboardList,
  IconPlus, IconPencil, IconTrash, IconBuilding,
  IconEye, IconCalendarEvent, IconChevronRight,
} from '@tabler/icons-react';

const APPGROUP_ID = '69d7bc0d9c9f4375d52ed8b4';
const REPAIR_ENDPOINT = '/claude/build/repair';

// Risk score helper
function getRiskScore(r: EnrichedRisikobewertung): number {
  const prob: Record<string, number> = { sehr_gering: 1, gering: 2, mittel: 3, hoch: 4, sehr_hoch: 5 };
  const schaden: Record<string, number> = { sehr_gering: 1, gering: 2, mittel: 3, hoch: 4, sehr_hoch: 5 };
  const p = prob[r.fields.eintrittswahrscheinlichkeit?.key ?? ''] ?? 0;
  const s = schaden[r.fields.schadensausmass?.key ?? ''] ?? 0;
  return p * s;
}

function getRiskLevel(score: number): { label: string; color: string; bg: string } {
  if (score >= 16) return { label: 'Kritisch', color: 'text-red-600', bg: 'bg-red-500' };
  if (score >= 9) return { label: 'Hoch', color: 'text-orange-600', bg: 'bg-orange-500' };
  if (score >= 4) return { label: 'Mittel', color: 'text-yellow-600', bg: 'bg-yellow-500' };
  return { label: 'Niedrig', color: 'text-green-600', bg: 'bg-green-500' };
}

function getStatusBadgeClass(key: string | undefined): string {
  switch (key) {
    case 'konform': return 'bg-green-100 text-green-700 border-green-200';
    case 'teilweise_konform': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'nicht_konform': return 'bg-red-100 text-red-700 border-red-200';
    case 'in_bearbeitung': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'implementiert': return 'bg-green-100 text-green-700 border-green-200';
    case 'in_umsetzung': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'geplant': return 'bg-gray-100 text-gray-600 border-gray-200';
    case 'aktiv': return 'bg-green-100 text-green-700 border-green-200';
    case 'kritisch': return 'bg-red-100 text-red-700 border-red-200';
    case 'hoch': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'offen': return 'bg-red-100 text-red-700 border-red-200';
    case 'in_behandlung': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'geschlossen': return 'bg-gray-100 text-gray-600 border-gray-200';
    case 'abgeschlossen': return 'bg-green-100 text-green-700 border-green-200';
    default: return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

type ActiveTab = 'risiken' | 'compliance' | 'assets' | 'kontrollen' | 'audits';

export default function DashboardOverview() {
  const {
    assets, sicherheitskontrollen, complianceAnforderungen, risikobewertung, interneAudits,
    assetsMap, sicherheitskontrollenMap, complianceAnforderungenMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedCompliance = enrichComplianceAnforderungen(complianceAnforderungen, { sicherheitskontrollenMap });
  const enrichedRisiken = enrichRisikobewertung(risikobewertung, { assetsMap, sicherheitskontrollenMap });
  const enrichedAudits = enrichInterneAudits(interneAudits, { sicherheitskontrollenMap, complianceAnforderungenMap });

  const [activeTab, setActiveTab] = useState<ActiveTab>('risiken');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: ActiveTab } | null>(null);

  // Dialog states
  const [assetDialog, setAssetDialog] = useState<{ open: boolean; record?: Assets }>({ open: false });
  const [kontrolleDialog, setKontrolleDialog] = useState<{ open: boolean; record?: Sicherheitskontrollen }>({ open: false });
  const [complianceDialog, setComplianceDialog] = useState<{ open: boolean; record?: ComplianceAnforderungen }>({ open: false });
  const [risikoDialog, setRisikoDialog] = useState<{ open: boolean; record?: EnrichedRisikobewertung }>({ open: false });
  const [auditDialog, setAuditDialog] = useState<{ open: boolean; record?: InterneAudits }>({ open: false });

  // Computed stats
  const stats = useMemo(() => {
    const kritischeRisiken = enrichedRisiken.filter(r => getRiskScore(r) >= 9).length;
    const offeneCompliance = complianceAnforderungen.filter(r => r.fields.compliance_status?.key === 'nicht_konform').length;
    const implementierteKontrollen = sicherheitskontrollen.filter(r => r.fields.implementierungsstatus?.key === 'implementiert').length;
    const laufendeAudits = interneAudits.filter(r => r.fields.audit_status?.key === 'in_durchfuehrung').length;
    return { kritischeRisiken, offeneCompliance, implementierteKontrollen, laufendeAudits };
  }, [enrichedRisiken, complianceAnforderungen, sicherheitskontrollen, interneAudits]);

  // Sorted risks for matrix
  const sortedRisiken = useMemo(() =>
    [...enrichedRisiken].sort((a, b) => getRiskScore(b) - getRiskScore(a)),
    [enrichedRisiken]
  );

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'assets') await LivingAppsService.deleteAsset(deleteTarget.id);
      else if (deleteTarget.type === 'kontrollen') await LivingAppsService.deleteSicherheitskontrollenEntry(deleteTarget.id);
      else if (deleteTarget.type === 'compliance') await LivingAppsService.deleteComplianceAnforderungenEntry(deleteTarget.id);
      else if (deleteTarget.type === 'risiken') await LivingAppsService.deleteRisikobewertungEntry(deleteTarget.id);
      else if (deleteTarget.type === 'audits') await LivingAppsService.deleteInterneAudit(deleteTarget.id);
      fetchAll();
    } finally {
      setDeleteTarget(null);
    }
  };

  const tabs: { id: ActiveTab; label: string; count: number }[] = [
    { id: 'risiken', label: 'Risiken', count: enrichedRisiken.length },
    { id: 'compliance', label: 'Compliance', count: complianceAnforderungen.length },
    { id: 'assets', label: 'Assets', count: assets.length },
    { id: 'kontrollen', label: 'Kontrollen', count: sicherheitskontrollen.length },
    { id: 'audits', label: 'Audits', count: interneAudits.length },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Kritische Risiken"
          value={String(stats.kritischeRisiken)}
          description="Hoch + Kritisch"
          icon={<IconAlertTriangle size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Nicht konform"
          value={String(stats.offeneCompliance)}
          description="Compliance-Anforderungen"
          icon={<IconClipboardList size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Implementiert"
          value={String(stats.implementierteKontrollen)}
          description={`von ${sicherheitskontrollen.length} Kontrollen`}
          icon={<IconShieldCheck size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Laufende Audits"
          value={String(stats.laufendeAudits)}
          description="In Durchführung"
          icon={<IconCalendarEvent size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Risk Matrix Hero */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-foreground">Risikomatrix</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Eintrittswahrscheinlichkeit × Schadensausmaß</p>
          </div>
          <Button size="sm" onClick={() => setRisikoDialog({ open: true })}>
            <IconPlus size={14} className="mr-1 shrink-0" />
            <span>Neues Risiko</span>
          </Button>
        </div>
        <div className="p-4">
          {/* 5×5 Risk Matrix Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[320px]">
              {/* Y-axis label */}
              <div className="flex gap-1 items-end mb-1">
                <div className="w-16 shrink-0" />
                {[1, 2, 3, 4, 5].map(col => (
                  <div key={col} className="flex-1 text-center text-[10px] text-muted-foreground truncate">
                    {col === 1 ? 'Sehr gering' : col === 3 ? 'Mittel' : col === 5 ? 'Sehr hoch' : ''}
                  </div>
                ))}
              </div>
              <div className="flex gap-1 items-end mb-0.5">
                <div className="w-16 shrink-0" />
                <div className="flex-1 text-center text-[10px] text-muted-foreground col-span-5">Eintrittswahrscheinlichkeit →</div>
              </div>
              {[5, 4, 3, 2, 1].map(row => (
                <div key={row} className="flex gap-1 mb-1">
                  <div className="w-16 shrink-0 text-[10px] text-muted-foreground flex items-center justify-end pr-1">
                    {row === 5 ? 'Sehr hoch' : row === 3 ? 'Mittel' : row === 1 ? 'Sehr gering' : ''}
                  </div>
                  {[1, 2, 3, 4, 5].map(col => {
                    const cellScore = col * row;
                    const cellRisiken = sortedRisiken.filter(r => {
                      const prob: Record<string, number> = { sehr_gering: 1, gering: 2, mittel: 3, hoch: 4, sehr_hoch: 5 };
                      const schaden: Record<string, number> = { sehr_gering: 1, gering: 2, mittel: 3, hoch: 4, sehr_hoch: 5 };
                      return prob[r.fields.eintrittswahrscheinlichkeit?.key ?? ''] === col &&
                             schaden[r.fields.schadensausmass?.key ?? ''] === row;
                    });
                    const cellLevel = getRiskLevel(cellScore);
                    return (
                      <div
                        key={col}
                        className={`flex-1 min-h-[44px] rounded-lg border flex flex-col gap-0.5 p-1 ${
                          cellScore >= 16 ? 'bg-red-50 border-red-200' :
                          cellScore >= 9 ? 'bg-orange-50 border-orange-200' :
                          cellScore >= 4 ? 'bg-yellow-50 border-yellow-200' :
                          'bg-green-50 border-green-200'
                        }`}
                      >
                        <span className={`text-[9px] font-semibold ${cellLevel.color}`}>{cellScore}</span>
                        {cellRisiken.map(r => (
                          <button
                            key={r.record_id}
                            onClick={() => setRisikoDialog({ open: true, record: r })}
                            className="text-[9px] leading-tight text-left truncate hover:underline font-medium text-foreground"
                            title={r.fields.risiko_name ?? ''}
                          >
                            {r.fields.risiko_name ?? '–'}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation + Content */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        {/* Tabs */}
        <div className="border-b overflow-x-auto">
          <div className="flex min-w-max">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 border-b-2 ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-normal ${
                  activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content: Risiken */}
        {activeTab === 'risiken' && (
          <div>
            <div className="p-3 border-b flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setRisikoDialog({ open: true })}>
                <IconPlus size={14} className="mr-1 shrink-0" /><span>Neues Risiko</span>
              </Button>
            </div>
            {sortedRisiken.length === 0 ? (
              <EmptyState icon={<IconAlertTriangle size={32} stroke={1.5} />} text="Keine Risiken erfasst" />
            ) : (
              <div className="divide-y">
                {sortedRisiken.map(r => {
                  const score = getRiskScore(r);
                  const level = getRiskLevel(score);
                  return (
                    <div key={r.record_id} className="flex items-center gap-3 px-4 py-3">
                      <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-white font-bold text-sm ${level.bg}`}>
                        {score}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{r.fields.risiko_name ?? '–'}</div>
                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                          {r.fields.risiko_kategorie && (
                            <span className="text-xs text-muted-foreground">{r.fields.risiko_kategorie.label}</span>
                          )}
                          {r.fields.risiko_status && (
                            <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${getStatusBadgeClass(r.fields.risiko_status.key)}`}>
                              {r.fields.risiko_status.label}
                            </span>
                          )}
                          {r.betroffene_assetsName && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <IconBuilding size={10} className="shrink-0" />{r.betroffene_assetsName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setRisikoDialog({ open: true, record: r })} className="p-1.5 rounded hover:bg-accent transition-colors">
                          <IconPencil size={14} className="text-muted-foreground" />
                        </button>
                        <button onClick={() => setDeleteTarget({ id: r.record_id, type: 'risiken' })} className="p-1.5 rounded hover:bg-destructive/10 transition-colors">
                          <IconTrash size={14} className="text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Compliance */}
        {activeTab === 'compliance' && (
          <div>
            <div className="p-3 border-b flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setComplianceDialog({ open: true })}>
                <IconPlus size={14} className="mr-1 shrink-0" /><span>Neue Anforderung</span>
              </Button>
            </div>
            {enrichedCompliance.length === 0 ? (
              <EmptyState icon={<IconClipboardList size={32} stroke={1.5} />} text="Keine Compliance-Anforderungen erfasst" />
            ) : (
              <div className="divide-y">
                {enrichedCompliance.map(r => (
                  <div key={r.record_id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-sm truncate">{r.fields.anforderung_name ?? '–'}</span>
                        {r.fields.anforderung_id && (
                          <span className="text-xs text-muted-foreground shrink-0">{r.fields.anforderung_id}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-0.5 items-center">
                        {r.fields.rahmenwerk && (
                          <Badge variant="outline" className="text-xs">{r.fields.rahmenwerk.label}</Badge>
                        )}
                        {r.fields.compliance_status && (
                          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${getStatusBadgeClass(r.fields.compliance_status.key)}`}>
                            {r.fields.compliance_status.label}
                          </span>
                        )}
                        {r.fields.faelligkeitsdatum && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <IconCalendarEvent size={10} className="shrink-0" />
                            {formatDate(r.fields.faelligkeitsdatum)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setComplianceDialog({ open: true, record: r })} className="p-1.5 rounded hover:bg-accent transition-colors">
                        <IconPencil size={14} className="text-muted-foreground" />
                      </button>
                      <button onClick={() => setDeleteTarget({ id: r.record_id, type: 'compliance' })} className="p-1.5 rounded hover:bg-destructive/10 transition-colors">
                        <IconTrash size={14} className="text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Assets */}
        {activeTab === 'assets' && (
          <div>
            <div className="p-3 border-b flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setAssetDialog({ open: true })}>
                <IconPlus size={14} className="mr-1 shrink-0" /><span>Neues Asset</span>
              </Button>
            </div>
            {assets.length === 0 ? (
              <EmptyState icon={<IconBuilding size={32} stroke={1.5} />} text="Keine Assets erfasst" />
            ) : (
              <div className="divide-y">
                {assets.map(r => (
                  <div key={r.record_id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{r.fields.asset_name ?? '–'}</div>
                      <div className="flex flex-wrap gap-1.5 mt-0.5">
                        {r.fields.asset_typ && (
                          <Badge variant="outline" className="text-xs">{r.fields.asset_typ.label}</Badge>
                        )}
                        {r.fields.asset_kritikalitaet && (
                          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${getStatusBadgeClass(r.fields.asset_kritikalitaet.key)}`}>
                            {r.fields.asset_kritikalitaet.label}
                          </span>
                        )}
                        {r.fields.asset_status && (
                          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${getStatusBadgeClass(r.fields.asset_status.key)}`}>
                            {r.fields.asset_status.label}
                          </span>
                        )}
                        {(r.fields.verantwortlicher_vorname || r.fields.verantwortlicher_nachname) && (
                          <span className="text-xs text-muted-foreground">
                            {[r.fields.verantwortlicher_vorname, r.fields.verantwortlicher_nachname].filter(Boolean).join(' ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setAssetDialog({ open: true, record: r })} className="p-1.5 rounded hover:bg-accent transition-colors">
                        <IconPencil size={14} className="text-muted-foreground" />
                      </button>
                      <button onClick={() => setDeleteTarget({ id: r.record_id, type: 'assets' })} className="p-1.5 rounded hover:bg-destructive/10 transition-colors">
                        <IconTrash size={14} className="text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Kontrollen */}
        {activeTab === 'kontrollen' && (
          <div>
            <div className="p-3 border-b flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setKontrolleDialog({ open: true })}>
                <IconPlus size={14} className="mr-1 shrink-0" /><span>Neue Kontrolle</span>
              </Button>
            </div>
            {sicherheitskontrollen.length === 0 ? (
              <EmptyState icon={<IconShieldCheck size={32} stroke={1.5} />} text="Keine Sicherheitskontrollen erfasst" />
            ) : (
              <div className="divide-y">
                {sicherheitskontrollen.map(r => (
                  <div key={r.record_id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{r.fields.kontrolle_name ?? '–'}</div>
                      <div className="flex flex-wrap gap-1.5 mt-0.5">
                        {r.fields.kontrolle_typ && (
                          <Badge variant="outline" className="text-xs">{r.fields.kontrolle_typ.label}</Badge>
                        )}
                        {r.fields.implementierungsstatus && (
                          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${getStatusBadgeClass(r.fields.implementierungsstatus.key)}`}>
                            {r.fields.implementierungsstatus.label}
                          </span>
                        )}
                        {r.fields.wirksamkeit && (
                          <span className="text-xs text-muted-foreground">Wirksamkeit: {r.fields.wirksamkeit.label}</span>
                        )}
                        {r.fields.naechste_ueberpruefung && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <IconCalendarEvent size={10} className="shrink-0" />
                            {formatDate(r.fields.naechste_ueberpruefung)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setKontrolleDialog({ open: true, record: r })} className="p-1.5 rounded hover:bg-accent transition-colors">
                        <IconPencil size={14} className="text-muted-foreground" />
                      </button>
                      <button onClick={() => setDeleteTarget({ id: r.record_id, type: 'kontrollen' })} className="p-1.5 rounded hover:bg-destructive/10 transition-colors">
                        <IconTrash size={14} className="text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Audits */}
        {activeTab === 'audits' && (
          <div>
            <div className="p-3 border-b flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setAuditDialog({ open: true })}>
                <IconPlus size={14} className="mr-1 shrink-0" /><span>Neues Audit</span>
              </Button>
            </div>
            {enrichedAudits.length === 0 ? (
              <EmptyState icon={<IconEye size={32} stroke={1.5} />} text="Keine Audits erfasst" />
            ) : (
              <div className="divide-y">
                {enrichedAudits.map(r => (
                  <div key={r.record_id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{r.fields.audit_titel ?? '–'}</div>
                      <div className="flex flex-wrap gap-1.5 mt-0.5 items-center">
                        {r.fields.audit_typ && (
                          <Badge variant="outline" className="text-xs">{r.fields.audit_typ.label}</Badge>
                        )}
                        {r.fields.audit_status && (
                          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${getStatusBadgeClass(r.fields.audit_status.key)}`}>
                            {r.fields.audit_status.label}
                          </span>
                        )}
                        {r.fields.audit_ergebnis && (
                          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${getStatusBadgeClass(r.fields.audit_ergebnis.key)}`}>
                            {r.fields.audit_ergebnis.label}
                          </span>
                        )}
                        {r.fields.audit_startdatum && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <IconCalendarEvent size={10} className="shrink-0" />
                            {formatDate(r.fields.audit_startdatum)}
                            {r.fields.audit_enddatum && ` – ${formatDate(r.fields.audit_enddatum)}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setAuditDialog({ open: true, record: r })} className="p-1.5 rounded hover:bg-accent transition-colors">
                        <IconPencil size={14} className="text-muted-foreground" />
                      </button>
                      <button onClick={() => setDeleteTarget({ id: r.record_id, type: 'audits' })} className="p-1.5 rounded hover:bg-destructive/10 transition-colors">
                        <IconTrash size={14} className="text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upcoming deadlines */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-foreground">Anstehende Fristen</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Kontrollen & Compliance in den nächsten 90 Tagen</p>
        </div>
        <DeadlineList
          sicherheitskontrollen={sicherheitskontrollen}
          complianceAnforderungen={complianceAnforderungen}
          onEditKontrolle={(r) => setKontrolleDialog({ open: true, record: r })}
          onEditCompliance={(r) => setComplianceDialog({ open: true, record: r })}
        />
      </div>

      {/* Dialogs */}
      <AssetsDialog
        open={assetDialog.open}
        onClose={() => setAssetDialog({ open: false })}
        onSubmit={async (fields) => {
          if (assetDialog.record) await LivingAppsService.updateAsset(assetDialog.record.record_id, fields);
          else await LivingAppsService.createAsset(fields);
          fetchAll();
        }}
        defaultValues={assetDialog.record?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Assets']}
      />
      <SicherheitskontrollenDialog
        open={kontrolleDialog.open}
        onClose={() => setKontrolleDialog({ open: false })}
        onSubmit={async (fields) => {
          if (kontrolleDialog.record) await LivingAppsService.updateSicherheitskontrollenEntry(kontrolleDialog.record.record_id, fields);
          else await LivingAppsService.createSicherheitskontrollenEntry(fields);
          fetchAll();
        }}
        defaultValues={kontrolleDialog.record?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Sicherheitskontrollen']}
      />
      <ComplianceAnforderungenDialog
        open={complianceDialog.open}
        onClose={() => setComplianceDialog({ open: false })}
        onSubmit={async (fields) => {
          if (complianceDialog.record) await LivingAppsService.updateComplianceAnforderungenEntry(complianceDialog.record.record_id, fields);
          else await LivingAppsService.createComplianceAnforderungenEntry(fields);
          fetchAll();
        }}
        defaultValues={complianceDialog.record?.fields}
        sicherheitskontrollenList={sicherheitskontrollen}
        enablePhotoScan={AI_PHOTO_SCAN['ComplianceAnforderungen']}
      />
      <RisikobewertungDialog
        open={risikoDialog.open}
        onClose={() => setRisikoDialog({ open: false })}
        onSubmit={async (fields) => {
          if (risikoDialog.record) await LivingAppsService.updateRisikobewertungEntry(risikoDialog.record.record_id, fields);
          else await LivingAppsService.createRisikobewertungEntry(fields);
          fetchAll();
        }}
        defaultValues={risikoDialog.record?.fields}
        assetsList={assets}
        sicherheitskontrollenList={sicherheitskontrollen}
        enablePhotoScan={AI_PHOTO_SCAN['Risikobewertung']}
      />
      <InterneAuditsDialog
        open={auditDialog.open}
        onClose={() => setAuditDialog({ open: false })}
        onSubmit={async (fields) => {
          if (auditDialog.record) await LivingAppsService.updateInterneAudit(auditDialog.record.record_id, fields);
          else await LivingAppsService.createInterneAudit(fields);
          fetchAll();
        }}
        defaultValues={auditDialog.record?.fields}
        sicherheitskontrollenList={sicherheitskontrollen}
        compliance_anforderungenList={complianceAnforderungen}
        enablePhotoScan={AI_PHOTO_SCAN['InterneAudits']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eintrag löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
      {icon}
      <span className="text-sm">{text}</span>
    </div>
  );
}

function DeadlineList({
  sicherheitskontrollen,
  complianceAnforderungen,
  onEditKontrolle,
  onEditCompliance,
}: {
  sicherheitskontrollen: Sicherheitskontrollen[];
  complianceAnforderungen: ComplianceAnforderungen[];
  onEditKontrolle: (r: Sicherheitskontrollen) => void;
  onEditCompliance: (r: ComplianceAnforderungen) => void;
}) {
  const today = new Date();
  const in90 = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

  type DeadlineItem =
    | { type: 'kontrolle'; record: Sicherheitskontrollen; date: Date; label: string }
    | { type: 'compliance'; record: ComplianceAnforderungen; date: Date; label: string };

  const items: DeadlineItem[] = [];

  sicherheitskontrollen.forEach(r => {
    if (!r.fields.naechste_ueberpruefung) return;
    const d = new Date(r.fields.naechste_ueberpruefung);
    if (d >= today && d <= in90) {
      items.push({ type: 'kontrolle', record: r, date: d, label: r.fields.kontrolle_name ?? '–' });
    }
  });

  complianceAnforderungen.forEach(r => {
    if (!r.fields.faelligkeitsdatum) return;
    const d = new Date(r.fields.faelligkeitsdatum);
    if (d >= today && d <= in90) {
      items.push({ type: 'compliance', record: r, date: d, label: r.fields.anforderung_name ?? '–' });
    }
  });

  items.sort((a, b) => a.date.getTime() - b.date.getTime());

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
        <IconCheck size={28} stroke={1.5} />
        <span className="text-sm">Keine Fristen in den nächsten 90 Tagen</span>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {items.map((item, i) => {
        const daysLeft = Math.ceil((item.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const urgent = daysLeft <= 14;
        return (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className={`w-10 shrink-0 text-center ${urgent ? 'text-red-600' : 'text-muted-foreground'}`}>
              <div className={`text-lg font-bold leading-none ${urgent ? 'text-red-600' : 'text-foreground'}`}>{daysLeft}</div>
              <div className="text-[10px]">Tage</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{item.label}</div>
              <div className="text-xs text-muted-foreground">
                {item.type === 'kontrolle' ? 'Sicherheitskontrolle' : 'Compliance-Anforderung'} · {formatDate(item.date.toISOString())}
              </div>
            </div>
            <button
              onClick={() => item.type === 'kontrolle' ? onEditKontrolle(item.record as Sicherheitskontrollen) : onEditCompliance(item.record as ComplianceAnforderungen)}
              className="p-1.5 rounded hover:bg-accent transition-colors shrink-0"
            >
              <IconChevronRight size={14} className="text-muted-foreground" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

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
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
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
