import type { Informationssicherheitsrisiken, Assets, Sicherheitskontrollen, ComplianceAnforderungen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface InformationssicherheitsrisikenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Informationssicherheitsrisiken | null;
  onEdit: (record: Informationssicherheitsrisiken) => void;
  assetsList: Assets[];
  sicherheitskontrollenList: Sicherheitskontrollen[];
  compliance_anforderungenList: ComplianceAnforderungen[];
}

export function InformationssicherheitsrisikenViewDialog({ open, onClose, record, onEdit, assetsList, sicherheitskontrollenList, compliance_anforderungenList }: InformationssicherheitsrisikenViewDialogProps) {
  function getAssetsDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return assetsList.find(r => r.record_id === id)?.fields.asset_name ?? '—';
  }

  function getSicherheitskontrollenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return sicherheitskontrollenList.find(r => r.record_id === id)?.fields.kontrolle_name ?? '—';
  }

  function getComplianceAnforderungenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return compliance_anforderungenList.find(r => r.record_id === id)?.fields.anforderung_name ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Informationssicherheitsrisiken anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Risiko-Bezeichnung</Label>
            <p className="text-sm">{record.fields.is_risiko_name ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschreibung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.is_risiko_beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bedrohungsquelle</Label>
            <Badge variant="secondary">{record.fields.is_bedrohungsquelle?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bedrohungsart</Label>
            <Badge variant="secondary">{record.fields.is_bedrohungsart?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Schwachstelle</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.is_schwachstelle ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Betroffenes Asset</Label>
            <p className="text-sm">{getAssetsDisplayName(record.fields.is_betroffenes_asset)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mitigierende Kontrolle</Label>
            <p className="text-sm">{getSicherheitskontrollenDisplayName(record.fields.is_mitigierende_kontrolle)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Relevante Compliance-Anforderung</Label>
            <p className="text-sm">{getComplianceAnforderungenDisplayName(record.fields.is_relevante_compliance)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Auswirkung auf Vertraulichkeit</Label>
            <Badge variant="secondary">{record.fields.is_vertraulichkeit?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Auswirkung auf Integrität</Label>
            <Badge variant="secondary">{record.fields.is_integritaet?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Auswirkung auf Verfügbarkeit</Label>
            <Badge variant="secondary">{record.fields.is_verfuegbarkeit?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Eintrittswahrscheinlichkeit</Label>
            <Badge variant="secondary">{record.fields.is_eintrittswahrscheinlichkeit?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamtrisiko</Label>
            <Badge variant="secondary">{record.fields.is_gesamtrisiko?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Risikobehandlung</Label>
            <Badge variant="secondary">{record.fields.is_behandlung?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Badge variant="secondary">{record.fields.is_status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname des Verantwortlichen</Label>
            <p className="text-sm">{record.fields.is_verantwortlicher_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname des Verantwortlichen</Label>
            <p className="text-sm">{record.fields.is_verantwortlicher_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bewertungsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.is_bewertungsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nächste Bewertung</Label>
            <p className="text-sm">{formatDate(record.fields.is_naechste_bewertung)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.is_notizen ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}