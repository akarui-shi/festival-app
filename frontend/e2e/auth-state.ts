/**
 * Shared constants for auth storage state paths.
 * Import this file (not global.setup.ts) from test files.
 */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const STORAGE_STATE = {
  admin: path.join(__dirname, '.auth', 'admin.json'),
  user: path.join(__dirname, '.auth', 'user.json'),
};
