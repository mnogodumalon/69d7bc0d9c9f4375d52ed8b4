import type { ComplianceAnforderungen, Sicherheitskontrollen } from '@/types/app';
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

interface ComplianceAnforderungenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: ComplianceAnforderungen | null;
  onEdit: (record: ComplianceAnforderungen) => void;
  sicherheitskontrollenList: Sicherheitskontrollen[];
}

export function ComplianceAnforderungenViewDialog({ open, onClose, record, onEdit, sicherheitskontrollenList }: ComplianceAnforderungenViewDialogProps) {
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
          <DialogTitle>Compliance-Anforderungen anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Name der Anforderung</Label>
            <p className="text-sm">{record.fields.anforderung_name ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anforderungs-ID</Label>
            <p className="text-sm">{record.fields.anforderung_id ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rahmenwerk / Standard</Label>
            <Badge variant="secondary">{record.fields.rahmenwerk?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschreibung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.anforderung_beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Priorität</Label>
            <Badge variant="secondary">{record.fields.prioritaet?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fälligkeitsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.faelligkeitsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Compliance-Status</Label>
            <Badge variant="secondary">{record.fields.compliance_status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname des Verantwortlichen</Label>
            <p className="text-sm">{record.fields.compliance_verantwortlicher_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname des Verantwortlichen</Label>
            <p className="text-sm">{record.fields.compliance_verantwortlicher_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verknüpfte Sicherheitskontrollen</Label>
            <p className="text-sm">{getSicherheitskontrollenDisplayName(record.fields.verknuepfte_kontrollen)}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}