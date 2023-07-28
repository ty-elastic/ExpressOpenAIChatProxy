// Server configuration
export const SERVER_PORT = 3000; // Server port
export const DEBUG = true; // Debug mode


export const CACHING_ENABLED = true; // use a cache of 100 most recent answers

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