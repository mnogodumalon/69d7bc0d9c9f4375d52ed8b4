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
  const res = await fetch(`${KLAR_BASE}/public/69d7bc0d9c9f4375d52ed8b4/69d9021e0198e1d82852b897/submit`, {
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

export default function PublicFormInformationssicherheitsrisiken() {
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
          <h1 className="text-2xl font-bold text-foreground">Informationssicherheitsrisiken — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="is_risiko_name">Risiko-Bezeichnung</Label>
            <Input
              id="is_risiko_name"
              value={fields.is_risiko_name ?? ''}
              onChange={e => setFields(f => ({ ...f, is_risiko_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="is_risiko_beschreibung">Beschreibung</Label>
            <Textarea
              id="is_risiko_beschreibung"
              value={fields.is_risiko_beschreibung ?? ''}
              onChange={e => setFields(f => ({ ...f, is_risiko_beschreibung: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="is_bedrohungsquelle">Bedrohungsquelle</Label>
            <Select
              value={lookupKey(fields.is_bedrohungsquelle) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, is_bedrohungsquelle: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="is_bedrohungsquelle"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="extern">Extern</SelectItem>
                <SelectItem value="menschlich">Menschlich</SelectItem>
                <SelectItem value="technisch">Technisch</SelectItem>
                <SelectItem value="organisatorisch">Organisatorisch</SelectItem>
                <SelectItem value="umwelt">Umwelt</SelectItem>
                <SelectItem value="sonstiges">Sonstiges</SelectItem>
                <SelectItem value="intern">Intern</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="is_bedrohungsart">Bedrohungsart</Label>
            <Select
              value={lookupKey(fields.is_bedrohungsart) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, is_bedrohungsart: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="is_bedrohungsart"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="malware">Malware</SelectItem>
                <SelectItem value="phishing">Phishing</SelectItem>
                <SelectItem value="social_engineering">Social Engineering</SelectItem>
                <SelectItem value="datendiebstahl">Datendiebstahl</SelectItem>
                <SelectItem value="sabotage">Sabotage</SelectItem>
                <SelectItem value="ausfall">Ausfall</SelectItem>
                <SelectItem value="sonstiges">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="is_schwachstelle">Schwachstelle</Label>
            <Textarea
              id="is_schwachstelle"
              value={fields.is_schwachstelle ?? ''}
              onChange={e => setFields(f => ({ ...f, is_schwachstelle: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="is_vertraulichkeit">Auswirkung auf Vertraulichkeit</Label>
            <Select
              value={lookupKey(fields.is_vertraulichkeit) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, is_vertraulichkeit: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="is_vertraulichkeit"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="keine">Keine</SelectItem>
                <SelectItem value="gering">Gering</SelectItem>
                <SelectItem value="mittel">Mittel</SelectItem>
                <SelectItem value="hoch">Hoch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="is_integritaet">Auswirkung auf Integrität</Label>
            <Select
              value={lookupKey(fields.is_integritaet) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, is_integritaet: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="is_integritaet"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="keine">Keine</SelectItem>
                <SelectItem value="gering">Gering</SelectItem>
                <SelectItem value="mittel">Mittel</SelectItem>
                <SelectItem value="hoch">Hoch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="is_verfuegbarkeit">Auswirkung auf Verfügbarkeit</Label>
            <Select
              value={lookupKey(fields.is_verfuegbarkeit) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, is_verfuegbarkeit: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="is_verfuegbarkeit"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="keine">Keine</SelectItem>
                <SelectItem value="gering">Gering</SelectItem>
                <SelectItem value="mittel">Mittel</SelectItem>
                <SelectItem value="hoch">Hoch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="is_eintrittswahrscheinlichkeit">Eintrittswahrscheinlichkeit</Label>
            <Select
              value={lookupKey(fields.is_eintrittswahrscheinlichkeit) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, is_eintrittswahrscheinlichkeit: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="is_eintrittswahrscheinlichkeit"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="sehr_gering">Sehr gering</SelectItem>
                <SelectItem value="gering">Gering</SelectItem>
                <SelectItem value="mittel">Mittel</SelectItem>
                <SelectItem value="hoch">Hoch</SelectItem>
                <SelectItem value="sehr_hoch">Sehr hoch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="is_gesamtrisiko">Gesamtrisiko</Label>
            <Select
              value={lookupKey(fields.is_gesamtrisiko) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, is_gesamtrisiko: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="is_gesamtrisiko"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
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
            <Label htmlFor="is_behandlung">Risikobehandlung</Label>
            <Select
              value={lookupKey(fields.is_behandlung) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, is_behandlung: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="is_behandlung"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
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
            <Label htmlFor="is_status">Status</Label>
            <Select
              value={lookupKey(fields.is_status) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, is_status: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="is_status"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
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
            <Label htmlFor="is_verantwortlicher_vorname">Vorname des Verantwortlichen</Label>
            <Input
              id="is_verantwortlicher_vorname"
              value={fields.is_verantwortlicher_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, is_verantwortlicher_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="is_verantwortlicher_nachname">Nachname des Verantwortlichen</Label>
            <Input
              id="is_verantwortlicher_nachname"
              value={fields.is_verantwortlicher_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, is_verantwortlicher_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="is_bewertungsdatum">Bewertungsdatum</Label>
            <Input
              id="is_bewertungsdatum"
              type="date"
              value={fields.is_bewertungsdatum ?? ''}
              onChange={e => setFields(f => ({ ...f, is_bewertungsdatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="is_naechste_bewertung">Nächste Bewertung</Label>
            <Input
              id="is_naechste_bewertung"
              type="date"
              value={fields.is_naechste_bewertung ?? ''}
              onChange={e => setFields(f => ({ ...f, is_naechste_bewertung: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="is_notizen">Notizen</Label>
            <Textarea
              id="is_notizen"
              value={fields.is_notizen ?? ''}
              onChange={e => setFields(f => ({ ...f, is_notizen: e.target.value }))}
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
