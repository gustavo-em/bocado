import { version } from '../../package.json';

/**
 * The version shown at the bottom of "Metas". Taken from `package.json` so it
 * cannot drift from the release it was built with.
 */
export const APP_VERSION: string = version;
