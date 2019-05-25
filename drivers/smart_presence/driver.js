"use strict";

var PresenceDetector = require("./presence_detector.js");

var detector = new PresenceDetector(module);

// the `init` method is called when your driver is loaded for the first time
module.exports.init = function(devices_data, callback) {
  console.info("Booting Smart Presence");
  devices_data.forEach(function(device_data) {
    detector.registerDevice(device_data);
  });

  detector.startDetection();

  callback();
};

// the `added` method is called is when pairing is done and a device has been added
module.exports.added = function(device_data, callback) {
  console.info("Adding device " + device_data.id);
  detector.registerDevice(device_data);
  detector.startDetection();
  callback(null, true);
};

// the `delete` method is called when a device has been deleted by a user
module.exports.deleted = function(device_data, callback) {
  console.info("Deleting device " + device_data.id);
  detector.unregisterDevice(device_data);
  callback(null, true);
};

// the `pair` method is called when a user start pairing
module.exports.pair = function(socket) {
  console.info("Pairing started");
  socket.on("configure_ip", function(data, callback) {
    detector.pair(data, function(deviceIsDetected) {
      callback(null, data);
    });
  });
};

module.exports.renamed = function(device_data, new_name) {
  module.exports.getSettings(device_data, function(err, _settings) {
    _settings.name = new_name;
    module.exports.setSettings(device_data, _settings);
  });
};

module.exports.capabilities = {
  alarm_is_home: {
    get: function(data, callback) {
      console.info("get state");
      console.info(data);
      // send the state value to Homey
      callback(null, false);
    }
  }
};

Homey.manager("flow").on("condition.someone_at_home", function(callback, args) {
  callback(null, detector.getPersonsPresent().length > 0);
});

Homey.manager("flow").on("condition.having_guests", function(callback, args) {
  callback(null, detector.getGuestsPresent().length > 0);
});

Homey.manager("flow").on("condition.a_household_member_is_home", function(
  callback,
  args
) {
  callback(null, detector.getHouseHoldMembersPresent().length > 0);
});

Homey.manager("flow").on("condition.a_household_member_is_home", function(
  callback,
  args
) {
  callback(null, detector.getHouseHoldMembersPresent().length > 0);
});

Homey.manager("flow").on("condition.user_at_home", function(callback, args) {
  callback(null, detector.isDeviceIDPresent(args.device.id));
});
