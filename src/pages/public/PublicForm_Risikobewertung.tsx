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
  const res = await fetch(`${KLAR_BASE}/public/69d7bc0d9c9f4375d52ed8b4/69d7bbe268fd2af8e68378b7/submit`, {
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

export default function PublicFormRisikobewertung() {
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
          <h1 className="text-2xl font-bold text-foreground">Risikobewertung — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="risiko_name">Risikoname</Label>
            <Input
              id="risiko_name"
              value={fields.risiko_name ?? ''}
              onChange={e => setFields(f => ({ ...f, risiko_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="risiko_beschreibung">Beschreibung</Label>
            <Textarea
              id="risiko_beschreibung"
              value={fields.risiko_beschreibung ?? ''}
              onChange={e => setFields(f => ({ ...f, risiko_beschreibung: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="risiko_kategorie">Risikokategorie</Label>
            <Select
              value={lookupKey(fields.risiko_kategorie) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, risiko_kategorie: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="risiko_kategorie"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="betrieblich">Betrieblich</SelectItem>
                <SelectItem value="rechtlich">Rechtlich / Compliance</SelectItem>
                <SelectItem value="finanziell">Finanziell</SelectItem>
                <SelectItem value="reputationell">Reputationell</SelectItem>
                <SelectItem value="technisch">Technisch</SelectItem>
                <SelectItem value="sonstiges">Sonstiges</SelectItem>
                <SelectItem value="informationssicherheit">Informationssicherheit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="eintrittswahrscheinlichkeit">Eintrittswahrscheinlichkeit</Label>
            <Select
              value={lookupKey(fields.eintrittswahrscheinlichkeit) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, eintrittswahrscheinlichkeit: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="eintrittswahrscheinlichkeit"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="sehr_gering">1 – Sehr gering</SelectItem>
                <SelectItem value="gering">2 – Gering</SelectItem>
                <SelectItem value="mittel">3 – Mittel</SelectItem>
                <SelectItem value="hoch">4 – Hoch</SelectItem>
                <SelectItem value="sehr_hoch">5 – Sehr hoch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="schadensausmass">Schadensausmaß</Label>
            <Select
              value={lookupKey(fields.schadensausmass) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, schadensausmass: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="schadensausmass"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="sehr_gering">1 – Sehr gering</SelectItem>
                <SelectItem value="gering">2 – Gering</SelectItem>
                <SelectItem value="mittel">3 – Mittel</SelectItem>
                <SelectItem value="hoch">4 – Hoch</SelectItem>
                <SelectItem value="sehr_hoch">5 – Sehr hoch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="risiko_behandlung">Risikobehandlung</Label>
            <Select
              value={lookupKey(fields.risiko_behandlung) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, risiko_behandlung: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="risiko_behandlung"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="akzeptieren">Akzeptieren</SelectItem>
                <SelectItem value="mitigieren">Mitigieren</SelectItem>
                <SelectItem value="vermeiden">Vermeiden</SelectItem>
                <SelectItem value="transferieren">Transferieren</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="risiko_status">Risikostatus</Label>
            <Select
              value={lookupKey(fields.risiko_status) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, risiko_status: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="risiko_status"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="offen">Offen</SelectItem>
                <SelectItem value="in_behandlung">In Behandlung</SelectItem>
                <SelectItem value="akzeptiert">Akzeptiert</SelectItem>
                <SelectItem value="geschlossen">Geschlossen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="risiko_verantwortlicher_vorname">Vorname des Verantwortlichen</Label>
            <Input
              id="risiko_verantwortlicher_vorname"
              value={fields.risiko_verantwortlicher_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, risiko_verantwortlicher_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="risiko_verantwortlicher_nachname">Nachname des Verantwortlichen</Label>
            <Input
              id="risiko_verantwortlicher_nachname"
              value={fields.risiko_verantwortlicher_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, risiko_verantwortlicher_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bewertungsdatum">Bewertungsdatum</Label>
            <Input
              id="bewertungsdatum"
              type="date"
              value={fields.bewertungsdatum ?? ''}
              onChange={e => setFields(f => ({ ...f, bewertungsdatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="naechste_bewertung">Nächste Bewertung</Label>
            <Input
              id="naechste_bewertung"
              type="date"
              value={fields.naechste_bewertung ?? ''}
              onChange={e => setFields(f => ({ ...f, naechste_bewertung: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="risiko_notizen">Notizen</Label>
            <Textarea
              id="risiko_notizen"
              value={fields.risiko_notizen ?? ''}
              onChange={e => setFields(f => ({ ...f, risiko_notizen: e.target.value }))}
              rows={3}
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
