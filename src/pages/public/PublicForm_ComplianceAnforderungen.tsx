import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { lookupKey } from '@/lib/formatters';

const KLAR_BASE = 'https://my.living-apps.de/claude';

async function submitPublicForm(fields: Record<string, unknown>) {
  const res = await fetch(`${KLAR_BASE}/public/69d7bc0d9c9f4375d52ed8b4/69d7bbe1c8470837b5f4a8ed/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormComplianceAnforderungen() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields));
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Compliance-Anforderungen — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="anforderung_name">Name der Anforderung</Label>
            <Input
              id="anforderung_name"
              value={fields.anforderung_name ?? ''}
              onChange={e => setFields(f => ({ ...f, anforderung_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anforderung_id">Anforderungs-ID</Label>
            <Input
              id="anforderung_id"
              value={fields.anforderung_id ?? ''}
              onChange={e => setFields(f => ({ ...f, anforderung_id: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rahmenwerk">Rahmenwerk / Standard</Label>
            <Select
              value={lookupKey(fields.rahmenwerk) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, rahmenwerk: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="rahmenwerk"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="iso_27001">ISO 27001</SelectItem>
                <SelectItem value="dsgvo">DSGVO</SelectItem>
                <SelectItem value="bsi_it_grundschutz">BSI IT-Grundschutz</SelectItem>
                <SelectItem value="soc_2">SOC 2</SelectItem>
                <SelectItem value="pci_dss">PCI DSS</SelectItem>
                <SelectItem value="nist">NIST</SelectItem>
                <SelectItem value="intern">Intern</SelectItem>
                <SelectItem value="sonstiges">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="anforderung_beschreibung">Beschreibung</Label>
            <Textarea
              id="anforderung_beschreibung"
              value={fields.anforderung_beschreibung ?? ''}
              onChange={e => setFields(f => ({ ...f, anforderung_beschreibung: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prioritaet">Priorität</Label>
            <Select
              value={lookupKey(fields.prioritaet) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, prioritaet: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="prioritaet"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="niedrig">Niedrig</SelectItem>
                <SelectItem value="mittel">Mittel</SelectItem>
                <SelectItem value="hoch">Hoch</SelectItem>
                <SelectItem value="kritisch">Kritisch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="faelligkeitsdatum">Fälligkeitsdatum</Label>
            <Input
              id="faelligkeitsdatum"
              type="date"
              value={fields.faelligkeitsdatum ?? ''}
              onChange={e => setFields(f => ({ ...f, faelligkeitsdatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="compliance_status">Compliance-Status</Label>
            <Select
              value={lookupKey(fields.compliance_status) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, compliance_status: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="compliance_status"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="konform">Konform</SelectItem>
                <SelectItem value="teilweise_konform">Teilweise konform</SelectItem>
                <SelectItem value="nicht_konform">Nicht konform</SelectItem>
                <SelectItem value="in_bearbeitung">In Bearbeitung</SelectItem>
                <SelectItem value="nicht_anwendbar">Nicht anwendbar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="compliance_verantwortlicher_vorname">Vorname des Verantwortlichen</Label>
            <Input
              id="compliance_verantwortlicher_vorname"
              value={fields.compliance_verantwortlicher_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, compliance_verantwortlicher_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="compliance_verantwortlicher_nachname">Nachname des Verantwortlichen</Label>
            <Input
              id="compliance_verantwortlicher_nachname"
              value={fields.compliance_verantwortlicher_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, compliance_verantwortlicher_nachname: e.target.value }))}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
