import { useState, useMemo, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Assets, Sicherheitskontrollen, ComplianceAnforderungen, Risikobewertung, InterneAudits } from '@/types/app';
import { LivingAppsService, extractRecordId, cleanFieldsForApi } from '@/services/livingAppsService';
import { AssetsDialog } from '@/components/dialogs/AssetsDialog';
import { AssetsViewDialog } from '@/components/dialogs/AssetsViewDialog';
import { SicherheitskontrollenDialog } from '@/components/dialogs/SicherheitskontrollenDialog';
import { SicherheitskontrollenViewDialog } from '@/components/dialogs/SicherheitskontrollenViewDialog';
import { ComplianceAnforderungenDialog } from '@/components/dialogs/ComplianceAnforderungenDialog';
import { ComplianceAnforderungenViewDialog } from '@/components/dialogs/ComplianceAnforderungenViewDialog';
import { RisikobewertungDialog } from '@/components/dialogs/RisikobewertungDialog';
import { RisikobewertungViewDialog } from '@/components/dialogs/RisikobewertungViewDialog';
import { InterneAuditsDialog } from '@/components/dialogs/InterneAuditsDialog';
import { InterneAuditsViewDialog } from '@/components/dialogs/InterneAuditsViewDialog';
import { BulkEditDialog } from '@/components/dialogs/BulkEditDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconPencil, IconTrash, IconPlus, IconFilter, IconX, IconArrowsUpDown, IconArrowUp, IconArrowDown, IconSearch, IconCopy, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

