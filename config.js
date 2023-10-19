// Server configuration
export const SERVER_PORT = 3000; // Server port
export const BASE_URL = `http://localhost:${SERVER_PORT}`;
export const DEBUG = false; // Debug mode
export const ADMIN_PASSWORD = "changeme";

export const JWT_SECRET = 'changeme'

export const TIMEOUT_MS_BEFORE_GIVEUP = 15000; // calls to Azure will give up after 30s
export const CONCURRENT_PROMPTS = 10; // the number of users that can use a key at a time

// the in memory response cache
export const CACHING_ENABLED = true; // use a cache of 100 most recent answers
export const CACHE_SIZE = 100; // cache the 100 most recently used answers

// controls for key cycling
export const ENFORCE_PROXY_KEY = true; // set to false to stop key checks
export const SALT = "AAAAAAA"; // Change the SALT to make the keys protected
export const REVOKE_KEY_AFTER = 3; //keys will work for x days


// Rate limit 
export const ENABLE_RATE_LIMITER = true;
export const PRIOD = 5 * 1001; // 5 seconds
export const RATE_LIMIT = 5; // 5 requests per 5 seconds

// Whitelisted IPs
export const WHITELISTED_IPS = [
    // "127.0.0.1"
];


export let AZURE_LLM_DEPLOYMENTS = [
    // {
    //     "type": "azure",
    //     "api_base": "https://YOURVALUE.api.cognitive.microsoft.com",
    //     "deployment_name": "YOURVALUE",
    //     "api_version": "2023-05-15",
    //     "api_key": "YOURVALUE"
    // },
    // ADD MORE KEYS HERE
    

]