import type { Risikobewertung, Assets, Sicherheitskontrollen } from '@/types/app';
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

interface RisikobewertungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Risikobewertung | null;
  onEdit: (record: Risikobewertung) => void;
  assetsList: Assets[];
  sicherheitskontrollenList: Sicherheitskontrollen[];
}

export function RisikobewertungViewDialog({ open, onClose, record, onEdit, assetsList, sicherheitskontrollenList }: RisikobewertungViewDialogProps) {
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

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Risikobewertung anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Risikoname</Label>
            <p className="text-sm">{record.fields.risiko_name ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschreibung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.risiko_beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Risikokategorie</Label>
            <Badge variant="secondary">{record.fields.risiko_kategorie?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Betroffenes Asset</Label>
            <p className="text-sm">{getAssetsDisplayName(record.fields.betroffene_assets)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mitigierende Kontrolle</Label>
            <p className="text-sm">{getSicherheitskontrollenDisplayName(record.fields.zugehoerige_kontrollen)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Eintrittswahrscheinlichkeit</Label>
            <Badge variant="secondary">{record.fields.eintrittswahrscheinlichkeit?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Schadensausmaß</Label>
            <Badge variant="secondary">{record.fields.schadensausmass?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Risikobehandlung</Label>
            <Badge variant="secondary">{record.fields.risiko_behandlung?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Risikostatus</Label>
            <Badge variant="secondary">{record.fields.risiko_status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname des Verantwortlichen</Label>
            <p className="text-sm">{record.fields.risiko_verantwortlicher_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname des Verantwortlichen</Label>
            <p className="text-sm">{record.fields.risiko_verantwortlicher_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bewertungsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.bewertungsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nächste Bewertung</Label>
            <p className="text-sm">{formatDate(record.fields.naechste_bewertung)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.risiko_notizen ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}