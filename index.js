import apm from 'elastic-apm-node/start.js';

import express, { json, urlencoded } from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import {  adaptOpenAIModels, adaptOpenAICompletion, adaptOpenAIChatCompletion, status } from './routes.js';
import { corsMiddleware, rateLimitMiddleware, loggingMiddleware, responseLogMiddleware } from './middlewares.js';
import { DEBUG, SERVER_PORT, ENABLE_RATE_LIMITER, BASE_URL,ENFORCE_PROXY_KEY } from './config.js';

import passport from 'passport';
import {BasicStrategy} from 'passport-http';
import {userAuth} from './userAuth.js'; 

passport.use(new BasicStrategy(
    function(userid, password, done) {
        const user = userAuth.findUserByUsername(userid);
        if (user) {
            if (userAuth.isValidPassword(user, password)) {
                return done(null, user);
            } else {
                return done(null, false);
            }
        } else {
            return done(null,false);
        }
    }
));

let app = express();
app.locals.apm = apm;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import path from 'path';

// Set the view engine to use EJS
app.set('view engine', 'ejs');
// Set the views directory (where your EJS templates will be stored)
app.set('views', path.join(__dirname, 'views'));


process.on("uncaughtException", function (err) {
    if (DEBUG) console.error(`Caught exception: ${err}`);
    apm.captureError(err);
});

// Middlewares
app.use(corsMiddleware);
app.use(json());
if(ENABLE_RATE_LIMITER) app.use(rateLimitMiddleware);
if(DEBUG) app.use(loggingMiddleware);
app.use(responseLogMiddleware);
app.use(urlencoded({ extended: true }));

// needed to track uptime
app.locals.startTime = new Date();

// // Register routes
app.all("/", async function (req, res) {
    return res.redirect("/docs");
});

const webConfig = {
    pageTitle: 'LLM Proxy User Docs',
    baseURL: BASE_URL,
    enforceKey: ENFORCE_PROXY_KEY,
  };
  app.get('/docs', (req, res) => {
    res.render('documentation', { data: webConfig });
  });

app.get("/status", passport.authenticate('basic', { session: false }), status);

app.get("/v1/models", adaptOpenAIModels);
app.post("/v1/completions", adaptOpenAICompletion);
app.post("/v1/chat/completions", adaptOpenAIChatCompletion);


// Start server
app.listen(SERVER_PORT, () => {
    console.log(`Proxy server starting and Listening on ${SERVER_PORT} ...`);
});
