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
  const res = await fetch(`${KLAR_BASE}/public/69d7bc0d9c9f4375d52ed8b4/69d7bbe02d8ad1d345781ac3/submit`, {
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

export default function PublicFormSicherheitskontrollen() {
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
          <h1 className="text-2xl font-bold text-foreground">Sicherheitskontrollen — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="kontrolle_name">Name der Kontrolle</Label>
            <Input
              id="kontrolle_name"
              value={fields.kontrolle_name ?? ''}
              onChange={e => setFields(f => ({ ...f, kontrolle_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kontrolle_beschreibung">Beschreibung</Label>
            <Textarea
              id="kontrolle_beschreibung"
              value={fields.kontrolle_beschreibung ?? ''}
              onChange={e => setFields(f => ({ ...f, kontrolle_beschreibung: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kontrolle_typ">Kontrolltyp</Label>
            <Select
              value={lookupKey(fields.kontrolle_typ) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, kontrolle_typ: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="kontrolle_typ"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="praeventiv">Präventiv</SelectItem>
                <SelectItem value="detektiv">Detektiv</SelectItem>
                <SelectItem value="korrektiv">Korrektiv</SelectItem>
                <SelectItem value="abschreckend">Abschreckend</SelectItem>
                <SelectItem value="kompensierend">Kompensierend</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kontrolle_kategorie">Kategorie</Label>
            <Select
              value={lookupKey(fields.kontrolle_kategorie) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, kontrolle_kategorie: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="kontrolle_kategorie"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="technisch">Technisch</SelectItem>
                <SelectItem value="organisatorisch">Organisatorisch</SelectItem>
                <SelectItem value="physisch">Physisch</SelectItem>
                <SelectItem value="personell">Personell</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="implementierungsstatus">Implementierungsstatus</Label>
            <Select
              value={lookupKey(fields.implementierungsstatus) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, implementierungsstatus: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="implementierungsstatus"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="geplant">Geplant</SelectItem>
                <SelectItem value="in_umsetzung">In Umsetzung</SelectItem>
                <SelectItem value="implementiert">Implementiert</SelectItem>
                <SelectItem value="nicht_anwendbar">Nicht anwendbar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wirksamkeit">Wirksamkeit</Label>
            <Select
              value={lookupKey(fields.wirksamkeit) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, wirksamkeit: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="wirksamkeit"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="nicht_bewertet">Nicht bewertet</SelectItem>
                <SelectItem value="gering">Gering</SelectItem>
                <SelectItem value="mittel">Mittel</SelectItem>
                <SelectItem value="hoch">Hoch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kontrolle_verantwortlicher_vorname">Vorname des Verantwortlichen</Label>
            <Input
              id="kontrolle_verantwortlicher_vorname"
              value={fields.kontrolle_verantwortlicher_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, kontrolle_verantwortlicher_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kontrolle_verantwortlicher_nachname">Nachname des Verantwortlichen</Label>
            <Input
              id="kontrolle_verantwortlicher_nachname"
              value={fields.kontrolle_verantwortlicher_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, kontrolle_verantwortlicher_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="naechste_ueberpruefung">Nächstes Überprüfungsdatum</Label>
            <Input
              id="naechste_ueberpruefung"
              type="date"
              value={fields.naechste_ueberpruefung ?? ''}
              onChange={e => setFields(f => ({ ...f, naechste_ueberpruefung: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kontrolle_notizen">Notizen</Label>
            <Textarea
              id="kontrolle_notizen"
              value={fields.kontrolle_notizen ?? ''}
              onChange={e => setFields(f => ({ ...f, kontrolle_notizen: e.target.value }))}
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
