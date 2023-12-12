// Server configuration
export const SERVER_PORT = 3000; // Server port
export const DEBUG = false; // Debug mode

//export const BASE_URL = `https://llmproxy.gcp.elasticsa.co`;

export const BASE_URL = process.env.BASE_URL;

if (!BASE_URL) {
  console.error("BASE_URL environment variable not set");
  process.exit(1);
}

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error("ADMIN_PASSWORD environment variable not set");
  process.exit(1);
}

export const SALT = process.env.SALT || "AAAAAAA"; // Change the SALT to make the keys protected

export const JWT_SECRET = 'changeme'

export const TIMEOUT_MS_BEFORE_GIVEUP = 15000; // calls to Azure will give up after 30s
export const CONCURRENT_PROMPTS = 10; // the number of users that can use a key at a time

// the in memory response cache
export const CACHING_ENABLED = true; // use a cache of 100 most recent answers
export const CACHE_SIZE = 100; // cache the 100 most recently used answers

// controls for key cycling
export const ENFORCE_PROXY_KEY = true; // set to false to stop key checks
export const REVOKE_KEY_AFTER = 8; //keys will work for x days


// Rate limit 
export const ENABLE_RATE_LIMITER = true;
export const PRIOD = 5 * 1001; // 5 seconds
export const RATE_LIMIT = 8; // 5 requests per 5 seconds

// Whitelisted IPs
export const WHITELISTED_IPS = [
    // "127.0.0.1"
];


// set llm deployments array from env variable
// expected format is a json array, e.g.:
// 
// [ {
//     "type": "azure",
//     "api_base": "https://eastus.api.cognitive.microsoft.com",
//     "deployment_name": "az-oai-1-gpt-35-turbo",
//     "api_version": "2023-05-15",
//     "api_key": "secret123"
// }]

export let AZURE_LLM_DEPLOYMENTS = [];
if (process.env.AZURE_LLM_DEPLOYMENTS) {
    // json array containing azure llm deployments
    AZURE_LLM_DEPLOYMENTS = JSON.parse(process.env.AZURE_LLM_DEPLOYMENTS);
}
else {
    // quit if no deployments are specified and log error
    console.error("No deployments specified in AZURE_LLM_DEPLOYMENTS environment variable");
    process.exit(1);
}
