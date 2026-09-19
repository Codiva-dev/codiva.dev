import type { Locale } from './config';
import enCareer from './locales/en/career.json';
import enCore from './locales/en/core.json';
import enOpsAuth from './locales/en/ops-auth.json';
import enOpsInterviews from './locales/en/ops-interviews.json';
import enOpsPortal from './locales/en/ops-portal.json';
import enOpsStaff from './locales/en/ops-staff.json';
import enServer from './locales/en/server.json';
import enTicket from './locales/en/ticket.json';
import esCareer from './locales/es/career.json';
import esCore from './locales/es/core.json';
import esOpsAuth from './locales/es/ops-auth.json';
import esOpsInterviews from './locales/es/ops-interviews.json';
import esOpsPortal from './locales/es/ops-portal.json';
import esOpsStaff from './locales/es/ops-staff.json';
import esServer from './locales/es/server.json';
import esTicket from './locales/es/ticket.json';

export type Dict = Record<string, unknown>;

function merge(...parts: Dict[]): Dict {
  return Object.assign({}, ...parts);
}

/** Full dictionaries for server-side tSync / getT. Client i18n loads core only. */
export const DICTIONARIES: Record<Locale, Dict> = {
  es: merge(esCore, esTicket, esCareer, esOpsStaff, esOpsPortal, esOpsInterviews, esOpsAuth, esServer),
  en: merge(enCore, enTicket, enCareer, enOpsStaff, enOpsPortal, enOpsInterviews, enOpsAuth, enServer),
};
