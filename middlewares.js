import { RATE_LIMIT, PRIOD, WHITELISTED_IPS } from "./config.js";
import { DEBUG } from './config.js';


const rateLimit = new Map();

function corsMiddleware(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    res.header("Access-Control-Allow-Methods", "*");
    next();
};

// Custom middleware to log request bodies for POST requests
function loggingMiddleware(req, res, next) {
    //   if (req.method === 'POST') {
        console.log('Request ip:', req.ip);
        console.log('Auth: ', req.headers['authorization'] || req.headers['Authorization'] )
        console.log('Method: ', req.method);
        console.log('URL: ', req.url);
        console.log('Request body:', req.body);
    //   }
      next();
    };

async function rateLimitMiddleware(req, res, next) {
    if (DEBUG) console.log(rateLimit);
    let ip = req.headers["CF-Connecting-IP"] ?? req.headers["cf-connecting-ip"] ?? req.headers["X-Forwarded-For"] ?? req.headers["x-forwarded-for"] ?? req.ip;
    let auth = req.headers['authorization'] ?? req.headers['Authorization'] ?? "unknown-auth";
    let rate_key = `${ip} ${auth}` 
    if (WHITELISTED_IPS.includes(ip)) return next();
    if (!rateLimit.has(rate_key)) {
        rateLimit.set(rate_key, {
            requests: 1,
            lastRequestTime: Date.now()
        });
    } else {
        const currentTime = Date.now();
        const timeSinceLastRequest = currentTime - rateLimit.get(rate_key).lastRequestTime;
        if (timeSinceLastRequest > PRIOD) {
            rateLimit.set(rate_key, {
                requests: 1,
                lastRequestTime: currentTime
            });
        } else {
            let updatedCount = rateLimit.get(rate_key).requests + 1;
            if (updatedCount > RATE_LIMIT) {
                if (DEBUG)  console.log("throttling key: ",rate_key)
                
                req.app.locals.apm.setLabel("proxy_resp_category", "throttle");
                return res.status(429).send( { "error": {
                    "message": "Rate limited. Too many requests to proxy from this IP and Key, please try again later",
                    "type": "server_error",
                    "param": null,
                    "code": null
                  }
                });
            }
            rateLimit.set(rate_key, {
                requests: updatedCount,
                lastRequestTime: rateLimit.get(rate_key).lastRequestTime
            });
        }
    }

    next();
};


async function responseLogMiddleware(req, res, next) {
  // Store the original res.send function
  const originalSend = res.send;

  // Create a new function for res.send to intercept the data being sent
  res.send = function (data) {
    

    if(data?.usage && res?.deployment_name) {

        const telemetry = {
            "proxy_servedby_deployment": res.deployment_name,
            "proxy_response_tokens": data.usage.completion_tokens,
            "proxy_prompt_tokens": data.usage.prompt_tokens,
            "proxy_total_tokens": data.usage.total_tokens
        };

        req.app.locals.apm.addLabels(telemetry, false);
        req.app.locals.apm.setLabel("proxy_resp_category", "llm");

        // Log the data being sent
        if(DEBUG) {
            console.log("Proxy telemetry:",telemetry);
        }
    } 
    

    // Call the original res.send function to send the response as usual
    originalSend.apply(res, arguments);
  };

  // Continue to the next middleware or route handler
  next();
}

export { corsMiddleware, rateLimitMiddleware, loggingMiddleware, responseLogMiddleware }
