import type { InterneAudits, Sicherheitskontrollen, ComplianceAnforderungen } from '@/types/app';
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

interface InterneAuditsViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: InterneAudits | null;
  onEdit: (record: InterneAudits) => void;
  sicherheitskontrollenList: Sicherheitskontrollen[];
  compliance_anforderungenList: ComplianceAnforderungen[];
}

export function InterneAuditsViewDialog({ open, onClose, record, onEdit, sicherheitskontrollenList, compliance_anforderungenList }: InterneAuditsViewDialogProps) {
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
          <DialogTitle>Interne Audits anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Audit-Titel</Label>
            <p className="text-sm">{record.fields.audit_titel ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Audit-Typ</Label>
            <Badge variant="secondary">{record.fields.audit_typ?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschreibung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.audit_beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname des Auditors</Label>
            <p className="text-sm">{record.fields.auditor_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname des Auditors</Label>
            <p className="text-sm">{record.fields.auditor_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Startdatum</Label>
            <p className="text-sm">{formatDate(record.fields.audit_startdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Enddatum</Label>
            <p className="text-sm">{formatDate(record.fields.audit_enddatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Geprüfte Sicherheitskontrolle</Label>
            <p className="text-sm">{getSicherheitskontrollenDisplayName(record.fields.geprueft_kontrolle)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Geprüfte Compliance-Anforderung</Label>
            <p className="text-sm">{getComplianceAnforderungenDisplayName(record.fields.geprueft_compliance)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamtergebnis</Label>
            <Badge variant="secondary">{record.fields.audit_ergebnis?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Empfehlungen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.audit_empfehlungen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Audit-Status</Label>
            <Badge variant="secondary">{record.fields.audit_status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Audit-Bericht (Datei)</Label>
            {record.fields.audit_bericht ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.audit_bericht} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}