import { useState, useEffect, useRef, useCallback } from 'react';
import type { RisikobehandlungMassnahmenplan, Informationssicherheitsrisiken, Sicherheitskontrollen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, uploadFile, getUserProfile } from '@/services/livingAppsService';
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
import { fileToDataUri, extractFromPhoto, extractPhotoMeta, reverseGeocode, dataUriToBlob } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

interface RisikobehandlungMassnahmenplanDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: RisikobehandlungMassnahmenplan['fields']) => Promise<void>;
  defaultValues?: RisikobehandlungMassnahmenplan['fields'];
  informationssicherheitsrisikenList: Informationssicherheitsrisiken[];
  sicherheitskontrollenList: Sicherheitskontrollen[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function RisikobehandlungMassnahmenplanDialog({ open, onClose, onSubmit, defaultValues, informationssicherheitsrisikenList, sicherheitskontrollenList, enablePhotoScan = true, enablePhotoLocation = true }: RisikobehandlungMassnahmenplanDialogProps) {
  const [fields, setFields] = useState<Partial<RisikobehandlungMassnahmenplan['fields']>>({});
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
      const clean = cleanFieldsForApi({ ...fields }, 'risikobehandlung_&_maßnahmenplan');
      await onSubmit(clean as RisikobehandlungMassnahmenplan['fields']);
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
      contextParts.push(`<available-records field="massnahme_is_risiko" entity="Informationssicherheitsrisiken">\n${JSON.stringify(informationssicherheitsrisikenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="massnahme_kontrolle" entity="Sicherheitskontrollen">\n${JSON.stringify(sicherheitskontrollenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "massnahme_is_risiko": string | null, // Display name from Informationssicherheitsrisiken (see <available-records>)\n  "massnahme_name": string | null, // Maßnahmenbezeichnung\n  "massnahme_beschreibung": string | null, // Beschreibung\n  "massnahme_behandlungsoption": LookupValue | null, // Behandlungsoption (select one key: "vermeiden" | "akzeptieren" | "transferieren" | "mitigieren") mapping: vermeiden=Vermeiden, akzeptieren=Akzeptieren, transferieren=Transferieren, mitigieren=Mitigieren\n  "massnahme_prioritaet": LookupValue | null, // Priorität (select one key: "niedrig" | "mittel" | "hoch" | "kritisch") mapping: niedrig=Niedrig, mittel=Mittel, hoch=Hoch, kritisch=Kritisch\n  "massnahme_verantwortlicher_vorname": string | null, // Vorname des Verantwortlichen\n  "massnahme_verantwortlicher_nachname": string | null, // Nachname des Verantwortlichen\n  "massnahme_geplantes_datum": string | null, // YYYY-MM-DD\n  "massnahme_tatsaechliches_datum": string | null, // YYYY-MM-DD\n  "massnahme_status": LookupValue | null, // Status der Maßnahme (select one key: "geplant" | "in_umsetzung" | "umgesetzt" | "abgebrochen" | "ueberprueft") mapping: geplant=Geplant, in_umsetzung=In Umsetzung, umgesetzt=Umgesetzt, abgebrochen=Abgebrochen, ueberprueft=Überprüft\n  "massnahme_wirksamkeit": LookupValue | null, // Wirksamkeitsprüfung (select one key: "nicht_bewertet" | "wirksam" | "teilweise_wirksam" | "nicht_wirksam") mapping: nicht_bewertet=Nicht bewertet, wirksam=Wirksam, teilweise_wirksam=Teilweise wirksam, nicht_wirksam=Nicht wirksam\n  "massnahme_wirksamkeitsdatum": string | null, // YYYY-MM-DD\n  "massnahme_kontrolle": string | null, // Display name from Sicherheitskontrollen (see <available-records>)\n  "massnahme_restrisiko": LookupValue | null, // Restrisiko nach Behandlung (select one key: "niedrig" | "mittel" | "hoch" | "kritisch") mapping: niedrig=Niedrig, mittel=Mittel, hoch=Hoch, kritisch=Kritisch\n  "massnahme_notizen": string | null, // Notizen\n}`;
      const raw = await extractFromPhoto<Record<string, unknown>>(uri, schema, photoContext, DIALOG_INTENT);
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["massnahme_is_risiko", "massnahme_kontrolle"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const massnahme_is_risikoName = raw['massnahme_is_risiko'] as string | null;
        if (massnahme_is_risikoName) {
          const massnahme_is_risikoMatch = informationssicherheitsrisikenList.find(r => matchName(massnahme_is_risikoName!, [String(r.fields.is_risiko_name ?? '')]));
          if (massnahme_is_risikoMatch) merged['massnahme_is_risiko'] = createRecordUrl(APP_IDS.INFORMATIONSSICHERHEITSRISIKEN, massnahme_is_risikoMatch.record_id);
        }
        const massnahme_kontrolleName = raw['massnahme_kontrolle'] as string | null;
        if (massnahme_kontrolleName) {
          const massnahme_kontrolleMatch = sicherheitskontrollenList.find(r => matchName(massnahme_kontrolleName!, [String(r.fields.kontrolle_name ?? '')]));
          if (massnahme_kontrolleMatch) merged['massnahme_kontrolle'] = createRecordUrl(APP_IDS.SICHERHEITSKONTROLLEN, massnahme_kontrolleMatch.record_id);
        }
        return merged as Partial<RisikobehandlungMassnahmenplan['fields']>;
      });
      // Upload scanned file to file fields
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        try {
          const blob = dataUriToBlob(uri);
          const fileUrl = await uploadFile(blob, file.name);
          setFields(prev => ({ ...prev, massnahme_nachweis: fileUrl }));
        } catch (uploadErr) {
          console.error('File upload failed:', uploadErr);
        }
      }
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

  const DIALOG_INTENT = defaultValues ? 'Risikobehandlung & Maßnahmenplan bearbeiten' : 'Risikobehandlung & Maßnahmenplan hinzufügen';

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
            <Label htmlFor="massnahme_is_risiko">Bezogenes Informationssicherheitsrisiko</Label>
            <Select
              value={extractRecordId(fields.massnahme_is_risiko) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, massnahme_is_risiko: v === 'none' ? undefined : createRecordUrl(APP_IDS.INFORMATIONSSICHERHEITSRISIKEN, v) }))}
            >
              <SelectTrigger id="massnahme_is_risiko"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {informationssicherheitsrisikenList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.is_risiko_name ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="massnahme_name">Maßnahmenbezeichnung</Label>
            <Input
              id="massnahme_name"
              value={fields.massnahme_name ?? ''}
              onChange={e => setFields(f => ({ ...f, massnahme_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="massnahme_beschreibung">Beschreibung</Label>
            <Textarea
              id="massnahme_beschreibung"
              value={fields.massnahme_beschreibung ?? ''}
              onChange={e => setFields(f => ({ ...f, massnahme_beschreibung: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="massnahme_behandlungsoption">Behandlungsoption</Label>
            <Select
              value={lookupKey(fields.massnahme_behandlungsoption) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, massnahme_behandlungsoption: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="massnahme_behandlungsoption"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="vermeiden">Vermeiden</SelectItem>
                <SelectItem value="akzeptieren">Akzeptieren</SelectItem>
                <SelectItem value="transferieren">Transferieren</SelectItem>
                <SelectItem value="mitigieren">Mitigieren</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="massnahme_prioritaet">Priorität</Label>
            <Select
              value={lookupKey(fields.massnahme_prioritaet) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, massnahme_prioritaet: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="massnahme_prioritaet"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
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
            <Label htmlFor="massnahme_verantwortlicher_vorname">Vorname des Verantwortlichen</Label>
            <Input
              id="massnahme_verantwortlicher_vorname"
              value={fields.massnahme_verantwortlicher_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, massnahme_verantwortlicher_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="massnahme_verantwortlicher_nachname">Nachname des Verantwortlichen</Label>
            <Input
              id="massnahme_verantwortlicher_nachname"
              value={fields.massnahme_verantwortlicher_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, massnahme_verantwortlicher_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="massnahme_geplantes_datum">Geplantes Umsetzungsdatum</Label>
            <Input
              id="massnahme_geplantes_datum"
              type="date"
              value={fields.massnahme_geplantes_datum ?? ''}
              onChange={e => setFields(f => ({ ...f, massnahme_geplantes_datum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="massnahme_tatsaechliches_datum">Tatsächliches Umsetzungsdatum</Label>
            <Input
              id="massnahme_tatsaechliches_datum"
              type="date"
              value={fields.massnahme_tatsaechliches_datum ?? ''}
              onChange={e => setFields(f => ({ ...f, massnahme_tatsaechliches_datum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="massnahme_status">Status der Maßnahme</Label>
            <Select
              value={lookupKey(fields.massnahme_status) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, massnahme_status: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="massnahme_status"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="geplant">Geplant</SelectItem>
                <SelectItem value="in_umsetzung">In Umsetzung</SelectItem>
                <SelectItem value="umgesetzt">Umgesetzt</SelectItem>
                <SelectItem value="abgebrochen">Abgebrochen</SelectItem>
                <SelectItem value="ueberprueft">Überprüft</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="massnahme_wirksamkeit">Wirksamkeitsprüfung</Label>
            <Select
              value={lookupKey(fields.massnahme_wirksamkeit) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, massnahme_wirksamkeit: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="massnahme_wirksamkeit"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="nicht_bewertet">Nicht bewertet</SelectItem>
                <SelectItem value="wirksam">Wirksam</SelectItem>
                <SelectItem value="teilweise_wirksam">Teilweise wirksam</SelectItem>
                <SelectItem value="nicht_wirksam">Nicht wirksam</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="massnahme_wirksamkeitsdatum">Datum der Wirksamkeitsprüfung</Label>
            <Input
              id="massnahme_wirksamkeitsdatum"
              type="date"
              value={fields.massnahme_wirksamkeitsdatum ?? ''}
              onChange={e => setFields(f => ({ ...f, massnahme_wirksamkeitsdatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="massnahme_kontrolle">Verknüpfte Sicherheitskontrolle</Label>
            <Select
              value={extractRecordId(fields.massnahme_kontrolle) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, massnahme_kontrolle: v === 'none' ? undefined : createRecordUrl(APP_IDS.SICHERHEITSKONTROLLEN, v) }))}
            >
              <SelectTrigger id="massnahme_kontrolle"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
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
            <Label htmlFor="massnahme_restrisiko">Restrisiko nach Behandlung</Label>
            <Select
              value={lookupKey(fields.massnahme_restrisiko) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, massnahme_restrisiko: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="massnahme_restrisiko"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
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
            <Label htmlFor="massnahme_nachweis">Nachweis / Dokumentation</Label>
            {fields.massnahme_nachweis ? (
              <div className="flex items-center gap-3 rounded-lg border p-2">
                <div className="relative h-14 w-14 shrink-0 rounded-md bg-muted overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <IconFileText size={20} className="text-muted-foreground" />
                  </div>
                  <img
                    src={fields.massnahme_nachweis}
                    alt=""
                    className="relative h-full w-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate text-foreground">{fields.massnahme_nachweis.split("/").pop()}</p>
                  <div className="flex gap-2 mt-1">
                    <label
                      className="text-xs text-primary hover:underline cursor-pointer"
                    >
                      Ändern
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const fileUrl = await uploadFile(file, file.name);
                            setFields(f => ({ ...f, massnahme_nachweis: fileUrl }));
                          } catch (err) { console.error('Upload failed:', err); }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => setFields(f => ({ ...f, massnahme_nachweis: undefined }))}
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <label
                className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                <IconUpload size={20} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Datei hochladen</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const fileUrl = await uploadFile(file, file.name);
                      setFields(f => ({ ...f, massnahme_nachweis: fileUrl }));
                    } catch (err) { console.error('Upload failed:', err); }
                  }}
                />
              </label>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="massnahme_notizen">Notizen</Label>
            <Textarea
              id="massnahme_notizen"
              value={fields.massnahme_notizen ?? ''}
              onChange={e => setFields(f => ({ ...f, massnahme_notizen: e.target.value }))}
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