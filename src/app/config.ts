import { APP_CONTACT_EMAIL, USDA_API_KEY } from '@env';

/**
 * Build-time configuration, read once from `.env` (gitignored) with defaults
 * that keep a fresh checkout working. Nothing here identifies the user: the
 * contact address is the app's own, required by Open Food Facts in the
 * `User-Agent` of every request (docs/FOOD_DATA_CONTRACT.md).
 */

export const APP_NAME = 'Bocado';

/** Kept in step with `package.json`; it only ever reaches the User-Agent. */
export const APP_VERSION = '0.0.1';

/** Owner's manual step: set `APP_CONTACT_EMAIL` in `.env` before release. */
export const CONTACT_EMAIL = APP_CONTACT_EMAIL ?? 'contato@bocado.app';

/**
 * Open Food Facts refuses anonymous clients: `<App>/<version> (<e-mail>)`.
 * Built here and nowhere else, so there is one string to change.
 */
export const USER_AGENT = `${APP_NAME}/${APP_VERSION} (${CONTACT_EMAIL})`;

/**
 * api.data.gov key. `DEMO_KEY` is rate limited but works, so USDA answers
 * without any setup; the owner drops a real key in `.env` to lift the limit.
 */
export const USDA_KEY = USDA_API_KEY ?? 'DEMO_KEY';
