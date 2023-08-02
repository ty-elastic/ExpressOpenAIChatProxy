// Server configuration
export const SERVER_PORT = 3000; // Server port
export const DEBUG = false; // Debug mode

export const CONCURRENT_PROMPTS = 1;

export const CACHING_ENABLED = true; // use a cache of 100 most recent answers

export const ENFORCE_PROXY_KEY = false; // set to false to stop key checks
export const SALT = "AAAAAAA"; // Change the SALT to make the keys protected
export const REVOKE_KEY_AFTER = 2; //keys will work for x days


// Rate limit
export const PRIOD = 5 * 1000; // 15 seconds
export const RATE_LIMIT = 5; // 50 requests per 15 seconds

// Whitelisted IPs
export const WHITELISTED_IPS = [
    // "127.0.0.1"
];


export let AZURE_LLM_DEPLOYMENTS = [
    {
        "type": "azure",
        "api_base": "https://YOURVALUE.api.cognitive.microsoft.com",
        "deployment_name": "YOURVALUE",
        "api_version": "2023-05-15",
        "api_key": "YOURVALUE"
    },
    // ADD MORE KEYS HERE

    
]