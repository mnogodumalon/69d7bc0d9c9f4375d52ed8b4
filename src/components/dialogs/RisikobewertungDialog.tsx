import { useState, useEffect, useRef, useCallback } from 'react';
import type { Risikobewertung, Assets, Sicherheitskontrollen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, getUserProfile } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconCamera, IconCircleCheck, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromPhoto, extractPhotoMeta, reverseGeocode } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

interface RisikobewertungDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Risikobewertung['fields']) => Promise<void>;
  defaultValues?: Risikobewertung['fields'];
  assetsList: Assets[];
  sicherheitskontrollenList: Sicherheitskontrollen[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function RisikobewertungDialog({ open, onClose, onSubmit, defaultValues, assetsList, sicherheitskontrollenList, enablePhotoScan = true, enablePhotoLocation = true }: RisikobewertungDialogProps) {
  const [fields, setFields] = useState<Partial<Risikobewertung['fields']>>({});
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setFields(defaultValues ?? {});
      setPreview(null);
      setScanSuccess(false);
    }
  }, [open, defaultValues]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const clean = cleanFieldsForApi({ ...fields }, 'risikobewertung');
      await onSubmit(clean as Risikobewertung['fields']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoScan(file: File) {
    setScanning(true);
    setScanSuccess(false);
    try {
      const [uri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
      if (file.type.startsWith('image/')) setPreview(uri);
      const gps = enablePhotoLocation ? meta?.gps ?? null : null;
      const parts: string[] = [];
      let geoAddr = '';
      if (gps) {
        geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
        parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
        if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
      }
      if (meta?.dateTime) {
        parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      contextParts.push(`<available-records field="betroffene_assets" entity="Assets">\n${JSON.stringify(assetsList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="zugehoerige_kontrollen" entity="Sicherheitskontrollen">\n${JSON.stringify(sicherheitskontrollenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "risiko_name": string | null, // Risikoname\n  "risiko_beschreibung": string | null, // Beschreibung\n  "risiko_kategorie": LookupValue | null, // Risikokategorie (select one key: "betrieblich" | "rechtlich" | "finanziell" | "reputationell" | "technisch" | "sonstiges" | "informationssicherheit") mapping: betrieblich=Betrieblich, rechtlich=Rechtlich / Compliance, finanziell=Finanziell, reputationell=Reputationell, technisch=Technisch, sonstiges=Sonstiges, informationssicherheit=Informationssicherheit\n  "betroffene_assets": string | null, // Display name from Assets (see <available-records>)\n  "zugehoerige_kontrollen": string | null, // Display name from Sicherheitskontrollen (see <available-records>)\n  "eintrittswahrscheinlichkeit": LookupValue | null, // Eintrittswahrscheinlichkeit (select one key: "sehr_gering" | "gering" | "mittel" | "hoch" | "sehr_hoch") mapping: sehr_gering=1 – Sehr gering, gering=2 – Gering, mittel=3 – Mittel, hoch=4 – Hoch, sehr_hoch=5 – Sehr hoch\n  "schadensausmass": LookupValue | null, // Schadensausmaß (select one key: "sehr_gering" | "gering" | "mittel" | "hoch" | "sehr_hoch") mapping: sehr_gering=1 – Sehr gering, gering=2 – Gering, mittel=3 – Mittel, hoch=4 – Hoch, sehr_hoch=5 – Sehr hoch\n  "risiko_behandlung": LookupValue | null, // Risikobehandlung (select one key: "akzeptieren" | "mitigieren" | "vermeiden" | "transferieren") mapping: akzeptieren=Akzeptieren, mitigieren=Mitigieren, vermeiden=Vermeiden, transferieren=Transferieren\n  "risiko_status": LookupValue | null, // Risikostatus (select one key: "offen" | "in_behandlung" | "akzeptiert" | "geschlossen") mapping: offen=Offen, in_behandlung=In Behandlung, akzeptiert=Akzeptiert, geschlossen=Geschlossen\n  "risiko_verantwortlicher_vorname": string | null, // Vorname des Verantwortlichen\n  "risiko_verantwortlicher_nachname": string | null, // Nachname des Verantwortlichen\n  "bewertungsdatum": string | null, // YYYY-MM-DD\n  "naechste_bewertung": string | null, // YYYY-MM-DD\n  "risiko_notizen": string | null, // Notizen\n}`;
      const raw = await extractFromPhoto<Record<string, unknown>>(uri, schema, photoContext, DIALOG_INTENT);
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["betroffene_assets", "zugehoerige_kontrollen"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const betroffene_assetsName = raw['betroffene_assets'] as string | null;
        if (betroffene_assetsName) {
          const betroffene_assetsMatch = assetsList.find(r => matchName(betroffene_assetsName!, [String(r.fields.asset_name ?? '')]));
          if (betroffene_assetsMatch) merged['betroffene_assets'] = createRecordUrl(APP_IDS.ASSETS, betroffene_assetsMatch.record_id);
        }
        const zugehoerige_kontrollenName = raw['zugehoerige_kontrollen'] as string | null;
        if (zugehoerige_kontrollenName) {
          const zugehoerige_kontrollenMatch = sicherheitskontrollenList.find(r => matchName(zugehoerige_kontrollenName!, [String(r.fields.kontrolle_name ?? '')]));
          if (zugehoerige_kontrollenMatch) merged['zugehoerige_kontrollen'] = createRecordUrl(APP_IDS.SICHERHEITSKONTROLLEN, zugehoerige_kontrollenMatch.record_id);
        }
        return merged as Partial<Risikobewertung['fields']>;
      });
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error('Scan fehlgeschlagen:', err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handlePhotoScan(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handlePhotoScan(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues ? 'Risikobewertung bearbeiten' : 'Risikobewertung hinzufügen';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{DIALOG_INTENT}</DialogTitle>
        </DialogHeader>

        {enablePhotoScan && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div>
              <div className="flex items-center gap-1.5 font-medium">
                <IconSparkles className="h-4 w-4 text-primary" />
                KI-Assistent
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Versteht deine Fotos / Dokumente und füllt alles für dich aus</p>
            </div>
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  KI-Assistent darf zusätzlich Informationen zu meiner Person verwenden
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? 'Lade...' : '(mehr Infos)'}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">Folgende Infos über dich können von der KI genutzt werden:</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">Profil konnte nicht geladen werden</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">KI analysiert...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Felder werden automatisch ausgefüllt</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Felder ausgefüllt!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prüfe die Werte und passe sie ggf. an</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Foto oder Dokument hierher ziehen oder auswählen</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1.5" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1.5" />Foto wählen
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1.5" />Dokument
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="betroffene_assets">Betroffenes Asset</Label>
            <Select
              value={extractRecordId(fields.betroffene_assets) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, betroffene_assets: v === 'none' ? undefined : createRecordUrl(APP_IDS.ASSETS, v) }))}
            >
              <SelectTrigger id="betroffene_assets"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {assetsList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.asset_name ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="zugehoerige_kontrollen">Mitigierende Kontrolle</Label>
            <Select
              value={extractRecordId(fields.zugehoerige_kontrollen) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, zugehoerige_kontrollen: v === 'none' ? undefined : createRecordUrl(APP_IDS.SICHERHEITSKONTROLLEN, v) }))}
            >
              <SelectTrigger id="zugehoerige_kontrollen"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {sicherheitskontrollenList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.kontrolle_name ?? r.record_id}
                  </SelectItem>
                ))}
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}