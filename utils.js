const utils = {
    parseJson: input => {
        try {
            return JSON.parse(input);
        } catch {
            return {};
        }
    },
    parseHttpResponseJson: (
        response, 
        callback = () => {}
    ) => {
        if (`${response?.statusCode || 0}`?.startsWith('20')) {
            let data = '';
            response.on('data', chunk => chunk && (data += chunk));
            response.on('end', () => callback && callback(utils.parseJson(data)));
            response.on('error', error => console.log('Response parse error...', error));
        } else 
            callback && callback(null);
    }
};

module.exports = utils;
