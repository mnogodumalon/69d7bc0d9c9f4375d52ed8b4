import type { RisikobehandlungMassnahmenplan, Informationssicherheitsrisiken, Sicherheitskontrollen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface RisikobehandlungMassnahmenplanViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: RisikobehandlungMassnahmenplan | null;
  onEdit: (record: RisikobehandlungMassnahmenplan) => void;
  informationssicherheitsrisikenList: Informationssicherheitsrisiken[];
  sicherheitskontrollenList: Sicherheitskontrollen[];
}

export function RisikobehandlungMassnahmenplanViewDialog({ open, onClose, record, onEdit, informationssicherheitsrisikenList, sicherheitskontrollenList }: RisikobehandlungMassnahmenplanViewDialogProps) {
  function getInformationssicherheitsrisikenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return informationssicherheitsrisikenList.find(r => r.record_id === id)?.fields.is_risiko_name ?? '—';
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
          <DialogTitle>Risikobehandlung & Maßnahmenplan anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bezogenes Informationssicherheitsrisiko</Label>
            <p className="text-sm">{getInformationssicherheitsrisikenDisplayName(record.fields.massnahme_is_risiko)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Maßnahmenbezeichnung</Label>
            <p className="text-sm">{record.fields.massnahme_name ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschreibung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.massnahme_beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Behandlungsoption</Label>
            <Badge variant="secondary">{record.fields.massnahme_behandlungsoption?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Priorität</Label>
            <Badge variant="secondary">{record.fields.massnahme_prioritaet?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname des Verantwortlichen</Label>
            <p className="text-sm">{record.fields.massnahme_verantwortlicher_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname des Verantwortlichen</Label>
            <p className="text-sm">{record.fields.massnahme_verantwortlicher_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Geplantes Umsetzungsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.massnahme_geplantes_datum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tatsächliches Umsetzungsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.massnahme_tatsaechliches_datum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status der Maßnahme</Label>
            <Badge variant="secondary">{record.fields.massnahme_status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Wirksamkeitsprüfung</Label>
            <Badge variant="secondary">{record.fields.massnahme_wirksamkeit?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datum der Wirksamkeitsprüfung</Label>
            <p className="text-sm">{formatDate(record.fields.massnahme_wirksamkeitsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verknüpfte Sicherheitskontrolle</Label>
            <p className="text-sm">{getSicherheitskontrollenDisplayName(record.fields.massnahme_kontrolle)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Restrisiko nach Behandlung</Label>
            <Badge variant="secondary">{record.fields.massnahme_restrisiko?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachweis / Dokumentation</Label>
            {record.fields.massnahme_nachweis ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.massnahme_nachweis} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.massnahme_notizen ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}