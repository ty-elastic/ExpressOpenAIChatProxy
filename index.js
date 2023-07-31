var apm = require('elastic-apm-node').start()

import express, { json, urlencoded } from 'express';
import {  adaptOpenAIModels, adaptOpenAICompletion, adaptOpenAIChatCompletion } from './routes.js';
import { corsMiddleware, rateLimitMiddleware, loggingMiddleware, responseLogMiddleware } from './middlewares.js';
import { DEBUG, SERVER_PORT } from './config.js';

let app = express();

process.on("uncaughtException", function (err) {
    if (DEBUG) console.error(`Caught exception: ${err}`);
});

// Middlewares
app.use(corsMiddleware);
app.use(rateLimitMiddleware);
app.use(json());
// if(DEBUG) app.use(loggingMiddleware);
app.use(responseLogMiddleware);
app.use(urlencoded({ extended: true }));

// Register routes
app.all("/", async function (req, res) {
    res.set("Content-Type", "application/json");
    return res.status(200).send({
        status: true,
        message: "Proxy to OpenAI target: BASE_URL/v1"
        // github: "https://github.com/PawanOsman/ChatGPT",
        // discord: "https://discord.pawan.krd"
    });
});
app.get("/v1/models", adaptOpenAIModels);
app.post("/v1/completions", adaptOpenAICompletion);
app.post("/v1/chat/completions", adaptOpenAIChatCompletion);


// Start server
app.listen(SERVER_PORT, () => {
    console.log(`Listening on ${SERVER_PORT} ...`);
});
