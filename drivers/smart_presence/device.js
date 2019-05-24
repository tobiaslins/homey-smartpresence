var Network = require("./network.js");

var UNLOADED_SETTINGS = {error: "unloaded"};

function Device(driver, device_data) {
    this.className = "Device";
    this.driver = driver;
    this.device_data = device_data;
    this.present = false;
    // this.driver.exports.setUnavailable(this.device_data, "Away");
    this.settings = UNLOADED_SETTINGS;
    this.last_seen_at = new Date().getTime();

    this.loadSettings(function() {
        console.log(this.getName(), ": Loaded device with settings", this.settings, "for", this.device_data);
        if(this.settings == null || !this.settings.hasOwnProperty('away_delay')){
            console.error('Could not retrieve away delay from settings');
        }else{
            this.last_seen_at = new Date().getTime() - (this.settings.away_delay * 1001);
        }
    }.bind(this));
}

Device.prototype.isLoaded = function() {
    return this.settings !== UNLOADED_SETTINGS;
};

Device.prototype.loadSettings = function(callback) {
    this.getSettingsFromHomey(function (err, settings) {
        this.settings = settings;
        if(callback) {
            callback()
        }
    }.bind(this));
};

Device.prototype.scan = function (callback) {
    var network = new Network(this.driver);
    function isOnline() {
        delete network;
        this.setPresent(true);
        callback(true)
    }

    function isOffline() {
        delete network;
        this.setPresent(false);
        callback(false)
    }

    var timeout = this.getHostTimeoutInMillis();
    if(this.shouldStressCheck()) {
        timeout = this.getStressHostTimeoutInMillis();
    }

    network.scan(this, isOnline.bind(this), isOffline.bind(this), timeout);
};

Device.prototype.handleTriggerResult = function (err, result) {
    if (err)
        return console.error(err);
};

/**
 * Sets that the device is present.
 */
Device.prototype.setPresent = function (present) {
    this.logReachableLogMessage(present);

    if(present) {
        var now = new Date().getTime();
        this.last_seen_at = now;
    }

    if (!present && this.present && !this.shouldDelayAwayStateSwitch(present)) {
        this.present = false;
        this.logDeviceMessage("Left.");

        Homey.manager('flow').triggerDevice('user_left', this.getFlowCardTokens(), {}, this.device_data, function (err, result) {
                if (err) return console.error(err);
            }
        );

        Homey.manager('flow').trigger('someone_left', this.getFlowCardTokens(), this.handleTriggerResult);
        // this.driver.exports.setUnavailable(this.device_data, "Away"); // Commented out cuase this collides with the user specific condition

        if(this.isGuest()) {
            Homey.manager('flow').trigger('guest_left', this.getFlowCardTokens(), this.handleTriggerResult);
        }

        if(this.isHouseHoldMember()) {
            Homey.manager('flow').trigger('household_member_left', this.getFlowCardTokens(), this.handleTriggerResult);
        }
    }
    else if (present && !this.present) {
        this.present = true;
        this.logDeviceMessage("Arrived.");

        Homey.manager('flow').triggerDevice('user_entered', this.getFlowCardTokens(), {}, this.device_data, function (err, result) {
                if (err) return console.error(err);
            }
        );

        Homey.manager('flow').trigger('someone_entered', this.getFlowCardTokens(), this.handleTriggerResult);
        this.driver.exports.setAvailable(this.device_data);

        if(this.isGuest()) {
            Homey.manager('flow').trigger('guest_arrived', this.getFlowCardTokens(), this.handleTriggerResult);
        }

        if(this.isHouseHoldMember()) {
            Homey.manager('flow').trigger('household_member_arrived', this.getFlowCardTokens(), this.handleTriggerResult);
        }
    }
};

Device.prototype.logReachableLogMessage = function(present) {
    // Store the last scan result as well so we can show logging if a state changes
    if(!this.last_present && present) {
        this.last_present = true;
        this.logDeviceMessage("Found device.")
    }
    else if(this.last_present && !present) {
        this.last_present = false;
        this.logDeviceMessage("Can't find device, counting down away delay.")
    }
};

Device.prototype.shouldDelayAwayStateSwitch = function() {
    return this.seenMillisAgo() < this.getAwayDelayInMillis();
};

/**
 * Returns the milliseconds ago that the device was last seen.
 * example return: 100 -> the device was seen 100 millis ago.
 * @returns {number}
 */
