import axios from "axios";
import { Configuration, OpenAIApi } from "openai";
import { 
    streamCompletion, 
    generateId, 
    getAzureAIDeployment,
    getAllSemaphoreStatus, 
    generateAccessKey,
    generateAccessKeyRange, 
    checkAuth,
} from "./functions.js"
import { DEBUG, CACHING_ENABLED, CACHE_SIZE, TIMEOUT_MS_BEFORE_GIVEUP } from "./config.js";


async function adaptOpenAIModels(req,res) {
    return res.status(501).send({
        "error": {
          "message": "This proxy does not implement that function",
          "type": "server_error",
          "param": null,
          "code": null
        }
    });
};

async function adaptOpenAICompletion(req,res) {
    return res.status(501).send({
        "error": {
          "message": "This proxy does not implement that function",
          "type": "server_error",
          "param": null,
          "code": null
        }
    });
};


const MAX_CACHE_SIZE = CACHE_SIZE;
const responseCache = {};
const recentResponses = [];

function addToCache(question, response) {
    const str_question = JSON.stringify(question);
    responseCache[str_question] = response;
    recentResponses.unshift(str_question);
    if(recentResponses.length > MAX_CACHE_SIZE) {
        const removedQuestion = recentResponses.pop();
        delete responseCache[removedQuestion];
    }
}

function getFromCache(question){
    const str_question = JSON.stringify(question);
    return responseCache[str_question];

}


axios.interceptors.response.use(undefined, (err) => {
    const { config, message } = err;
    if (!config || !config.retry) {
      return Promise.reject(err);
    }
    // retry while Network timeout or Network Error
    if (!(message.includes("timeout") || message.includes("429"))) {
      return Promise.reject(err);
    }
    config.retry -= 1;

    if(message.includes("timeout")) {
        const delayRetryRequest = new Promise((resolve) => {
            setTimeout(() => {
              console.log("Axios TIMEOUT REACHED retry the request", config.url);
              resolve();
            }, config.noResponseDelay || 1000);
          });
          return delayRetryRequest.then(() => axios(config));
    } else {
        const delayRetryRequest = new Promise((resolve) => {
            setTimeout(() => {
              console.log("Upstream Rate Limiting Poosible retry the request", config.url);
              resolve();
            }, config.retryDelay || 1000);
          });
          return delayRetryRequest.then(() => axios(config));
    }
  });


