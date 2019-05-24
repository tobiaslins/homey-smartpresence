var Device = require("./device.js");
var Executor = require("./executor.js");

/**
 * Name of the Stress operation mode, scanning according to configuration.
 * @param   device    {Device}
 * @return {string}
 */
function STRESS_MODE_JOB_NAME(device) {
    return "STRESS_MODE_SCAN_"+device.getName();
}

/**
 * Name of the Normal operation mode, scanning according to configuration.
 * @type {string}
 */
var NORMAL_MODE_JOB_NAME = "NORMAL_MODE_SCAN";

/**
 * Name of the Load device job, scanning according to configuration.
 * @param   device    {Device}
 * @returns {string}
 */
function LOAD_DEVICE_JOB_NAME(device) {
    return "RELOAD_DEVICE_"+device.getName();
}

function PresenceDetector(driver) {
    this.className = "PresenceDetector";
    this.running = false;
    this.devices = [];
    this.driver = driver;
    this.executor = new Executor();
    this.runEveryMillis = 1500;     // TODO: FROM CONFIG
    this.stressEveryMillis = 500;   // TODO: FROM CONFIG
    this.lastDeviceReload = new Date().getTime();
    this.reloadDeviceSettingsEveryMillis = 60000;
}

PresenceDetector.prototype.pair = function(device_data, callback) {
    var device = new Device(this.driver, device_data);
    device.scan(callback)
};

/**
 * Registers a new device to the presence detector.
 * @param device_data       The device data as supplied by homey.
 */
PresenceDetector.prototype.registerDevice = function (device_data) {
    this.devices.push(new Device(this.driver, device_data));
};

/**
 * Unregister a device.
 * @param device_data       The device data as supplied by homey.
 */
PresenceDetector.prototype.unregisterDevice = function (device_data) {
    this.devices = this.devices.filter(function(device) {
        return device.getDeviceID() !== device_data.id
    })
};

/**
 * Starts presence detection.
 */
PresenceDetector.prototype.startDetection = function () {
    if(!this.running) {
        console.info("PresenceDetector: Starting detection on", this.devices.length, "devices.");
        this.running = true;
        this.scheduleNextScan();
        this.executor.start();
    }
};

/**
 * Stops presence detection.
 */
PresenceDetector.prototype.stopDetection = function () {
    console.info("PresenceDetector: Stopping detection on", this.devices.length, "devices.");
    this.running = false;
};

/**
 * Schedules the next scan for all devices.
 */
PresenceDetector.prototype.scheduleNextScan = function() {
    if(!this.executor.hasJobScheduled(NORMAL_MODE_JOB_NAME)) {
        var normalJob = function() { this.detectPresence(this.devices) }.bind(this);
        this.executor.schedule(normalJob, this.getNextRunTime(), NORMAL_MODE_JOB_NAME);
    }

    var inStressMode = function (device) { return device.shouldStressCheck(); };

    this.devices.filter(inStressMode).map(this.scheduleStressCheck.bind(this));
};

/**
 * Starts a stress scan for a device.
 * @param device {Device}
 */
PresenceDetector.prototype.scheduleStressCheck = function(device) {
    if(!this.executor.hasJobScheduled(STRESS_MODE_JOB_NAME(device))) {
        var stressJob = function () {
            this.detectPresence([device])
        }.bind(this);
        this.executor.schedule(stressJob, this.getStressCheckRunTime(), STRESS_MODE_JOB_NAME(device));
    }
};

/**
 * When a scan of all devices completes, then this function is called. It will reload device settings every once in a while.
 * It will also schedule the scan of all devices.
 */
PresenceDetector.prototype.onScanFinished = function(){
    if(this.running) {
        this.reloadDevices();
        this.scheduleNextScan();
    }
    else {
        console.info("PresenceDetector: Stopped.");
    }
};

/**
 * Every x time, the device settings are reloaded. This is done by job registered in the {executor}.
 */
PresenceDetector.prototype.reloadDevices = function() {
    var now = new Date().getTime();
    if(this.lastDeviceReload + this.reloadDeviceSettingsEveryMillis < now) {
        this.devices.forEach(function(device) {
            if(!this.executor.hasJobScheduled(LOAD_DEVICE_JOB_NAME(device))) {
                this.executor.schedule(function () {
                    device.loadSettings();
                }, now, LOAD_DEVICE_JOB_NAME(device));
            }
        }.bind(this));
        this.lastDeviceReload = new Date().getTime();
    }
};

