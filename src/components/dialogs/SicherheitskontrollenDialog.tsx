import { useState, useEffect, useRef, useCallback } from 'react';
import type { Sicherheitskontrollen } from '@/types/app';
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

interface SicherheitskontrollenDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Sicherheitskontrollen['fields']) => Promise<void>;
  defaultValues?: Sicherheitskontrollen['fields'];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function SicherheitskontrollenDialog({ open, onClose, onSubmit, defaultValues, enablePhotoScan = true, enablePhotoLocation = true }: SicherheitskontrollenDialogProps) {
  const [fields, setFields] = useState<Partial<Sicherheitskontrollen['fields']>>({});
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
      const clean = cleanFieldsForApi({ ...fields }, 'sicherheitskontrollen');
      await onSubmit(clean as Sicherheitskontrollen['fields']);
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
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "kontrolle_name": string | null, // Name der Kontrolle\n  "kontrolle_beschreibung": string | null, // Beschreibung\n  "kontrolle_typ": LookupValue | null, // Kontrolltyp (select one key: "praeventiv" | "detektiv" | "korrektiv" | "abschreckend" | "kompensierend") mapping: praeventiv=Präventiv, detektiv=Detektiv, korrektiv=Korrektiv, abschreckend=Abschreckend, kompensierend=Kompensierend\n  "kontrolle_kategorie": LookupValue | null, // Kategorie (select one key: "technisch" | "organisatorisch" | "physisch" | "personell") mapping: technisch=Technisch, organisatorisch=Organisatorisch, physisch=Physisch, personell=Personell\n  "implementierungsstatus": LookupValue | null, // Implementierungsstatus (select one key: "geplant" | "in_umsetzung" | "implementiert" | "nicht_anwendbar") mapping: geplant=Geplant, in_umsetzung=In Umsetzung, implementiert=Implementiert, nicht_anwendbar=Nicht anwendbar\n  "wirksamkeit": LookupValue | null, // Wirksamkeit (select one key: "nicht_bewertet" | "gering" | "mittel" | "hoch") mapping: nicht_bewertet=Nicht bewertet, gering=Gering, mittel=Mittel, hoch=Hoch\n  "kontrolle_verantwortlicher_vorname": string | null, // Vorname des Verantwortlichen\n  "kontrolle_verantwortlicher_nachname": string | null, // Nachname des Verantwortlichen\n  "naechste_ueberpruefung": string | null, // YYYY-MM-DD\n  "kontrolle_notizen": string | null, // Notizen\n}`;
      const raw = await extractFromPhoto<Record<string, unknown>>(uri, schema, photoContext, DIALOG_INTENT);
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        for (const [k, v] of Object.entries(raw)) {
          if (v != null) merged[k] = v;
        }
        return merged as Partial<Sicherheitskontrollen['fields']>;
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

  const DIALOG_INTENT = defaultValues ? 'Sicherheitskontrollen bearbeiten' : 'Sicherheitskontrollen hinzufügen';

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