async function adaptOpenAIChatCompletion(req, res) {

    // get the OpenAI style auth header
    let auth = req.headers['authorization'] ?? req.headers['Authorization'] ?? "unknown-auth";
    // remove anything from the value that isn't an alphanumeric, _, -, or space to prevent injection attack
    if(auth) auth = auth.replace(/[^a-zA-Z0-9-_\s]/g, '');

    // if key checking is turned on, check the key
    if(!checkAuth(auth)){
        return res.status(401).send( { "error": {
            "message": "Invalid authorization header",
            "type": "server_error",
            "param": null,
            "code": null
          }
        });
    }


    // If we have a response cache, check to see if we already have the answer
    if(CACHING_ENABLED && !req.body.stream){
        const cache_reponse = getFromCache(req.body);
        if(cache_reponse){
            if(DEBUG) console.log("  Returning cached reponse")
            req.app.locals.apm.setLabel("proxy_resp_category", "cache");
            return res.status(200).send(cache_reponse.data);
        }
    }

    // Get an Azure deployment. if an error is thrown, there were none available
    let deployment = null;
    try {
        deployment = getAzureAIDeployment();
    } catch (e) {
        req.app.locals.apm.setLabel("proxy_resp_category", "semaphoresLocked");
        return res.status(429).send( { "error": {
            "message": "Too many requests to proxy, all keys busy, please try again later",
            "type": "server_error",
            "param": null,
            "code": null
          }
        });
        
    }

    // OpenAI responses return a key, to prevent strongly typed clients having troube, return a fake org key
    let orgId = generateId();

    // the key is the API key of the deployment owned by the proxy (not the user's key)
    let key = deployment["api_key"];

    // const new_url = deployment["api_key"] + req.url;
    const base_url = deployment["api_base"];
    const deployment_name = deployment["deployment_name"];
    const api_version = deployment["api_version"];
    const new_url = base_url + "/openai/deployments/" + deployment_name + "/chat/completions?api-version=" + api_version;

    res['deployment_name'] = deployment_name;

    // the proxy code for a streamed OpenAI return
    if (req.body.stream) {
        try {
            const response = await axios.post(
                new_url, req.body, 
                {
                    responseType: "stream",
                    timeout: TIMEOUT_MS_BEFORE_GIVEUP,
                    headers: {
                        Accept: "text/event-stream",
                        "Content-Type": "application/json",
                        "api-key": key,
                    },
                },
            );

            res.setHeader("content-type", "text/event-stream");

            for await (const message of streamCompletion(response.data)) {
                try {
                    const parsed = JSON.parse(message);
                    // delete parsed.id;
                    parsed.id = orgId;
                    // delete parsed.created;
                    const { content } = parsed.choices[0].delta;
                    if (content) {
                        res.write(`data: ${JSON.stringify(parsed)}\n\n`);
                    }
                } catch (error) {
                    if (DEBUG) console.error("Could not JSON parse stream message", message, error);
                }
            }

            res.write(`data: [DONE]`);
            deployment.semaphore.release();
            res.end();
        } catch (error) {
            try {
                if (error.response && error.response.data) {
                    let errorResponseStr = "";

                    for await (const message of error.response.data) {
                        errorResponseStr += message;
                    }

                    errorResponseStr = errorResponseStr.replace(/org-[a-zA-Z0-9]+/, orgId);

                    const errorResponseJson = JSON.parse(errorResponseStr);
                    deployment.semaphore.release();
                    req.app.locals.apm.setLabel("proxy_resp_category", "error");
                    return res.status(error.response.status).send(errorResponseJson);
                } else {
                    if (DEBUG) console.error("Could not JSON parse stream message", error);
                    deployment.semaphore.release();
                    req.app.locals.apm.setLabel("proxy_resp_category", "error");
                    return res.status(500).send({
                        "error": {
                            "message": "Proxy Server Error",
                            "type": "server_error"
                        }});
                }
            }
            catch (e) {
                if (DEBUG) console.log(e);
                deployment.semaphore.release();
                req.app.locals.apm.setLabel("proxy_resp_category", "error");
                return res.status(500).send({
                    "error": {
                        "message": "Proxy Server Error",
                        "type": "server_error"
                    }});
            }
        }
    }
    else { // the proxy code for a not-streamed OpenAI return
        try {

            const response = await axios.post(
                new_url, req.body,
                {
                    timeout: TIMEOUT_MS_BEFORE_GIVEUP,
                    retry: 3, 
                    retryDelay: 5000,
                    noResponseDelay: 5000,
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        "api-key": key,
                    },
                },
            );
            
            // delete response.data.id;
            response.data.id = orgId;
            // delete response.data.created;
            
            if(CACHING_ENABLED) addToCache(req.body, response);
            
            deployment.semaphore.release();
            return res.status(200).send(response.data);
        } catch (error) {
            try {
                
                if (axios.isAxiosError(error)) {
                // This is an AxiosError, you can handle it here
                    console.error('Axios Error:', error.message);
                    console.error('Status Code:', error.response?.status);
                    console.error('Response Data:', error.response?.data);

                } else {
                // This is a regular JavaScript Error, handle it accordingly
                    console.error('Error:', error.message);
                }
                deployment.semaphore.release();

                if(error.response?.status && error.response?.data){
                    error.response.data.error.message = error.response.data.error.message.replace(/org-[a-zA-Z0-9]+/, orgId);
                    req.app.locals.apm.setLabel("proxy_resp_category", "error");
                    return res.status(error.response.status).send(error.response.data);
                } else {
                    req.app.locals.apm.setLabel("proxy_resp_category", "error");
                    return res.status(500).send({
                        "error": {
                            "message": "Proxy Server Error",
                            "type": "server_error"
                        }});
                }
                
            }
            catch (e) {
                if (DEBUG) console.log(e);
                deployment.semaphore.release();
                return res.status(500).send({
                    "error": {
                        "message": "Proxy Server Error",
                        "type": "server_error"
                    }});
            }
        }
    }

}


function uptimeStrFromMs(ms) {
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / 1000 / 60) % 60;
    const hours = Math.floor(ms / 1000 / 60 / 60) % 24;
    const days = Math.floor(ms / 1000 / 60 / 60 / 24);

    const uptimeParts = [];

    if (days > 0) {
        uptimeParts.push(`${days} day${days > 1 ? 's' : ''}`);
    }
    if (hours > 0) {
        uptimeParts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    }
    if (minutes > 0) {
        uptimeParts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    }
    if (seconds > 0) {
        uptimeParts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);
    }

    return uptimeParts.join(', ');
}




async function status(req,res) {

    const cacheLengthUsed = recentResponses.length;

    const now = new Date();
    const ms =  now - req.app.locals.startTime;


    const currentDate = new Date();
    const access_key = generateAccessKey(currentDate);
    const access_keys = generateAccessKeyRange(currentDate);

    return res.status(200).send({
        "proxy-alive": true,
        "access-key": access_key,
        "access_keys": access_keys,
        "uptime": uptimeStrFromMs(ms),
        "cache-enabled": CACHING_ENABLED,
        "cache-length-used": cacheLengthUsed,
        "semaphores": getAllSemaphoreStatus(),
    });
};


export { 
    adaptOpenAIModels,
    adaptOpenAICompletion,
    adaptOpenAIChatCompletion,
    status
};


