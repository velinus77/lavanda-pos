import { defineConfig } from 'drizzle-kit';
import * as path from 'path';

export default defineConfig({
  schema: path.join(__dirname, './src/schema/index.ts'),
  out: './migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: '../data/lavanda.db',
  },
  verbose: true,
  strict: true,
});