// Field metadata per entity for bulk edit and column filters
const ASSETS_FIELDS = [
  { key: 'asset_name', label: 'Asset-Name', type: 'string/text' },
  { key: 'asset_beschreibung', label: 'Beschreibung', type: 'string/textarea' },
  { key: 'asset_typ', label: 'Asset-Typ', type: 'lookup/select', options: [{ key: 'it_system', label: 'IT-System' }, { key: 'daten', label: 'Daten' }, { key: 'software', label: 'Software' }, { key: 'hardware', label: 'Hardware' }, { key: 'prozess', label: 'Prozess' }, { key: 'dienstleistung', label: 'Dienstleistung' }, { key: 'sonstiges', label: 'Sonstiges' }] },
  { key: 'asset_kritikalitaet', label: 'Kritikalität', type: 'lookup/radio', options: [{ key: 'niedrig', label: 'Niedrig' }, { key: 'mittel', label: 'Mittel' }, { key: 'hoch', label: 'Hoch' }, { key: 'kritisch', label: 'Kritisch' }] },
  { key: 'verantwortlicher_vorname', label: 'Vorname des Verantwortlichen', type: 'string/text' },
  { key: 'verantwortlicher_nachname', label: 'Nachname des Verantwortlichen', type: 'string/text' },
  { key: 'abteilung', label: 'Abteilung', type: 'string/text' },
  { key: 'asset_status', label: 'Status', type: 'lookup/select', options: [{ key: 'aktiv', label: 'Aktiv' }, { key: 'inaktiv', label: 'Inaktiv' }, { key: 'in_planung', label: 'In Planung' }, { key: 'ausser_betrieb', label: 'Außer Betrieb' }] },
];
const SICHERHEITSKONTROLLEN_FIELDS = [
  { key: 'kontrolle_name', label: 'Name der Kontrolle', type: 'string/text' },
  { key: 'kontrolle_beschreibung', label: 'Beschreibung', type: 'string/textarea' },
  { key: 'kontrolle_typ', label: 'Kontrolltyp', type: 'lookup/select', options: [{ key: 'praeventiv', label: 'Präventiv' }, { key: 'detektiv', label: 'Detektiv' }, { key: 'korrektiv', label: 'Korrektiv' }, { key: 'abschreckend', label: 'Abschreckend' }, { key: 'kompensierend', label: 'Kompensierend' }] },
  { key: 'kontrolle_kategorie', label: 'Kategorie', type: 'lookup/select', options: [{ key: 'technisch', label: 'Technisch' }, { key: 'organisatorisch', label: 'Organisatorisch' }, { key: 'physisch', label: 'Physisch' }, { key: 'personell', label: 'Personell' }] },
  { key: 'implementierungsstatus', label: 'Implementierungsstatus', type: 'lookup/select', options: [{ key: 'geplant', label: 'Geplant' }, { key: 'in_umsetzung', label: 'In Umsetzung' }, { key: 'implementiert', label: 'Implementiert' }, { key: 'nicht_anwendbar', label: 'Nicht anwendbar' }] },
  { key: 'wirksamkeit', label: 'Wirksamkeit', type: 'lookup/radio', options: [{ key: 'nicht_bewertet', label: 'Nicht bewertet' }, { key: 'gering', label: 'Gering' }, { key: 'mittel', label: 'Mittel' }, { key: 'hoch', label: 'Hoch' }] },
  { key: 'kontrolle_verantwortlicher_vorname', label: 'Vorname des Verantwortlichen', type: 'string/text' },
  { key: 'kontrolle_verantwortlicher_nachname', label: 'Nachname des Verantwortlichen', type: 'string/text' },
  { key: 'naechste_ueberpruefung', label: 'Nächstes Überprüfungsdatum', type: 'date/date' },
  { key: 'kontrolle_notizen', label: 'Notizen', type: 'string/textarea' },
];
const COMPLIANCEANFORDERUNGEN_FIELDS = [
  { key: 'anforderung_name', label: 'Name der Anforderung', type: 'string/text' },
  { key: 'anforderung_id', label: 'Anforderungs-ID', type: 'string/text' },
  { key: 'rahmenwerk', label: 'Rahmenwerk / Standard', type: 'lookup/select', options: [{ key: 'iso_27001', label: 'ISO 27001' }, { key: 'dsgvo', label: 'DSGVO' }, { key: 'bsi_it_grundschutz', label: 'BSI IT-Grundschutz' }, { key: 'soc_2', label: 'SOC 2' }, { key: 'pci_dss', label: 'PCI DSS' }, { key: 'nist', label: 'NIST' }, { key: 'intern', label: 'Intern' }, { key: 'sonstiges', label: 'Sonstiges' }] },
  { key: 'anforderung_beschreibung', label: 'Beschreibung', type: 'string/textarea' },
  { key: 'prioritaet', label: 'Priorität', type: 'lookup/radio', options: [{ key: 'niedrig', label: 'Niedrig' }, { key: 'mittel', label: 'Mittel' }, { key: 'hoch', label: 'Hoch' }, { key: 'kritisch', label: 'Kritisch' }] },
  { key: 'faelligkeitsdatum', label: 'Fälligkeitsdatum', type: 'date/date' },
  { key: 'compliance_status', label: 'Compliance-Status', type: 'lookup/select', options: [{ key: 'konform', label: 'Konform' }, { key: 'teilweise_konform', label: 'Teilweise konform' }, { key: 'nicht_konform', label: 'Nicht konform' }, { key: 'in_bearbeitung', label: 'In Bearbeitung' }, { key: 'nicht_anwendbar', label: 'Nicht anwendbar' }] },
  { key: 'compliance_verantwortlicher_vorname', label: 'Vorname des Verantwortlichen', type: 'string/text' },
  { key: 'compliance_verantwortlicher_nachname', label: 'Nachname des Verantwortlichen', type: 'string/text' },
  { key: 'verknuepfte_kontrollen', label: 'Verknüpfte Sicherheitskontrollen', type: 'applookup/select', targetEntity: 'sicherheitskontrollen', targetAppId: 'SICHERHEITSKONTROLLEN', displayField: 'kontrolle_name' },
];
const RISIKOBEWERTUNG_FIELDS = [
  { key: 'risiko_name', label: 'Risikoname', type: 'string/text' },
  { key: 'risiko_beschreibung', label: 'Beschreibung', type: 'string/textarea' },
  { key: 'risiko_kategorie', label: 'Risikokategorie', type: 'lookup/select', options: [{ key: 'informationssicherheit', label: 'Informationssicherheit' }, { key: 'betrieblich', label: 'Betrieblich' }, { key: 'rechtlich', label: 'Rechtlich / Compliance' }, { key: 'finanziell', label: 'Finanziell' }, { key: 'reputationell', label: 'Reputationell' }, { key: 'technisch', label: 'Technisch' }, { key: 'sonstiges', label: 'Sonstiges' }] },
  { key: 'betroffene_assets', label: 'Betroffenes Asset', type: 'applookup/select', targetEntity: 'assets', targetAppId: 'ASSETS', displayField: 'asset_name' },
  { key: 'zugehoerige_kontrollen', label: 'Mitigierende Kontrolle', type: 'applookup/select', targetEntity: 'sicherheitskontrollen', targetAppId: 'SICHERHEITSKONTROLLEN', displayField: 'kontrolle_name' },
  { key: 'eintrittswahrscheinlichkeit', label: 'Eintrittswahrscheinlichkeit', type: 'lookup/radio', options: [{ key: 'sehr_gering', label: '1 – Sehr gering' }, { key: 'gering', label: '2 – Gering' }, { key: 'mittel', label: '3 – Mittel' }, { key: 'hoch', label: '4 – Hoch' }, { key: 'sehr_hoch', label: '5 – Sehr hoch' }] },
  { key: 'schadensausmass', label: 'Schadensausmaß', type: 'lookup/radio', options: [{ key: 'sehr_gering', label: '1 – Sehr gering' }, { key: 'gering', label: '2 – Gering' }, { key: 'mittel', label: '3 – Mittel' }, { key: 'hoch', label: '4 – Hoch' }, { key: 'sehr_hoch', label: '5 – Sehr hoch' }] },
  { key: 'risiko_behandlung', label: 'Risikobehandlung', type: 'lookup/select', options: [{ key: 'akzeptieren', label: 'Akzeptieren' }, { key: 'mitigieren', label: 'Mitigieren' }, { key: 'vermeiden', label: 'Vermeiden' }, { key: 'transferieren', label: 'Transferieren' }] },
  { key: 'risiko_status', label: 'Risikostatus', type: 'lookup/select', options: [{ key: 'offen', label: 'Offen' }, { key: 'in_behandlung', label: 'In Behandlung' }, { key: 'akzeptiert', label: 'Akzeptiert' }, { key: 'geschlossen', label: 'Geschlossen' }] },
  { key: 'risiko_verantwortlicher_vorname', label: 'Vorname des Verantwortlichen', type: 'string/text' },
  { key: 'risiko_verantwortlicher_nachname', label: 'Nachname des Verantwortlichen', type: 'string/text' },
  { key: 'bewertungsdatum', label: 'Bewertungsdatum', type: 'date/date' },
  { key: 'naechste_bewertung', label: 'Nächste Bewertung', type: 'date/date' },
  { key: 'risiko_notizen', label: 'Notizen', type: 'string/textarea' },
];
const INTERNEAUDITS_FIELDS = [
  { key: 'audit_titel', label: 'Audit-Titel', type: 'string/text' },
  { key: 'audit_typ', label: 'Audit-Typ', type: 'lookup/select', options: [{ key: 'extern', label: 'Externes Audit' }, { key: 'zertifizierung', label: 'Zertifizierungsaudit' }, { key: 'ueberwachung', label: 'Überwachungsaudit' }, { key: 'sonstiges', label: 'Sonstiges' }, { key: 'intern', label: 'Internes Audit' }] },
  { key: 'audit_beschreibung', label: 'Beschreibung', type: 'string/textarea' },
  { key: 'auditor_vorname', label: 'Vorname des Auditors', type: 'string/text' },
  { key: 'auditor_nachname', label: 'Nachname des Auditors', type: 'string/text' },
  { key: 'audit_startdatum', label: 'Startdatum', type: 'date/date' },
  { key: 'audit_enddatum', label: 'Enddatum', type: 'date/date' },
  { key: 'geprueft_kontrolle', label: 'Geprüfte Sicherheitskontrolle', type: 'applookup/select', targetEntity: 'sicherheitskontrollen', targetAppId: 'SICHERHEITSKONTROLLEN', displayField: 'kontrolle_name' },
  { key: 'geprueft_compliance', label: 'Geprüfte Compliance-Anforderung', type: 'applookup/select', targetEntity: 'compliance_anforderungen', targetAppId: 'COMPLIANCE_ANFORDERUNGEN', displayField: 'anforderung_name' },
  { key: 'audit_ergebnis', label: 'Gesamtergebnis', type: 'lookup/select', options: [{ key: 'konform', label: 'Konform' }, { key: 'teilweise_konform', label: 'Teilweise konform' }, { key: 'nicht_konform', label: 'Nicht konform' }, { key: 'ausstehend', label: 'Ausstehend' }] },
  { key: 'audit_empfehlungen', label: 'Empfehlungen', type: 'string/textarea' },
  { key: 'audit_status', label: 'Audit-Status', type: 'lookup/select', options: [{ key: 'geplant', label: 'Geplant' }, { key: 'in_durchfuehrung', label: 'In Durchführung' }, { key: 'abgeschlossen', label: 'Abgeschlossen' }, { key: 'abgebrochen', label: 'Abgebrochen' }] },
  { key: 'audit_bericht', label: 'Audit-Bericht (Datei)', type: 'file' },
];

