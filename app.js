"use strict";

var currentLogs;

var DEBUG_LOGGING = false;

function DefaultSettings() {
    // If you change a variable here, then also change it in settings.js
    this.LOG_COUNT_SETTING = 10;
    this.HOST_CHECK_INTERVAL_SETTING = 5;
    this.HOST_TIMEOUT_SETTING = 2;
    this.PORTS_SETTING = "1, 32000";
}

var DEFAULTS = new DefaultSettings();

Array.prototype.diff = function(a) {
    return this.filter(function(i) {return a.indexOf(i) < 0;});
};

module.exports.init = function () {
    Homey.log("Starting Smart Presence");
    currentLogs = loadLog();
};

console.logWithLevel = function (message, level) {
    if (!level) level = "debug";
    level = level.toUpperCase();
    addToLog(new Date(new Date().getTime()), message, level);
};

console.info = function () {
    console.logWithLevel(join(Array.from(arguments)), "INFO");
    this.apply(console, arguments)
}.bind(console.info);

console.warn = function () {
    console.logWithLevel(join(Array.from(arguments)), "WARN");
    this.apply(console, arguments)
}.bind(console.warn);

console.error = function () {
    console.logWithLevel(join(Array.from(arguments)), "ERROR");
    this.apply(console, arguments)
}.bind(console.error);

console.log = function () {
    if(DEBUG_LOGGING === true) {
        console.logWithLevel(join(Array.from(arguments)), "DEBUG");
        this.apply(console, arguments)
    }
}.bind(console.log);


function addToLog(datetime, message, level) {
    currentLogs.push({
        datetime: datetime,
        message: message,
        level: level
    });

    var logCount = getLogCount();

    if (currentLogs.length > logCount)
        currentLogs.splice(0, currentLogs.length - logCount);

    Homey.manager('settings').set('currentLogs', currentLogs);
}

function getLogCount() {
    var logCount = parseInt(Homey.manager('settings').get('log_message_count'));
    if (!logCount)
        logCount = DEFAULTS.LOG_COUNT_SETTING;
    return logCount;
}

function loadLog() {
    var currentLogs = Homey.manager('settings').get('currentLogs');
    if (!currentLogs)
        currentLogs = [];
    return currentLogs;
}

function join(args) {
    var toReturn = [];

    args.forEach(function (arg) {
        var builder = [];
        if (arg instanceof Object) {
            for (var key in arg) {
                if(arg.hasOwnProperty(key)) {
                    builder.push(key + "=" + arg[key])
                }
            }
        }
        else {
            builder.push(arg)
        }

        toReturn.push(builder.join(", "))
    });

    return toReturn.join(" ");
}

console.debug = console.log;
