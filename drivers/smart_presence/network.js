var net = require("net");   // https://www.tutorialspoint.com/nodejs/nodejs_net_module.htm

function Network(driver) {
    this.className = "Network";
    this.driver = driver;
}

Network.prototype.scan = function (device, onlineCallback, offlineCallback, timeout) {
    console.log("Scanning...");
    var client = new net.Socket();
    var cancelCheck = setTimeout(function () {
        client.destroy();
        delete client;
        handleOffline();
    }, timeout);

    var handleOnline = function () {
        clearTimeout(cancelCheck);
        console.log("Device", device.getHost(), "is online");
        client.destroy();
        delete client;
        if (onlineCallback)
            onlineCallback(device);

    };

    var handleOffline = function () {
        clearTimeout(cancelCheck);
        console.log("Device", device.getHost(), "is offline");
        client.destroy();
        if (offlineCallback) {
            offlineCallback(device);
        }
    };

    client.on('error', function (err) {
        console.debug("Scan result:", err);
        if (err && err.errno && err.errno == "ECONNREFUSED") {
            handleOnline();
        }
        else if (err && err.errno && err.errno == "EHOSTUNREACH") {
            handleOffline();
        }
        else if (err && err.errno && err.errno == "ENETUNREACH") {
            console.error("Homey can't reach the IP address cause it's on another network. Are you sure you entered the correct IP?");
            handleOffline();
        }
        else if (err && err.errno) {
            console.error("ICMP driver can only handle ECONNREFUSED, ENETUNREACH and EHOSTUNREACH, but got " + err.errno);
            handleOffline();
        }
        else {
            console.error("ICMP driver can't handle " + err);
            handleOffline();
        }
    });


    try {
        var port = this.getPredefinedPortNumberFromSettings();
        var host = device.getHost();
        console.debug("Scanning ", host + ":" + port, "...");
        client.connect(port, host, function () {
            handleOnline();
        });
    } catch (ex) {
        console.error(ex.message);
        handleOffline();
    }
};

Network.prototype.getPredefinedPortNumberFromSettings = function () {
    try {
        var rawNumbers = Homey.manager('settings').get('port_numbers');
        if (!rawNumbers)
            rawNumbers = "1,32000";

        var numbers = rawNumbers.split(",");
        var random = numbers[Math.floor(Math.random() * numbers.length)];
        if (random) {
            return random;
        }
        else {
            return 1;   // just in case there is nothing configured.
        }
    }
    catch (exception) {
        console.error(exception + ". Please save the settings again.");
        return 1;
    }
}


module.exports = Network