const ENTITY_TABS = [
  { key: 'assets', label: 'Assets', pascal: 'Assets' },
  { key: 'sicherheitskontrollen', label: 'Sicherheitskontrollen', pascal: 'Sicherheitskontrollen' },
  { key: 'compliance_anforderungen', label: 'Compliance-Anforderungen', pascal: 'ComplianceAnforderungen' },
  { key: 'risikobewertung', label: 'Risikobewertung', pascal: 'Risikobewertung' },
  { key: 'interne_audits', label: 'Interne Audits', pascal: 'InterneAudits' },
] as const;

type EntityKey = typeof ENTITY_TABS[number]['key'];

export default function AdminPage() {
  const data = useDashboardData();
  const { loading, error, fetchAll } = data;

  const [activeTab, setActiveTab] = useState<EntityKey>('assets');
  const [selectedIds, setSelectedIds] = useState<Record<EntityKey, Set<string>>>(() => ({
    'assets': new Set(),
    'sicherheitskontrollen': new Set(),
    'compliance_anforderungen': new Set(),
    'risikobewertung': new Set(),
    'interne_audits': new Set(),
  }));
  const [filters, setFilters] = useState<Record<EntityKey, Record<string, string>>>(() => ({
    'assets': {},
    'sicherheitskontrollen': {},
    'compliance_anforderungen': {},
    'risikobewertung': {},
    'interne_audits': {},
  }));
  const [showFilters, setShowFilters] = useState(false);
  const [dialogState, setDialogState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [createEntity, setCreateEntity] = useState<EntityKey | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<{ entity: EntityKey; ids: string[] } | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState<EntityKey | null>(null);
  const [viewState, setViewState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');

  const getRecords = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'assets': return (data as any).assets as Assets[] ?? [];
      case 'sicherheitskontrollen': return (data as any).sicherheitskontrollen as Sicherheitskontrollen[] ?? [];
      case 'compliance_anforderungen': return (data as any).complianceAnforderungen as ComplianceAnforderungen[] ?? [];
      case 'risikobewertung': return (data as any).risikobewertung as Risikobewertung[] ?? [];
      case 'interne_audits': return (data as any).interneAudits as InterneAudits[] ?? [];
      default: return [];
    }
  }, [data]);

  const getLookupLists = useCallback((entity: EntityKey) => {
    const lists: Record<string, any[]> = {};
    switch (entity) {
      case 'compliance_anforderungen':
        lists.sicherheitskontrollenList = (data as any).sicherheitskontrollen ?? [];
        break;
      case 'risikobewertung':
        lists.assetsList = (data as any).assets ?? [];
        lists.sicherheitskontrollenList = (data as any).sicherheitskontrollen ?? [];
        break;
      case 'interne_audits':
        lists.sicherheitskontrollenList = (data as any).sicherheitskontrollen ?? [];
        lists.compliance_anforderungenList = (data as any).complianceAnforderungen ?? [];
        break;
    }
    return lists;
  }, [data]);

  const getApplookupDisplay = useCallback((entity: EntityKey, fieldKey: string, url?: unknown) => {
    if (!url) return '—';
    const id = extractRecordId(url);
    if (!id) return '—';
    const lists = getLookupLists(entity);
    void fieldKey; // ensure used for noUnusedParameters
    if (entity === 'compliance_anforderungen' && fieldKey === 'verknuepfte_kontrollen') {
      const match = (lists.sicherheitskontrollenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.kontrolle_name ?? '—';
    }
    if (entity === 'risikobewertung' && fieldKey === 'betroffene_assets') {
      const match = (lists.assetsList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.asset_name ?? '—';
    }
    if (entity === 'risikobewertung' && fieldKey === 'zugehoerige_kontrollen') {
      const match = (lists.sicherheitskontrollenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.kontrolle_name ?? '—';
    }
    if (entity === 'interne_audits' && fieldKey === 'geprueft_kontrolle') {
      const match = (lists.sicherheitskontrollenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.kontrolle_name ?? '—';
    }
    if (entity === 'interne_audits' && fieldKey === 'geprueft_compliance') {
      const match = (lists.compliance_anforderungenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.anforderung_name ?? '—';
    }
    return String(url);
  }, [getLookupLists]);

  const getFieldMeta = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'assets': return ASSETS_FIELDS;
      case 'sicherheitskontrollen': return SICHERHEITSKONTROLLEN_FIELDS;
      case 'compliance_anforderungen': return COMPLIANCEANFORDERUNGEN_FIELDS;
      case 'risikobewertung': return RISIKOBEWERTUNG_FIELDS;
      case 'interne_audits': return INTERNEAUDITS_FIELDS;
      default: return [];
    }
  }, []);

  const getFilteredRecords = useCallback((entity: EntityKey) => {
    const records = getRecords(entity);
    const s = search.toLowerCase();
    const searched = !s ? records : records.filter((r: any) => {
      return Object.values(r.fields).some((v: any) => {
        if (v == null) return false;
        if (Array.isArray(v)) return v.some((item: any) => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
        if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
        return String(v).toLowerCase().includes(s);
      });
    });
    const entityFilters = filters[entity] ?? {};
    const fieldMeta = getFieldMeta(entity);
    return searched.filter((r: any) => {
      return fieldMeta.every((fm: any) => {
        const fv = entityFilters[fm.key];
        if (!fv || fv === '') return true;
        const val = r.fields?.[fm.key];
        if (fm.type === 'bool') {
          if (fv === 'true') return val === true;
          if (fv === 'false') return val !== true;
          return true;
        }
        if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
          const label = val && typeof val === 'object' && 'label' in val ? val.label : '';
          return String(label).toLowerCase().includes(fv.toLowerCase());
        }
        if (fm.type.includes('multiplelookup')) {
          if (!Array.isArray(val)) return false;
          return val.some((item: any) => String(item?.label ?? '').toLowerCase().includes(fv.toLowerCase()));
        }
        if (fm.type.includes('applookup')) {
          const display = getApplookupDisplay(entity, fm.key, val);
          return String(display).toLowerCase().includes(fv.toLowerCase());
        }
        return String(val ?? '').toLowerCase().includes(fv.toLowerCase());
      });
    });
  }, [getRecords, filters, getFieldMeta, getApplookupDisplay, search]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(''); setSortDir('asc'); }
    } else { setSortKey(key); setSortDir('asc'); }
  }

  function sortRecords<T extends { fields: Record<string, any> }>(recs: T[]): T[] {
    if (!sortKey) return recs;
    return [...recs].sort((a, b) => {
      let va: any = a.fields[sortKey], vb: any = b.fields[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'object' && 'label' in va) va = va.label;
      if (typeof vb === 'object' && 'label' in vb) vb = vb.label;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }

  const toggleSelect = useCallback((entity: EntityKey, id: string) => {
    setSelectedIds(prev => {
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (next[entity].has(id)) next[entity].delete(id);
      else next[entity].add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((entity: EntityKey) => {
    const filtered = getFilteredRecords(entity);
    setSelectedIds(prev => {
      const allSelected = filtered.every((r: any) => prev[entity].has(r.record_id));
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (allSelected) {
        filtered.forEach((r: any) => next[entity].delete(r.record_id));
      } else {
        filtered.forEach((r: any) => next[entity].add(r.record_id));
      }
      return next;
    });
  }, [getFilteredRecords]);

  const clearSelection = useCallback((entity: EntityKey) => {
    setSelectedIds(prev => ({ ...prev, [entity]: new Set() }));
  }, []);

  const getServiceMethods = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'assets': return {
        create: (fields: any) => LivingAppsService.createAsset(fields),
        update: (id: string, fields: any) => LivingAppsService.updateAsset(id, fields),
        remove: (id: string) => LivingAppsService.deleteAsset(id),
      };
      case 'sicherheitskontrollen': return {
        create: (fields: any) => LivingAppsService.createSicherheitskontrollenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateSicherheitskontrollenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteSicherheitskontrollenEntry(id),
      };
      case 'compliance_anforderungen': return {
        create: (fields: any) => LivingAppsService.createComplianceAnforderungenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateComplianceAnforderungenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteComplianceAnforderungenEntry(id),
      };
      case 'risikobewertung': return {
        create: (fields: any) => LivingAppsService.createRisikobewertungEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateRisikobewertungEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteRisikobewertungEntry(id),
      };
      case 'interne_audits': return {
        create: (fields: any) => LivingAppsService.createInterneAudit(fields),
        update: (id: string, fields: any) => LivingAppsService.updateInterneAudit(id, fields),
        remove: (id: string) => LivingAppsService.deleteInterneAudit(id),
      };
      default: return null;
    }
  }, []);

  async function handleCreate(entity: EntityKey, fields: any) {
    const svc = getServiceMethods(entity);
    if (!svc) return;
    await svc.create(fields);
    fetchAll();
    setCreateEntity(null);
  }

  async function handleUpdate(fields: any) {
    if (!dialogState) return;
    const svc = getServiceMethods(dialogState.entity);
    if (!svc) return;
    await svc.update(dialogState.record.record_id, fields);
    fetchAll();
    setDialogState(null);
  }

  async function handleBulkDelete() {
    if (!deleteTargets) return;
    const svc = getServiceMethods(deleteTargets.entity);
    if (!svc) return;
    setBulkLoading(true);
    try {
      for (const id of deleteTargets.ids) {
        await svc.remove(id);
      }
      clearSelection(deleteTargets.entity);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setDeleteTargets(null);
    }
  }

  async function handleBulkClone() {
    const svc = getServiceMethods(activeTab);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const records = getRecords(activeTab);
      const ids = Array.from(selectedIds[activeTab]);
      for (const id of ids) {
        const rec = records.find((r: any) => r.record_id === id);
        if (!rec) continue;
        const clean = cleanFieldsForApi(rec.fields, activeTab);
        await svc.create(clean as any);
      }
      clearSelection(activeTab);
      fetchAll();
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkEdit(fieldKey: string, value: any) {
    if (!bulkEditOpen) return;
    const svc = getServiceMethods(bulkEditOpen);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds[bulkEditOpen]);
      for (const id of ids) {
        await svc.update(id, { [fieldKey]: value });
      }
      clearSelection(bulkEditOpen);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setBulkEditOpen(null);
    }
  }

  function updateFilter(entity: EntityKey, fieldKey: string, value: string) {
    setFilters(prev => ({
      ...prev,
      [entity]: { ...prev[entity], [fieldKey]: value },
    }));
  }

  function clearEntityFilters(entity: EntityKey) {
    setFilters(prev => ({ ...prev, [entity]: {} }));
  }

  const activeFilterCount = useMemo(() => {
    const f = filters[activeTab] ?? {};
    return Object.values(f).filter(v => v && v !== '').length;
  }, [filters, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-destructive">{error.message}</p>
        <Button onClick={fetchAll}>Erneut versuchen</Button>
      </div>
    );
  }

  const filtered = getFilteredRecords(activeTab);
  const sel = selectedIds[activeTab];
  const allFiltered = filtered.every((r: any) => sel.has(r.record_id)) && filtered.length > 0;
  const fieldMeta = getFieldMeta(activeTab);

  return (
    <PageShell
      title="Verwaltung"
      subtitle="Alle Daten verwalten"
      action={
        <Button onClick={() => setCreateEntity(activeTab)} className="shrink-0">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="flex gap-2 flex-wrap">
        {ENTITY_TABS.map(tab => {
          const count = getRecords(tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(''); setSortKey(''); setSortDir('asc'); fetchAll(); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
              <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(f => !f)} className="gap-2">
            <IconFilter className="h-4 w-4" />
            Filtern
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => clearEntityFilters(activeTab)}>
              Filter zurücksetzen
            </Button>
          )}
        </div>
        {sel.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap bg-muted/60 rounded-lg px-3 py-1.5">
            <span className="text-sm font-medium">{sel.size} ausgewählt</span>
            <Button variant="outline" size="sm" onClick={() => setBulkEditOpen(activeTab)}>
              <IconPencil className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Feld bearbeiten</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkClone()}>
              <IconCopy className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Kopieren</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteTargets({ entity: activeTab, ids: Array.from(sel) })}>
              <IconTrash className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Ausgewählte löschen</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => clearSelection(activeTab)}>
              <IconX className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Auswahl aufheben</span>
            </Button>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 rounded-lg border bg-muted/30">
          {fieldMeta.map((fm: any) => (
            <div key={fm.key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{fm.label}</label>
              {fm.type === 'bool' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="true">Ja</SelectItem>
                    <SelectItem value="false">Nein</SelectItem>
                  </SelectContent>
                </Select>
              ) : fm.type === 'lookup/select' || fm.type === 'lookup/radio' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {fm.options?.map((o: any) => (
                      <SelectItem key={o.key} value={o.label}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-8 text-xs"
                  placeholder="Filtern..."
                  value={filters[activeTab]?.[fm.key] ?? ''}
                  onChange={e => updateFilter(activeTab, fm.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[27px] bg-card shadow-lg overflow-x-auto">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="w-10 px-6">
                <Checkbox
                  checked={allFiltered}
                  onCheckedChange={() => toggleSelectAll(activeTab)}
                />
              </TableHead>
              {fieldMeta.map((fm: any) => (
                <TableHead key={fm.key} className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort(fm.key)}>
                  <span className="inline-flex items-center gap-1">
                    {fm.label}
                    {sortKey === fm.key ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                  </span>
                </TableHead>
              ))}
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map((record: any) => (
              <TableRow key={record.record_id} className={`transition-colors cursor-pointer ${sel.has(record.record_id) ? "bg-primary/5" : "hover:bg-muted/50"}`} onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewState({ entity: activeTab, record }); }}>
                <TableCell>
                  <Checkbox
                    checked={sel.has(record.record_id)}
                    onCheckedChange={() => toggleSelect(activeTab, record.record_id)}
                  />
                </TableCell>
                {fieldMeta.map((fm: any) => {
                  const val = record.fields?.[fm.key];
                  if (fm.type === 'bool') {
                    return (
                      <TableCell key={fm.key}>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          val ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {val ? 'Ja' : 'Nein'}
                        </span>
                      </TableCell>
                    );
                  }
                  if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{val?.label ?? '—'}</span></TableCell>;
                  }
                  if (fm.type.includes('multiplelookup')) {
                    return <TableCell key={fm.key}>{Array.isArray(val) ? val.map((v: any) => v?.label ?? v).join(', ') : '—'}</TableCell>;
                  }
                  if (fm.type.includes('applookup')) {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getApplookupDisplay(activeTab, fm.key, val)}</span></TableCell>;
                  }
                  if (fm.type.includes('date')) {
                    return <TableCell key={fm.key} className="text-muted-foreground">{fmtDate(val)}</TableCell>;
                  }
                  if (fm.type.startsWith('file')) {
                    return (
                      <TableCell key={fm.key}>
                        {val ? (
                          <div className="relative h-8 w-8 rounded bg-muted overflow-hidden">
                            <img src={val} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        ) : '—'}
                      </TableCell>
                    );
                  }
                  if (fm.type === 'string/textarea') {
                    return <TableCell key={fm.key} className="max-w-xs"><span className="truncate block">{val ?? '—'}</span></TableCell>;
                  }
                  if (fm.type === 'geo') {
                    return (
                      <TableCell key={fm.key} className="max-w-[200px]">
                        <span className="truncate block" title={val ? `${val.lat}, ${val.long}` : undefined}>
                          {val?.info ?? (val ? `${val.lat?.toFixed(4)}, ${val.long?.toFixed(4)}` : '—')}
                        </span>
                      </TableCell>
                    );
                  }
                  return <TableCell key={fm.key}>{val ?? '—'}</TableCell>;
                })}
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setDialogState({ entity: activeTab, record })}>
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTargets({ entity: activeTab, ids: [record.record_id] })}>
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={fieldMeta.length + 2} className="text-center py-16 text-muted-foreground">
                  Keine Ergebnisse gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(createEntity === 'assets' || dialogState?.entity === 'assets') && (
        <AssetsDialog
          open={createEntity === 'assets' || dialogState?.entity === 'assets'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'assets' ? handleUpdate : (fields: any) => handleCreate('assets', fields)}
          defaultValues={dialogState?.entity === 'assets' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Assets']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Assets']}
        />
      )}
      {(createEntity === 'sicherheitskontrollen' || dialogState?.entity === 'sicherheitskontrollen') && (
        <SicherheitskontrollenDialog
          open={createEntity === 'sicherheitskontrollen' || dialogState?.entity === 'sicherheitskontrollen'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'sicherheitskontrollen' ? handleUpdate : (fields: any) => handleCreate('sicherheitskontrollen', fields)}
          defaultValues={dialogState?.entity === 'sicherheitskontrollen' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Sicherheitskontrollen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Sicherheitskontrollen']}
        />
      )}
      {(createEntity === 'compliance_anforderungen' || dialogState?.entity === 'compliance_anforderungen') && (
        <ComplianceAnforderungenDialog
          open={createEntity === 'compliance_anforderungen' || dialogState?.entity === 'compliance_anforderungen'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'compliance_anforderungen' ? handleUpdate : (fields: any) => handleCreate('compliance_anforderungen', fields)}
          defaultValues={dialogState?.entity === 'compliance_anforderungen' ? dialogState.record?.fields : undefined}
          sicherheitskontrollenList={(data as any).sicherheitskontrollen ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['ComplianceAnforderungen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['ComplianceAnforderungen']}
        />
      )}
      {(createEntity === 'risikobewertung' || dialogState?.entity === 'risikobewertung') && (
        <RisikobewertungDialog
          open={createEntity === 'risikobewertung' || dialogState?.entity === 'risikobewertung'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'risikobewertung' ? handleUpdate : (fields: any) => handleCreate('risikobewertung', fields)}
          defaultValues={dialogState?.entity === 'risikobewertung' ? dialogState.record?.fields : undefined}
          assetsList={(data as any).assets ?? []}
          sicherheitskontrollenList={(data as any).sicherheitskontrollen ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Risikobewertung']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Risikobewertung']}
        />
      )}
      {(createEntity === 'interne_audits' || dialogState?.entity === 'interne_audits') && (
        <InterneAuditsDialog
          open={createEntity === 'interne_audits' || dialogState?.entity === 'interne_audits'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'interne_audits' ? handleUpdate : (fields: any) => handleCreate('interne_audits', fields)}
          defaultValues={dialogState?.entity === 'interne_audits' ? dialogState.record?.fields : undefined}
          sicherheitskontrollenList={(data as any).sicherheitskontrollen ?? []}
          compliance_anforderungenList={(data as any).complianceAnforderungen ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['InterneAudits']}
          enablePhotoLocation={AI_PHOTO_LOCATION['InterneAudits']}
        />
      )}
      {viewState?.entity === 'assets' && (
        <AssetsViewDialog
          open={viewState?.entity === 'assets'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'assets', record: r }); }}
        />
      )}
      {viewState?.entity === 'sicherheitskontrollen' && (
        <SicherheitskontrollenViewDialog
          open={viewState?.entity === 'sicherheitskontrollen'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'sicherheitskontrollen', record: r }); }}
        />
      )}
      {viewState?.entity === 'compliance_anforderungen' && (
        <ComplianceAnforderungenViewDialog
          open={viewState?.entity === 'compliance_anforderungen'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'compliance_anforderungen', record: r }); }}
          sicherheitskontrollenList={(data as any).sicherheitskontrollen ?? []}
        />
      )}
      {viewState?.entity === 'risikobewertung' && (
        <RisikobewertungViewDialog
          open={viewState?.entity === 'risikobewertung'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'risikobewertung', record: r }); }}
          assetsList={(data as any).assets ?? []}
          sicherheitskontrollenList={(data as any).sicherheitskontrollen ?? []}
        />
      )}
      {viewState?.entity === 'interne_audits' && (
        <InterneAuditsViewDialog
          open={viewState?.entity === 'interne_audits'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'interne_audits', record: r }); }}
          sicherheitskontrollenList={(data as any).sicherheitskontrollen ?? []}
          compliance_anforderungenList={(data as any).complianceAnforderungen ?? []}
        />
      )}

      <BulkEditDialog
        open={!!bulkEditOpen}
        onClose={() => setBulkEditOpen(null)}
        onApply={handleBulkEdit}
        fields={bulkEditOpen ? getFieldMeta(bulkEditOpen) : []}
        selectedCount={bulkEditOpen ? selectedIds[bulkEditOpen].size : 0}
        loading={bulkLoading}
        lookupLists={bulkEditOpen ? getLookupLists(bulkEditOpen) : {}}
      />

      <ConfirmDialog
        open={!!deleteTargets}
        onClose={() => setDeleteTargets(null)}
        onConfirm={handleBulkDelete}
        title="Ausgewählte löschen"
        description={`Sollen ${deleteTargets?.ids.length ?? 0} Einträge wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
      />
    </PageShell>
  );
}