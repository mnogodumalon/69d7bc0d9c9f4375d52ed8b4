// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface RisikobehandlungMassnahmenplan {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    massnahme_is_risiko?: string; // applookup -> URL zu 'Informationssicherheitsrisiken' Record
    massnahme_name?: string;
    massnahme_beschreibung?: string;
    massnahme_behandlungsoption?: LookupValue;
    massnahme_prioritaet?: LookupValue;
    massnahme_verantwortlicher_vorname?: string;
    massnahme_verantwortlicher_nachname?: string;
    massnahme_geplantes_datum?: string; // Format: YYYY-MM-DD oder ISO String
    massnahme_tatsaechliches_datum?: string; // Format: YYYY-MM-DD oder ISO String
    massnahme_status?: LookupValue;
    massnahme_wirksamkeit?: LookupValue;
    massnahme_wirksamkeitsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    massnahme_kontrolle?: string; // applookup -> URL zu 'Sicherheitskontrollen' Record
    massnahme_restrisiko?: LookupValue;
    massnahme_nachweis?: string;
    massnahme_notizen?: string;
  };
}

export interface ComplianceAnforderungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    anforderung_name?: string;
    anforderung_id?: string;
    rahmenwerk?: LookupValue;
    anforderung_beschreibung?: string;
    prioritaet?: LookupValue;
    faelligkeitsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    compliance_status?: LookupValue;
    compliance_verantwortlicher_vorname?: string;
    compliance_verantwortlicher_nachname?: string;
    verknuepfte_kontrollen?: string; // applookup -> URL zu 'Sicherheitskontrollen' Record
  };
}

export interface InterneAudits {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    audit_titel?: string;
    audit_typ?: LookupValue;
    audit_beschreibung?: string;
    auditor_vorname?: string;
    auditor_nachname?: string;
    audit_startdatum?: string; // Format: YYYY-MM-DD oder ISO String
    audit_enddatum?: string; // Format: YYYY-MM-DD oder ISO String
    geprueft_kontrolle?: string; // applookup -> URL zu 'Sicherheitskontrollen' Record
    geprueft_compliance?: string; // applookup -> URL zu 'ComplianceAnforderungen' Record
    audit_ergebnis?: LookupValue;
    audit_empfehlungen?: string;
    audit_status?: LookupValue;
    audit_bericht?: string;
  };
}

export interface Sicherheitskontrollen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kontrolle_name?: string;
    kontrolle_beschreibung?: string;
    kontrolle_typ?: LookupValue;
    kontrolle_kategorie?: LookupValue;
    implementierungsstatus?: LookupValue;
    wirksamkeit?: LookupValue;
    kontrolle_verantwortlicher_vorname?: string;
    kontrolle_verantwortlicher_nachname?: string;
    naechste_ueberpruefung?: string; // Format: YYYY-MM-DD oder ISO String
    kontrolle_notizen?: string;
  };
}

export interface Assets {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    asset_name?: string;
    asset_beschreibung?: string;
    asset_typ?: LookupValue;
    asset_kritikalitaet?: LookupValue;
    verantwortlicher_vorname?: string;
    verantwortlicher_nachname?: string;
    abteilung?: string;
    asset_status?: LookupValue;
  };
}

export interface Risikobewertung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    risiko_name?: string;
    risiko_beschreibung?: string;
    risiko_kategorie?: LookupValue;
    betroffene_assets?: string; // applookup -> URL zu 'Assets' Record
    zugehoerige_kontrollen?: string; // applookup -> URL zu 'Sicherheitskontrollen' Record
    eintrittswahrscheinlichkeit?: LookupValue;
    schadensausmass?: LookupValue;
    risiko_behandlung?: LookupValue;
    risiko_status?: LookupValue;
    risiko_verantwortlicher_vorname?: string;
    risiko_verantwortlicher_nachname?: string;
    bewertungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    naechste_bewertung?: string; // Format: YYYY-MM-DD oder ISO String
    risiko_notizen?: string;
  };
}

