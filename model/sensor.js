var execSync = require('child_process').execSync;

var sensor = {
    getCurrent: function () {
        var result = execSync('./sensor_scripts/current.py').toString().split('\n');
        if (result[0] === 'error') {
            return {
                success: false,
                error: result[1]
            };
        } else {
            return {
                success: true,
                timestamp: result[0],
                temperature: result[1],
                humidity: result[2],
		pressure: result[3]
            };
        }
    },
    getLast: function () {
        var result = execSync('./sensor_scripts/last_measure.py').toString().split('\n');
        if (result[0] === 'error') {
            return {
                success: false,
                error: result[1]
            };
        } else {
            return {
                success: true,
                timestamp: result[0],
                temperature: result[1],
                humidity: result[2],
                pressure: result[3]
            };
        }	
    }
};

module.exports = sensor;
