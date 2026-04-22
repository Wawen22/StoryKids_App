import { buildApp } from './app.js';
import { getConfig } from './config.js';
import { logger } from './lib/logger.js';

async function main(): Promise<void> {
  const cfg = getConfig();
  const app = await buildApp();
  try {
    await app.listen({ port: cfg.API_PORT, host: cfg.API_HOST });
    logger.info({ port: cfg.API_PORT }, 'API listening');
  } catch (err) {
    logger.error({ err }, 'failed to start API');
    process.exit(1);
  }
}

main().catch((err) => {
  logger.error({ err }, 'fatal');
  process.exit(1);
});
