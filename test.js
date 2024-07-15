const utils = require('./utils');
const thinRetry = require('./index'); // This would be require('thin-retry') for you as a package consumer.

thinRetry(
    {
        options: {
            port: 443,
            method: 'GET',
            path: '/posts/1',   // Add a typo to this path to test 404s or spin up an express server to simulate HTTP errors.
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