export interface Informationssicherheitsrisiken {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    is_risiko_name?: string;
    is_risiko_beschreibung?: string;
    is_bedrohungsquelle?: LookupValue;
    is_bedrohungsart?: LookupValue;
    is_schwachstelle?: string;
    is_betroffenes_asset?: string; // applookup -> URL zu 'Assets' Record
    is_mitigierende_kontrolle?: string; // applookup -> URL zu 'Sicherheitskontrollen' Record
    is_relevante_compliance?: string; // applookup -> URL zu 'ComplianceAnforderungen' Record
    is_vertraulichkeit?: LookupValue;
    is_integritaet?: LookupValue;
    is_verfuegbarkeit?: LookupValue;
    is_eintrittswahrscheinlichkeit?: LookupValue;
    is_gesamtrisiko?: LookupValue;
    is_behandlung?: LookupValue;
    is_status?: LookupValue;
    is_verantwortlicher_vorname?: string;
    is_verantwortlicher_nachname?: string;
    is_bewertungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    is_naechste_bewertung?: string; // Format: YYYY-MM-DD oder ISO String
    is_notizen?: string;
  };
}

export const APP_IDS = {
  RISIKOBEHANDLUNG_MASSNAHMENPLAN: '69d902218b5690a6f8bc98c1',
  COMPLIANCE_ANFORDERUNGEN: '69d7bbe1c8470837b5f4a8ed',
  INTERNE_AUDITS: '69d7bbe403fd4449cdbb7080',
  SICHERHEITSKONTROLLEN: '69d7bbe02d8ad1d345781ac3',
  ASSETS: '69d7bbda6ded0c2e0f8098ea',
  RISIKOBEWERTUNG: '69d7bbe268fd2af8e68378b7',
  INFORMATIONSSICHERHEITSRISIKEN: '69d9021e0198e1d82852b897',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'risikobehandlung_&_maßnahmenplan': {
    massnahme_behandlungsoption: [{ key: "vermeiden", label: "Vermeiden" }, { key: "akzeptieren", label: "Akzeptieren" }, { key: "transferieren", label: "Transferieren" }, { key: "mitigieren", label: "Mitigieren" }],
    massnahme_prioritaet: [{ key: "niedrig", label: "Niedrig" }, { key: "mittel", label: "Mittel" }, { key: "hoch", label: "Hoch" }, { key: "kritisch", label: "Kritisch" }],
    massnahme_status: [{ key: "geplant", label: "Geplant" }, { key: "in_umsetzung", label: "In Umsetzung" }, { key: "umgesetzt", label: "Umgesetzt" }, { key: "abgebrochen", label: "Abgebrochen" }, { key: "ueberprueft", label: "Überprüft" }],
    massnahme_wirksamkeit: [{ key: "nicht_bewertet", label: "Nicht bewertet" }, { key: "wirksam", label: "Wirksam" }, { key: "teilweise_wirksam", label: "Teilweise wirksam" }, { key: "nicht_wirksam", label: "Nicht wirksam" }],
    massnahme_restrisiko: [{ key: "niedrig", label: "Niedrig" }, { key: "mittel", label: "Mittel" }, { key: "hoch", label: "Hoch" }, { key: "kritisch", label: "Kritisch" }],
  },
  'compliance_anforderungen': {
    rahmenwerk: [{ key: "iso_27001", label: "ISO 27001" }, { key: "dsgvo", label: "DSGVO" }, { key: "bsi_it_grundschutz", label: "BSI IT-Grundschutz" }, { key: "soc_2", label: "SOC 2" }, { key: "pci_dss", label: "PCI DSS" }, { key: "nist", label: "NIST" }, { key: "intern", label: "Intern" }, { key: "sonstiges", label: "Sonstiges" }],
    prioritaet: [{ key: "niedrig", label: "Niedrig" }, { key: "mittel", label: "Mittel" }, { key: "hoch", label: "Hoch" }, { key: "kritisch", label: "Kritisch" }],
    compliance_status: [{ key: "konform", label: "Konform" }, { key: "teilweise_konform", label: "Teilweise konform" }, { key: "nicht_konform", label: "Nicht konform" }, { key: "in_bearbeitung", label: "In Bearbeitung" }, { key: "nicht_anwendbar", label: "Nicht anwendbar" }],
  },
  'interne_audits': {
    audit_typ: [{ key: "intern", label: "Internes Audit" }, { key: "extern", label: "Externes Audit" }, { key: "zertifizierung", label: "Zertifizierungsaudit" }, { key: "ueberwachung", label: "Überwachungsaudit" }, { key: "sonstiges", label: "Sonstiges" }],
    audit_ergebnis: [{ key: "konform", label: "Konform" }, { key: "teilweise_konform", label: "Teilweise konform" }, { key: "nicht_konform", label: "Nicht konform" }, { key: "ausstehend", label: "Ausstehend" }],
    audit_status: [{ key: "geplant", label: "Geplant" }, { key: "in_durchfuehrung", label: "In Durchführung" }, { key: "abgeschlossen", label: "Abgeschlossen" }, { key: "abgebrochen", label: "Abgebrochen" }],
  },
  'sicherheitskontrollen': {
    kontrolle_typ: [{ key: "praeventiv", label: "Präventiv" }, { key: "detektiv", label: "Detektiv" }, { key: "korrektiv", label: "Korrektiv" }, { key: "abschreckend", label: "Abschreckend" }, { key: "kompensierend", label: "Kompensierend" }],
    kontrolle_kategorie: [{ key: "technisch", label: "Technisch" }, { key: "organisatorisch", label: "Organisatorisch" }, { key: "physisch", label: "Physisch" }, { key: "personell", label: "Personell" }],
    implementierungsstatus: [{ key: "geplant", label: "Geplant" }, { key: "in_umsetzung", label: "In Umsetzung" }, { key: "implementiert", label: "Implementiert" }, { key: "nicht_anwendbar", label: "Nicht anwendbar" }],
    wirksamkeit: [{ key: "nicht_bewertet", label: "Nicht bewertet" }, { key: "gering", label: "Gering" }, { key: "mittel", label: "Mittel" }, { key: "hoch", label: "Hoch" }],
  },
  'assets': {
    asset_typ: [{ key: "it_system", label: "IT-System" }, { key: "daten", label: "Daten" }, { key: "software", label: "Software" }, { key: "hardware", label: "Hardware" }, { key: "prozess", label: "Prozess" }, { key: "dienstleistung", label: "Dienstleistung" }, { key: "sonstiges", label: "Sonstiges" }],
    asset_kritikalitaet: [{ key: "niedrig", label: "Niedrig" }, { key: "mittel", label: "Mittel" }, { key: "hoch", label: "Hoch" }, { key: "kritisch", label: "Kritisch" }],
    asset_status: [{ key: "aktiv", label: "Aktiv" }, { key: "inaktiv", label: "Inaktiv" }, { key: "in_planung", label: "In Planung" }, { key: "ausser_betrieb", label: "Außer Betrieb" }],
  },
  'risikobewertung': {
    risiko_kategorie: [{ key: "betrieblich", label: "Betrieblich" }, { key: "rechtlich", label: "Rechtlich / Compliance" }, { key: "finanziell", label: "Finanziell" }, { key: "reputationell", label: "Reputationell" }, { key: "technisch", label: "Technisch" }, { key: "sonstiges", label: "Sonstiges" }, { key: "informationssicherheit", label: "Informationssicherheit" }],
    eintrittswahrscheinlichkeit: [{ key: "sehr_gering", label: "1 – Sehr gering" }, { key: "gering", label: "2 – Gering" }, { key: "mittel", label: "3 – Mittel" }, { key: "hoch", label: "4 – Hoch" }, { key: "sehr_hoch", label: "5 – Sehr hoch" }],
    schadensausmass: [{ key: "sehr_gering", label: "1 – Sehr gering" }, { key: "gering", label: "2 – Gering" }, { key: "mittel", label: "3 – Mittel" }, { key: "hoch", label: "4 – Hoch" }, { key: "sehr_hoch", label: "5 – Sehr hoch" }],
    risiko_behandlung: [{ key: "akzeptieren", label: "Akzeptieren" }, { key: "mitigieren", label: "Mitigieren" }, { key: "vermeiden", label: "Vermeiden" }, { key: "transferieren", label: "Transferieren" }],
    risiko_status: [{ key: "offen", label: "Offen" }, { key: "in_behandlung", label: "In Behandlung" }, { key: "akzeptiert", label: "Akzeptiert" }, { key: "geschlossen", label: "Geschlossen" }],
  },
  'informationssicherheitsrisiken': {
    is_bedrohungsquelle: [{ key: "extern", label: "Extern" }, { key: "menschlich", label: "Menschlich" }, { key: "technisch", label: "Technisch" }, { key: "organisatorisch", label: "Organisatorisch" }, { key: "umwelt", label: "Umwelt" }, { key: "sonstiges", label: "Sonstiges" }, { key: "intern", label: "Intern" }],
    is_bedrohungsart: [{ key: "malware", label: "Malware" }, { key: "phishing", label: "Phishing" }, { key: "social_engineering", label: "Social Engineering" }, { key: "datendiebstahl", label: "Datendiebstahl" }, { key: "sabotage", label: "Sabotage" }, { key: "ausfall", label: "Ausfall" }, { key: "sonstiges", label: "Sonstiges" }],
    is_vertraulichkeit: [{ key: "keine", label: "Keine" }, { key: "gering", label: "Gering" }, { key: "mittel", label: "Mittel" }, { key: "hoch", label: "Hoch" }],
    is_integritaet: [{ key: "keine", label: "Keine" }, { key: "gering", label: "Gering" }, { key: "mittel", label: "Mittel" }, { key: "hoch", label: "Hoch" }],
    is_verfuegbarkeit: [{ key: "keine", label: "Keine" }, { key: "gering", label: "Gering" }, { key: "mittel", label: "Mittel" }, { key: "hoch", label: "Hoch" }],
    is_eintrittswahrscheinlichkeit: [{ key: "sehr_gering", label: "Sehr gering" }, { key: "gering", label: "Gering" }, { key: "mittel", label: "Mittel" }, { key: "hoch", label: "Hoch" }, { key: "sehr_hoch", label: "Sehr hoch" }],
    is_gesamtrisiko: [{ key: "niedrig", label: "Niedrig" }, { key: "mittel", label: "Mittel" }, { key: "hoch", label: "Hoch" }, { key: "kritisch", label: "Kritisch" }],
    is_behandlung: [{ key: "akzeptieren", label: "Akzeptieren" }, { key: "mitigieren", label: "Mitigieren" }, { key: "vermeiden", label: "Vermeiden" }, { key: "transferieren", label: "Transferieren" }],
    is_status: [{ key: "offen", label: "Offen" }, { key: "in_behandlung", label: "In Behandlung" }, { key: "akzeptiert", label: "Akzeptiert" }, { key: "geschlossen", label: "Geschlossen" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'risikobehandlung_&_maßnahmenplan': {
    'massnahme_is_risiko': 'applookup/select',
    'massnahme_name': 'string/text',
    'massnahme_beschreibung': 'string/textarea',
    'massnahme_behandlungsoption': 'lookup/select',
    'massnahme_prioritaet': 'lookup/select',
    'massnahme_verantwortlicher_vorname': 'string/text',
    'massnahme_verantwortlicher_nachname': 'string/text',
    'massnahme_geplantes_datum': 'date/date',
    'massnahme_tatsaechliches_datum': 'date/date',
    'massnahme_status': 'lookup/select',
    'massnahme_wirksamkeit': 'lookup/select',
    'massnahme_wirksamkeitsdatum': 'date/date',
    'massnahme_kontrolle': 'applookup/select',
    'massnahme_restrisiko': 'lookup/select',
    'massnahme_nachweis': 'file',
    'massnahme_notizen': 'string/textarea',
  },
  'compliance_anforderungen': {
    'anforderung_name': 'string/text',
    'anforderung_id': 'string/text',
    'rahmenwerk': 'lookup/select',
    'anforderung_beschreibung': 'string/textarea',
    'prioritaet': 'lookup/radio',
    'faelligkeitsdatum': 'date/date',
    'compliance_status': 'lookup/select',
    'compliance_verantwortlicher_vorname': 'string/text',
    'compliance_verantwortlicher_nachname': 'string/text',
    'verknuepfte_kontrollen': 'applookup/select',
  },
  'interne_audits': {
    'audit_titel': 'string/text',
    'audit_typ': 'lookup/select',
    'audit_beschreibung': 'string/textarea',
    'auditor_vorname': 'string/text',
    'auditor_nachname': 'string/text',
    'audit_startdatum': 'date/date',
    'audit_enddatum': 'date/date',
    'geprueft_kontrolle': 'applookup/select',
    'geprueft_compliance': 'applookup/select',
    'audit_ergebnis': 'lookup/select',
    'audit_empfehlungen': 'string/textarea',
    'audit_status': 'lookup/select',
    'audit_bericht': 'file',
  },
  'sicherheitskontrollen': {
    'kontrolle_name': 'string/text',
    'kontrolle_beschreibung': 'string/textarea',
    'kontrolle_typ': 'lookup/select',
    'kontrolle_kategorie': 'lookup/select',
    'implementierungsstatus': 'lookup/select',
    'wirksamkeit': 'lookup/radio',
    'kontrolle_verantwortlicher_vorname': 'string/text',
    'kontrolle_verantwortlicher_nachname': 'string/text',
    'naechste_ueberpruefung': 'date/date',
    'kontrolle_notizen': 'string/textarea',
  },
  'assets': {
    'asset_name': 'string/text',
    'asset_beschreibung': 'string/textarea',
    'asset_typ': 'lookup/select',
    'asset_kritikalitaet': 'lookup/radio',
    'verantwortlicher_vorname': 'string/text',
    'verantwortlicher_nachname': 'string/text',
    'abteilung': 'string/text',
    'asset_status': 'lookup/select',
  },
  'risikobewertung': {
    'risiko_name': 'string/text',
    'risiko_beschreibung': 'string/textarea',
    'risiko_kategorie': 'lookup/select',
    'betroffene_assets': 'applookup/select',
    'zugehoerige_kontrollen': 'applookup/select',
    'eintrittswahrscheinlichkeit': 'lookup/radio',
    'schadensausmass': 'lookup/radio',
    'risiko_behandlung': 'lookup/select',
    'risiko_status': 'lookup/select',
    'risiko_verantwortlicher_vorname': 'string/text',
    'risiko_verantwortlicher_nachname': 'string/text',
    'bewertungsdatum': 'date/date',
    'naechste_bewertung': 'date/date',
    'risiko_notizen': 'string/textarea',
  },
  'informationssicherheitsrisiken': {
    'is_risiko_name': 'string/text',
    'is_risiko_beschreibung': 'string/textarea',
    'is_bedrohungsquelle': 'lookup/select',
    'is_bedrohungsart': 'lookup/select',
    'is_schwachstelle': 'string/textarea',
    'is_betroffenes_asset': 'applookup/select',
    'is_mitigierende_kontrolle': 'applookup/select',
    'is_relevante_compliance': 'applookup/select',
    'is_vertraulichkeit': 'lookup/radio',
    'is_integritaet': 'lookup/radio',
    'is_verfuegbarkeit': 'lookup/radio',
    'is_eintrittswahrscheinlichkeit': 'lookup/radio',
    'is_gesamtrisiko': 'lookup/radio',
    'is_behandlung': 'lookup/select',
    'is_status': 'lookup/select',
    'is_verantwortlicher_vorname': 'string/text',
    'is_verantwortlicher_nachname': 'string/text',
    'is_bewertungsdatum': 'date/date',
    'is_naechste_bewertung': 'date/date',
    'is_notizen': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateRisikobehandlungMassnahmenplan = StripLookup<RisikobehandlungMassnahmenplan['fields']>;
export type CreateComplianceAnforderungen = StripLookup<ComplianceAnforderungen['fields']>;
export type CreateInterneAudits = StripLookup<InterneAudits['fields']>;
export type CreateSicherheitskontrollen = StripLookup<Sicherheitskontrollen['fields']>;
export type CreateAssets = StripLookup<Assets['fields']>;
export type CreateRisikobewertung = StripLookup<Risikobewertung['fields']>;
export type CreateInformationssicherheitsrisiken = StripLookup<Informationssicherheitsrisiken['fields']>;