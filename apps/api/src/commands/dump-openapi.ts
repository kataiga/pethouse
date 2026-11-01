#!/usr/bin/env ts-node

/**
 * Writes the OpenAPI spec to `apps/api/openapi.json` without listening and without a database:
 * the spec is derived from decorators alone, and the CI `openapi` job provides no MySQL.
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { createApp } from '../bootstrap/create-app';
import { buildOpenApiDocument } from '../bootstrap/openapi';

const OUTPUT_PATH = resolve(__dirname, '../../openapi.json');

async function main (): Promise<void> {
  const app = await createApp({ connectDatabase: false });
  await app.init();

  const document = buildOpenApiDocument(app);
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();

  console.log(`OpenAPI spec written to ${OUTPUT_PATH} (${Object.keys(document.paths).length} paths)`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
