const utils = require('./utils');
const thinRetry = require('./thin-retry');

(() => {
    thinRetry(
        {
            options: {
                port: 443,
                method: 'GET',
                path: '/posts/1',
                hostname: 'jsonplaceholder.typicode.com'
            },
            retryConfig: {
                maxAttempts: 3,
                maxJitterMs: 5000,
                maxConcurrentRequests: 10,
                defaultDelayMs: 10000
            },
            onResponse: response => utils.parseHttpResponseJson(response, data => data && console.log(data)),
            onError: error => error && console.log(error),
            onLog: info => info && console.log(info)
        }
    );
})();