/**
 * The actual logic that allows us to detect the presence of devices.
 */
PresenceDetector.prototype.detectPresence = function (devices) {
    if(devices.length === 0) {
        console.warn("PresenceDetector: Not running cause there are no devices.");
        console.info("PresenceDetector: Please create a 'Smart Presence' device in the 'Devices' tab.");
        this.stopDetection();
        return;
    }

    var loadedDevices = devices.map(function(device) { return device.isLoaded() });

    if(loadedDevices.length === 0) {
        console.warn("There are device configurations present, but they are unloaded yet. Rescheduling the next run. If this warning recurs it may indicate a problem.")
        this.scheduleNextScan();
    }
    else {
        var presenceDataBeforeScan =  {
            personsPresent:this.getPersonsPresent(),
            guestsPresent: this.getGuestsPresent(),
            houseHoldMembersPresent:this.getHouseHoldMembersPresent()
        };

        var startWith = devices[0];
        var thenDoOther = devices.filter(function(device) {
            return startWith !== device;
        });

        this.detectRecursive(startWith, thenDoOther, presenceDataBeforeScan)
    }
};

/**
 * @param device    A device from device.js
 * @param toHandle  The devices that still need handling
 * @param presenceDataBeforeScan    The presence data about persons, guests and household members before the scan started.
 */
PresenceDetector.prototype.detectRecursive = function(device, toHandle, presenceDataBeforeScan) {
    if(device && device.scan) {
        device.scan(this.callbackScan(toHandle, presenceDataBeforeScan).bind(this));
    } else {
        console.error("Should have a device.scan, looks like a programming error.");
    }
};


/**
 * Handles a callback result for a single device. If there are more devices to check, then it will check those recursively.
 * If there are no more devices to do, we are done scanning and we trigger the appropriate flows and callback to {onScanFinished},
 * which will schedule the next scan with the {executor}.
 * @param toHandle                  Next devices to handle.
 * @param presenceDataBeforeScan    The presence data about persons, guests and household members before the scan started.
 * @returns {Function}
 */
PresenceDetector.prototype.callbackScan = function(toHandle, presenceDataBeforeScan) {
    return function() {
        if (toHandle.length > 0) {
            var next = toHandle[0];
            var thenDoOther = toHandle.slice(1, toHandle.length);
            this.detectRecursive(next, thenDoOther, presenceDataBeforeScan);
        }
        else {
            this.triggerArrivalFlows(
                presenceDataBeforeScan.personsPresent,
                presenceDataBeforeScan.guestsPresent,
                presenceDataBeforeScan.houseHoldMembersPresent
            );

            this.triggerDepartureFlows(
                presenceDataBeforeScan.personsPresent,
                presenceDataBeforeScan.guestsPresent,
                presenceDataBeforeScan.houseHoldMembersPresent
            );

            this.onScanFinished();
        }
    };
};

/**
 * A function for handling the homey trigger result callback, no plans with this yet.
 * @param err
 * @param result
 */
PresenceDetector.prototype.handleTriggerResult = function (err, result) {
    if (err)
        return console.error(err);
};

/**
 * Executes all App-related triggers regarding people leaving.
 * @param personsPresentBefore              {Array}
 * @param guestsPresentBefore               {Array}
 * @param houseHoldMembersPresentBefore     {Array}
 */
PresenceDetector.prototype.triggerDepartureFlows = function(personsPresentBefore, guestsPresentBefore, houseHoldMembersPresentBefore) {
    var personsPresentNow = this.getPersonsPresent();
    if (personsPresentBefore.length > 0 && personsPresentNow.length === 0) {
        personsPresentBefore[0].logDeviceMessage("Last person left.");
        Homey.manager('flow').trigger('last_person_left', personsPresentBefore[0].getFlowCardTokens(), this.handleTriggerResult);
    }

    var guestsPresentNow = this.getGuestsPresent();
    if (guestsPresentBefore.length > 0 && guestsPresentNow.length === 0) {
        guestsPresentBefore[0].logDeviceMessage("Last guest left.");
        Homey.manager('flow').trigger('last_guest_left', guestsPresentBefore[0].getFlowCardTokens(), this.handleTriggerResult);
    }

    var houseHoldMembersPresentNow = this.getHouseHoldMembersPresent();
    if (houseHoldMembersPresentBefore.length > 0 && houseHoldMembersPresentNow.length === 0) {
        houseHoldMembersPresentBefore[0].logDeviceMessage("Last household member left.");
        Homey.manager('flow').trigger('last_household_member_left', houseHoldMembersPresentBefore[0].getFlowCardTokens(), this.handleTriggerResult);
    }
};

