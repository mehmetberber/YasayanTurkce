import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = await buildApp({ config, logger: true });

try {
  await app.listen({ port: config.port, host: config.host });
  app.log.info(
    `API http://${config.host}:${config.port} adresinde dinliyor.`,
  );
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
