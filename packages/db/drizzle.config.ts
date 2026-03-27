import { defineConfig } from 'drizzle-kit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  schema: join(__dirname, './src/schema/index.ts'),
  out: './migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: join(__dirname, '../data/lavanda.db'),
  },
  verbose: true,
  strict: true,
});
