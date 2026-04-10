import { useState, useEffect, useRef, useCallback } from 'react';
import type { Informationssicherheitsrisiken, Assets, Sicherheitskontrollen, ComplianceAnforderungen } from '@/types/app';
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

interface InformationssicherheitsrisikenDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Informationssicherheitsrisiken['fields']) => Promise<void>;
  defaultValues?: Informationssicherheitsrisiken['fields'];
  assetsList: Assets[];
  sicherheitskontrollenList: Sicherheitskontrollen[];
  compliance_anforderungenList: ComplianceAnforderungen[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function InformationssicherheitsrisikenDialog({ open, onClose, onSubmit, defaultValues, assetsList, sicherheitskontrollenList, compliance_anforderungenList, enablePhotoScan = true, enablePhotoLocation = true }: InformationssicherheitsrisikenDialogProps) {
  const [fields, setFields] = useState<Partial<Informationssicherheitsrisiken['fields']>>({});
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
      const clean = cleanFieldsForApi({ ...fields }, 'informationssicherheitsrisiken');
      await onSubmit(clean as Informationssicherheitsrisiken['fields']);
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
      contextParts.push(`<available-records field="is_betroffenes_asset" entity="Assets">\n${JSON.stringify(assetsList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="is_mitigierende_kontrolle" entity="Sicherheitskontrollen">\n${JSON.stringify(sicherheitskontrollenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="is_relevante_compliance" entity="Compliance-Anforderungen">\n${JSON.stringify(compliance_anforderungenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "is_risiko_name": string | null, // Risiko-Bezeichnung\n  "is_risiko_beschreibung": string | null, // Beschreibung\n  "is_bedrohungsquelle": LookupValue | null, // Bedrohungsquelle (select one key: "extern" | "menschlich" | "technisch" | "organisatorisch" | "umwelt" | "sonstiges" | "intern") mapping: extern=Extern, menschlich=Menschlich, technisch=Technisch, organisatorisch=Organisatorisch, umwelt=Umwelt, sonstiges=Sonstiges, intern=Intern\n  "is_bedrohungsart": LookupValue | null, // Bedrohungsart (select one key: "malware" | "phishing" | "social_engineering" | "datendiebstahl" | "sabotage" | "ausfall" | "sonstiges") mapping: malware=Malware, phishing=Phishing, social_engineering=Social Engineering, datendiebstahl=Datendiebstahl, sabotage=Sabotage, ausfall=Ausfall, sonstiges=Sonstiges\n  "is_schwachstelle": string | null, // Schwachstelle\n  "is_betroffenes_asset": string | null, // Display name from Assets (see <available-records>)\n  "is_mitigierende_kontrolle": string | null, // Display name from Sicherheitskontrollen (see <available-records>)\n  "is_relevante_compliance": string | null, // Display name from Compliance-Anforderungen (see <available-records>)\n  "is_vertraulichkeit": LookupValue | null, // Auswirkung auf Vertraulichkeit (select one key: "keine" | "gering" | "mittel" | "hoch") mapping: keine=Keine, gering=Gering, mittel=Mittel, hoch=Hoch\n  "is_integritaet": LookupValue | null, // Auswirkung auf Integrität (select one key: "keine" | "gering" | "mittel" | "hoch") mapping: keine=Keine, gering=Gering, mittel=Mittel, hoch=Hoch\n  "is_verfuegbarkeit": LookupValue | null, // Auswirkung auf Verfügbarkeit (select one key: "keine" | "gering" | "mittel" | "hoch") mapping: keine=Keine, gering=Gering, mittel=Mittel, hoch=Hoch\n  "is_eintrittswahrscheinlichkeit": LookupValue | null, // Eintrittswahrscheinlichkeit (select one key: "sehr_gering" | "gering" | "mittel" | "hoch" | "sehr_hoch") mapping: sehr_gering=Sehr gering, gering=Gering, mittel=Mittel, hoch=Hoch, sehr_hoch=Sehr hoch\n  "is_gesamtrisiko": LookupValue | null, // Gesamtrisiko (select one key: "niedrig" | "mittel" | "hoch" | "kritisch") mapping: niedrig=Niedrig, mittel=Mittel, hoch=Hoch, kritisch=Kritisch\n  "is_behandlung": LookupValue | null, // Risikobehandlung (select one key: "akzeptieren" | "mitigieren" | "vermeiden" | "transferieren") mapping: akzeptieren=Akzeptieren, mitigieren=Mitigieren, vermeiden=Vermeiden, transferieren=Transferieren\n  "is_status": LookupValue | null, // Status (select one key: "offen" | "in_behandlung" | "akzeptiert" | "geschlossen") mapping: offen=Offen, in_behandlung=In Behandlung, akzeptiert=Akzeptiert, geschlossen=Geschlossen\n  "is_verantwortlicher_vorname": string | null, // Vorname des Verantwortlichen\n  "is_verantwortlicher_nachname": string | null, // Nachname des Verantwortlichen\n  "is_bewertungsdatum": string | null, // YYYY-MM-DD\n  "is_naechste_bewertung": string | null, // YYYY-MM-DD\n  "is_notizen": string | null, // Notizen\n}`;
      const raw = await extractFromPhoto<Record<string, unknown>>(uri, schema, photoContext, DIALOG_INTENT);
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["is_betroffenes_asset", "is_mitigierende_kontrolle", "is_relevante_compliance"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const is_betroffenes_assetName = raw['is_betroffenes_asset'] as string | null;
        if (is_betroffenes_assetName) {
          const is_betroffenes_assetMatch = assetsList.find(r => matchName(is_betroffenes_assetName!, [String(r.fields.asset_name ?? '')]));
          if (is_betroffenes_assetMatch) merged['is_betroffenes_asset'] = createRecordUrl(APP_IDS.ASSETS, is_betroffenes_assetMatch.record_id);
        }
        const is_mitigierende_kontrolleName = raw['is_mitigierende_kontrolle'] as string | null;
        if (is_mitigierende_kontrolleName) {
          const is_mitigierende_kontrolleMatch = sicherheitskontrollenList.find(r => matchName(is_mitigierende_kontrolleName!, [String(r.fields.kontrolle_name ?? '')]));
          if (is_mitigierende_kontrolleMatch) merged['is_mitigierende_kontrolle'] = createRecordUrl(APP_IDS.SICHERHEITSKONTROLLEN, is_mitigierende_kontrolleMatch.record_id);
        }
        const is_relevante_complianceName = raw['is_relevante_compliance'] as string | null;
        if (is_relevante_complianceName) {
          const is_relevante_complianceMatch = compliance_anforderungenList.find(r => matchName(is_relevante_complianceName!, [String(r.fields.anforderung_name ?? '')]));
          if (is_relevante_complianceMatch) merged['is_relevante_compliance'] = createRecordUrl(APP_IDS.COMPLIANCE_ANFORDERUNGEN, is_relevante_complianceMatch.record_id);
        }
        return merged as Partial<Informationssicherheitsrisiken['fields']>;
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

  const DIALOG_INTENT = defaultValues ? 'Informationssicherheitsrisiken bearbeiten' : 'Informationssicherheitsrisiken hinzufügen';

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
            <Label htmlFor="is_betroffenes_asset">Betroffenes Asset</Label>
            <Select
              value={extractRecordId(fields.is_betroffenes_asset) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, is_betroffenes_asset: v === 'none' ? undefined : createRecordUrl(APP_IDS.ASSETS, v) }))}
            >
              <SelectTrigger id="is_betroffenes_asset"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
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
            <Label htmlFor="is_mitigierende_kontrolle">Mitigierende Kontrolle</Label>
            <Select
              value={extractRecordId(fields.is_mitigierende_kontrolle) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, is_mitigierende_kontrolle: v === 'none' ? undefined : createRecordUrl(APP_IDS.SICHERHEITSKONTROLLEN, v) }))}
            >
              <SelectTrigger id="is_mitigierende_kontrolle"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
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
            <Label htmlFor="is_relevante_compliance">Relevante Compliance-Anforderung</Label>
            <Select
              value={extractRecordId(fields.is_relevante_compliance) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, is_relevante_compliance: v === 'none' ? undefined : createRecordUrl(APP_IDS.COMPLIANCE_ANFORDERUNGEN, v) }))}
            >
              <SelectTrigger id="is_relevante_compliance"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {compliance_anforderungenList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.anforderung_name ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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