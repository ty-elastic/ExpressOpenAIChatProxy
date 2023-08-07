// elastic APM 
const ELASTIC_APM_SERVICE_NAME = process.env.ELASTIC_APM_SERVICE_NAME;
const ELASTIC_CLOUD_ID = process.env.ELASTIC_CLOUD_ID;
const ELASTIC_API_KEY = process.env.ELASTIC_API_KEY;
import apm from 'elastic-apm-node/start.js';



//** THIS IS THE CODE THAT WILL PUT LOGS INTO APM directly */
// import elasticApmLogger from 'elastic-apm-node-logger';
// elasticApmLogger.startLogging({
//     esAuthObject: {
//       cloud: { id: ELASTIC_CLOUD_ID },
//       auth: { apiKey: ELASTIC_API_KEY }
//     },
//     serviceName: ELASTIC_APM_SERVICE_NAME,
//     apmObject: apm
//   });

// express basics
import express, { json, urlencoded } from 'express';



import { fileURLToPath } from 'url';
import { dirname } from 'path';

// functions, middleware and config we will use
import {  adaptOpenAIModels, adaptOpenAICompletion, adaptOpenAIChatCompletion, status } from './routes.js';
import { corsMiddleware, rateLimitMiddleware, loggingMiddleware, responseLogMiddleware } from './middlewares.js';
import { DEBUG, SERVER_PORT, ENABLE_RATE_LIMITER, BASE_URL,ENFORCE_PROXY_KEY } from './config.js';

// authentication middleware libraries
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

// start actual instantiation of the server
let app = express();
app.locals.apm = apm; // so we can access apm in routes
app.locals.startTime = new Date(); // needed to track uptime


// how we get local files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import path from 'path';

// Set the view engine to use EJS
app.set('view engine', 'ejs');
// Set the views directory (where your EJS templates will be stored)
app.set('views', path.join(__dirname, 'views'));

//capture thrown errors in APM
process.on("uncaughtException", function (err) {
    if (DEBUG) console.error(`Caught exception: ${err}`);
    apm.setLabel("proxy_resp_category", "uncaughtException");
    apm.captureError(err);
});

// Use middlware
app.use(corsMiddleware);
app.use(json());
if(ENABLE_RATE_LIMITER) app.use(rateLimitMiddleware);
// if(DEBUG) app.use(loggingMiddleware);  // this was logging requests, not needed now
app.use(responseLogMiddleware);
app.use(urlencoded({ extended: true }));



// Register routes


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

// protected by admin password
app.get("/status", passport.authenticate('basic', { session: false }), status);

// not impelemented
app.get("/v1/models", adaptOpenAIModels);
app.post("/v1/completions", adaptOpenAICompletion);

// the actual proxy
app.post("/v1/chat/completions", adaptOpenAIChatCompletion);

// Start server
app.listen(SERVER_PORT, () => {
    console.log(`Proxy server starting and Listening on ${SERVER_PORT} ...`);
});