/**
 * Executes all App-related triggers regarding the arrival of people.
 * @param personsPresentBefore              {Array}
 * @param guestsPresentBefore               {Array}
 * @param houseHoldMembersPresentBefore     {Array}
 */
PresenceDetector.prototype.triggerArrivalFlows = function (personsPresentBefore, guestsPresentBefore, houseHoldMembersPresentBefore) {
    var personsPresentNow = this.getPersonsPresent();

    if (personsPresentBefore.length === 0 && personsPresentNow.length > 0) {
        personsPresentNow[0].logDeviceMessage("First person arrived.");
        Homey.manager('flow').trigger('first_person_entered', personsPresentNow[0].getFlowCardTokens(), this.handleTriggerResult);
    }

    var guestsPresentNow = this.getGuestsPresent();
    if (guestsPresentBefore.length === 0 && guestsPresentNow.length > 0) {
        guestsPresentNow[0].logDeviceMessage("First guest arrived.");
        Homey.manager('flow').trigger('first_guest_arrived', guestsPresentNow[0].getFlowCardTokens(), this.handleTriggerResult);
    }

    var houseHoldMembersPresentNow = this.getHouseHoldMembersPresent();
    if (houseHoldMembersPresentBefore.length === 0 && houseHoldMembersPresentNow.length > 0) {
        houseHoldMembersPresentNow[0].logDeviceMessage("First household member arrived.");
        Homey.manager('flow').trigger('first_household_member_arrived', houseHoldMembersPresentNow[0].getFlowCardTokens(), this.handleTriggerResult);
    }
};

/**
 * Finds a device by id. undefined if not found.
 * @param id
 * @returns {Device}
 */
PresenceDetector.prototype.getDeviceByID = function(id) {
    return this.devices.filter(function(device){
        return device.getDeviceID() === id;
    })[0];
};

/**
 * Checks if someone is at home given the current state of the PresenceDetector.
 * @returns {Array}
 */
PresenceDetector.prototype.getPersonsPresent = function () {
    var present = [];
    for (var key in this.devices) {
        if (this.devices.hasOwnProperty(key) && this.devices[key].isPresent()) {
            present.push(this.devices[key])
        }
    }
    return present;
};

/**
 * Checks if there is a household member home given the current state of the PresenceDetector.
 * @returns {Array}
 */
PresenceDetector.prototype.getHouseHoldMembersPresent = function () {
    var present = [];
    for (var key in this.devices) {
        if (this.devices.hasOwnProperty(key) && this.devices[key].isPresent() && this.devices[key].isHouseHoldMember()) {
            present.push(this.devices[key])
        }
    }
    return present;
};

/**
 * Checks if there is a guest present in the current stat of the PresenceDetector.
 * @returns {Array}
 */
PresenceDetector.prototype.getGuestsPresent = function () {
    var present = [];
    for (var key in this.devices) {
        if (this.devices.hasOwnProperty(key) && this.devices[key].isPresent() && this.devices[key].isGuest()) {
            present.push(this.devices[key])
        }
    }
    return present;
};

PresenceDetector.prototype.isDeviceIDPresent = function(id) {
    return this.getDeviceByID(id).isPresent();
};

/**
 * Decides the next runtime.
 * @returns {number}
 */
PresenceDetector.prototype.getNextRunTime = function() {
    return new Date().getTime() + this.runEveryMillis;
};


/**
 * Decides the next runtime.
 * @returns {number}
 */
PresenceDetector.prototype.getStressCheckRunTime = function() {
    return new Date().getTime() + this.stressEveryMillis;
};


module.exports = PresenceDetector;