Device.prototype.seenMillisAgo = function() {
    var seenAgo = (new Date().getTime() - this.last_seen_at);
    // this.logDeviceMessage("Device is seen " + seenAgo + " millis ago");
    return seenAgo;
};

/**
 * Returns true if the device has {getStressAtInMillis} seconds left till it's marked away to due an absent status.
 * @returns {boolean}
 */
Device.prototype.shouldStressCheck = function() {
    var now = new Date().getTime();
    var predicate = this.present && (this.getAwayDelayInMillis() - (now - this.last_seen_at)) < this.getStressAtInMillis();

    if(!this.is_stressing && predicate) {
        this.is_stressing = true;
        this.logDeviceMessage("Start stressing")
    }
    else if(this.is_stressing && !predicate) {
        this.is_stressing = false;
        this.logDeviceMessage("Stop stressing")
    }

    return predicate;
};

/**
 * Returns true if the device is present, returns false otherwise.
 * @returns {boolean}
 */
Device.prototype.isPresent = function () {
    return this.present;
};

/**
 * Gets the device ID
 * @returns {string}
 */
Device.prototype.getDeviceID = function() {
    return this.device_data.id;
};

Device.prototype.getSettingsFromHomey = function(callback) {
    this.driver.exports.getSettings(this.device_data, callback);
};

/**
 * Returns the stored settings for this Device.
 * @returns {Object}
 */
Device.prototype.getSettings = function () {
    return this.settings;
};

Device.prototype.logDeviceMessage = function(message) {
    console.info(this.getName(), ":", message)
};

/**
 * Returns the host on which the device is active if it's nearby.
 * @returns {*|string|string}
 */
Device.prototype.getHost = function () {
    return this.getSettings().host;
};

/**
 * Returns the away delay in millis.
 * @returns {number}
 */
Device.prototype.getAwayDelayInMillis = function () {
    var settings = this.getSettings();
    if(settings) {
        return parseInt(settings.away_delay) * 1000;
    }
    else {
        var defaultAwayDelay = 900 * 1000;
        console.log("Using a default of ", defaultAwayDelay, "millis for 'away_delay', as the settings are not loaded yet.");
        return defaultAwayDelay;
    }
};


/**
 * When should we start stressing for a host? The setting is in millis.
 * The value represents a time which we must start stressing before a device is marked away.
 * @returns {number}
 */
Device.prototype.getStressAtInMillis = function () {
    var settings = this.getSettings();
    if(settings) {
        return parseInt(settings.start_stressing_at) * 1000;
    }
    else {
        var defaultStress = 0;
        console.log("Using a default of ", defaultStress, "millis for 'start_stressing_at', as the settings are not loaded yet.");
        return defaultStress;
    }
};


Device.prototype.getHostTimeoutInMillis = function () {
    var settings = this.getSettings();
    if(settings) {
        return parseInt(settings.host_timeout) * 1000;
    }
    else {
        var defaultHostTimeout = 2000;
        console.log("Using a default of ", defaultHostTimeout, "millis for 'host_timeout', as the settings are not loaded yet.");
        return defaultHostTimeout;
    }
};


Device.prototype.getStressHostTimeoutInMillis = function () {
    var settings = this.getSettings();
    if(settings) {
        return parseInt(settings.stress_host_timeout) * 1000;
    }
    else {
        var defaultHostTimeout = 2000;
        console.log("Using a default of ", defaultHostTimeout, "millis for 'stress_host_timeout', as the settings are not loaded yet.");
        return defaultHostTimeout;
    }
};

/**
 * Gets the name of the device in Homey (which is most likely the name of a person).
 */
Device.prototype.getName = function() {
    var settings = this.getSettings();
    if(settings) {
        return this.getSettings().name
    } else {
        return this.getDeviceID();
    }
};

/**
 * Get the flow card tokens (Homey tags) for this device.
 * @returns {{who}}
 */
Device.prototype.getFlowCardTokens = function() {
    return { "who" : this.getName() };
};

/**
 * Returns true if this is a household member device.
 * @returns {boolean}
 */
Device.prototype.isHouseHoldMember = function () {
    return this.settings.is_guest === false;
};

/**
 * Returns true if this is a guest device.
 * @returns {boolean}
 */
Device.prototype.isGuest = function () {
    return this.settings.is_guest === true;
};

module.exports = Device;