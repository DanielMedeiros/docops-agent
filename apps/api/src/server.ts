import { buildApp } from "./app.js";
import { config } from "./config.js";

async function start(): Promise<void> {
    const app = await buildApp();

    try {
        await app.listen({
            host: config.API_HOST,
            port: config.API_PORT
        });

        app.log.info(
            `DocOps API executando em http://${config.API_HOST}:${config.API_PORT}`
        );
    } catch (error) {
        app.log.error(error);
        process.exit(1);
    }
}

start();