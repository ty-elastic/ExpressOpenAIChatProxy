import { DEBUG, CONCURRENT_PROMPTS, AZURE_LLM_DEPLOYMENTS, SALT, REVOKE_KEY_AFTER, ENFORCE_PROXY_KEY } from "./config.js";

import pkg from 'crypto-js';
const { MD5 } = pkg;


function getDatesBeforeAndAfter(d, forward, before) {
    const dates = [];

    // Get the day after d
    const today = new Date(d);
    dates.push(today);
  
    // Get n days before d
    for (let i = 1; i <= before; i++) {
      const nDaysBefore = new Date(d);
      nDaysBefore.setDate(nDaysBefore.getDate() - i);
      dates.push(nDaysBefore);
    }

    // Get n days before d
    for (let i = 1; i <= forward; i++) {
        const nDaysAfter = new Date(d);
        nDaysAfter.setDate(nDaysAfter.getDate() - i);
        dates.push(nDaysAfter);
      }
  
    return dates;
  }

function generateAccessKeyRange(dateObj){
    const datesBeforeAndAfter = getDatesBeforeAndAfter(dateObj, 1, REVOKE_KEY_AFTER);

    const retVals = [];

    for (const date of datesBeforeAndAfter) {
        retVals.push(generateAccessKey(date));
    }

    return retVals;

}

function generateAccessKey(dateObj) {
    let iso8601DateString = dateObj.toISOString().slice(0, 10);
    let combinedString = iso8601DateString +"-"+ SALT;
    let hash = MD5(combinedString).toString();
    return hash;
}


function startsWithAny(a, b) {
    for (const prefix of b) {
      let actualCheck = `Bearer ${prefix}`;
      console.log(`comparing ${a} and ${actualCheck}`)
      if (a.startsWith(actualCheck)) {
        return true;
      }
    }
    return false;
  }

function checkAuth(authKey) {
    if(!ENFORCE_PROXY_KEY) return true;
    
    let now = new Date();
    let acceptableKeys = generateAccessKeyRange(now);
    return startsWithAny(authKey, acceptableKeys);
}

async function* chunksToLines(chunksAsync) {
    let previous = "";
    for await (const chunk of chunksAsync) {
        const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        previous += bufferChunk;
        let eolIndex;
        while ((eolIndex = previous.indexOf("\n")) >= 0) {
            // line includes the EOL
            const line = previous.slice(0, eolIndex + 1).trimEnd();
            if (line === "data: [DONE]") break;
            if (line.startsWith("data: ")) yield line;
            previous = previous.slice(eolIndex + 1);
        }
    }
}

async function* linesToMessages(linesAsync) {
    for await (const line of linesAsync) {
        const message = line.substring("data :".length);

        yield message;
    }
}

async function* streamCompletion(data) {
    yield* linesToMessages(chunksToLines(data));
}

function generateId() {
    const chars =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let id = "org-";
    for (let i = 0; i < 24; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

function getOpenAIKey() {
    return OPENAI_KEYS[Math.floor(Math.random() * OPENAI_KEYS.length)];
}


// Utility function to create a semaphore
function createSemaphore(maxConnections) {
    let connections = 0;
    let metric_lockHits = 0;
    let metric_acquired_lock = 0;
    let metric_released_lock = 0;
    const queue = [];
  
    const tryAcquire = () => {
      if (connections >= maxConnections) {
        return false;
        metric_lockHits++
      } else {
        connections++;
        metric_acquired_lock++;
        return true;
      }
    };
  
    const release = () => {
      connections--;
      metric_released_lock++;
      if (queue.length > 0) {
        queue.shift()();
      }
    };

    const semaphoreStatus = () => {
        const lockStatus = (connections >= maxConnections) ? "locked" : "unlocked";
        return {
            "lockStatus" : lockStatus,
            "metric_lockHits": metric_lockHits,
            "metric_acquired_lock": metric_acquired_lock,
            "metric_released_lock": metric_released_lock,
            "current_connectons": connections,
        }
    };
  
    return {
      tryAcquire,
      release,
      semaphoreStatus,
    };
}

AZURE_LLM_DEPLOYMENTS.forEach((deployment) => {
    deployment.semaphore = createSemaphore(CONCURRENT_PROMPTS);
});
console.log(`Generating ${AZURE_LLM_DEPLOYMENTS.length} semaphores for Azure connections`);


function getAzureAIDeployment() {
    let attempts = 0;
    while (attempts < 10) {
        attempts = attempts + 1;
        const dep =  AZURE_LLM_DEPLOYMENTS[Math.floor(Math.random() * AZURE_LLM_DEPLOYMENTS.length)];
        
        if(dep.semaphore.tryAcquire()) {
            if(DEBUG) console.log("  Acquired Random Azure key: "+dep["deployment_name"])
            return dep
        } else {
            if(DEBUG) console.log("  Semaphore block on: "+dep["deployment_name"])
        }
    }
    
    throw new Error("Unable to get a deployment, they are busy, back off");
    
}

function getAllSemaphoreStatus() {
    const status = [];

    AZURE_LLM_DEPLOYMENTS.forEach((deployment) => {
        status.push( {
            "deployment_name": deployment.deployment_name,
            "type": deployment.type,
            "status": deployment.semaphore.semaphoreStatus(),
        } );
    });

    return status;
}

export { 
    generateId, 
    getOpenAIKey, 
    streamCompletion, 
    getAzureAIDeployment, 
    getAllSemaphoreStatus, 
    generateAccessKey, 
    generateAccessKeyRange, 
    checkAuth 
}