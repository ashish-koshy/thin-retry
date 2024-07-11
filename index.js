const https = require('https');

const requestQueue = [];
let currentRequestCount = 0;

const $retryConfig = {
    maxAttempts: 5,
    /**
     * A value range between 1000ms and 10000ms.
     * A random value will be picked between this
     * range and added to the delay before
     * every retry to introduce randomness.
     */
    maxJitterMs: 5000,
    maxConcurrentRequests: 10,
    /** 
     * Default delay to apply if no delay 
     * headers are returned from the server. 
     * This delay would increase exponentially 
     * with every failure.
     **/
    defaultDelayMs: 10000
};

const $input = {
    options: {
        port: 443,
        path: '',
        method: '',
        hostname: '',
        headers: {
            'Content-Type': '',
            Authorization: ''
        },
    },
    body: null,
    onResponse: () => {},
    onError: () => {},
    onLog: () => {},
    retryConfig: $retryConfig,
    attemptCounter: 0
};

const logInfo = (input = $input, message = '') => {
    message &&
    input?.onLog &&
    input.onLog(message);
};

const getRandomJitterMs = (input = $input) => {
    const min = 1000;
    let max = (input?.retryConfig?.maxJitterMs || 5000);

    if (max < 1000) 
        max = 1000;
    else if (max > 10000) 
        max = 10000;
    
    const jitter = (Math.random() * (max - min + 1));
    return Math.floor(jitter) + min;
};

let $forcedRequestDelayMs = 0;
const setForcedRequestDelayMs = value => $forcedRequestDelayMs = value;
const getForcedRequestDelayMs = () => $forcedRequestDelayMs;

const getDefaultExponentialDelayMs = (input = $input) => {
    const defaultDelayMs = input?.retryConfig?.defaultDelayMs || 10000;
    return defaultDelayMs * (input?.attemptCounter - 1);
};

const processQueue = (input = $input) => {
    if (currentRequestCount >= (input?.retryConfig?.maxConcurrentRequests || 10))
        return;

    currentRequestCount++;
    const callback = requestQueue?.shift();
    callback && callback();
};

const canRetry = (input = $input) => {
    const maxAttempts = input?.retryConfig?.maxAttempts || 5;
    const canRetryStatus = ((input?.attemptCounter || 1) < maxAttempts);
    !canRetryStatus && logInfo(input, `CANCEL ${input?.options?.path || ''}`);
    return canRetryStatus;
};

const onResponse = (response, input = $input) => {
    const statusCode = response?.statusCode || 0;

    statusCode && logInfo(input, `RES ${statusCode} ${input?.options?.path || ''}`);

    const headers = response?.headers || {};
    const retryAfter = parseInt(headers['Retry-After'] || headers['retry-after'] || '0');

    if (retryAfter) {
        logInfo(input, `RETRY AFTER ${retryAfter} SECONDS ${input?.options?.path || ''}`);
        setForcedRequestDelayMs(retryAfter * 1000);
    }

    if (!(`${statusCode}`?.startsWith('20')) && canRetry(input))
        executeRequest(input);

    currentRequestCount--;
    processQueue(input);

    input?.onResponse && input.onResponse(response, input?.attemptCounter);
};

const onError = (error, input = $input) => {
    error?.code && logInfo(input, `ERROR ${error.code || '0'} ${input?.options?.path || ''}`);

    if (canRetry(input))
        executeRequest(input);
    
    currentRequestCount--;
    processQueue(input);

    input?.onError && input.onError(error, input?.attemptCounter);
};

const executeRequest = (input = $input) => {
    !input?.retryConfig && (input.retryConfig = $retryConfig);
    !input?.attemptCounter && (input.attemptCounter = 0);
    
    input.attemptCounter += 1;

    const randomJitter = getRandomJitterMs(input);
    const forcedRequestDelayMs = getForcedRequestDelayMs();
    let requestDelay = forcedRequestDelayMs ? (forcedRequestDelayMs + randomJitter) : 0;

    if (!requestDelay && input?.attemptCounter > 1)
        requestDelay = getDefaultExponentialDelayMs(input) + randomJitter;

    requestDelay && logInfo(input, `DELAY ${requestDelay} ${input?.options?.path || ''}`);

    setTimeout(
        () => {
            const request = https.request(input.options, response => onResponse(response, input));
            request.write(JSON.stringify(input.body || {}));
            request.on('error', error => onError(error, input));
            request.end();
            getForcedRequestDelayMs() && setForcedRequestDelayMs(0);
        },
        requestDelay
    );
};

function thinRetry(input = $input) {
    requestQueue.push(() => executeRequest(input));
    processQueue(input);
};

module.exports = thinRetry;