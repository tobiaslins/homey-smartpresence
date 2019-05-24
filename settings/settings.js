var LOG_RELOAD_TIMER = null;

function DefaultSettings() {
    // If you change a variable here, then also change it in app.js
    this.LOG_COUNT_SETTING = 10;
    this.HOST_CHECK_INTERVAL_SETTING = 5;
    this.HOST_TIMEOUT_SETTING = 2;
    this.PORTS_SETTING = "1, 32000";
}

var DEFAULTS = new DefaultSettings();

function onHomeyReady() {
    reloadLog();
    loadLogMessageCount();
    loadHostCheckInterval();
    loadHostTimeout();
    loadPortNumbers();
    Homey.ready();
}

function stopLogReload() {
    if(LOG_RELOAD_TIMER) {
        clearTimeout(LOG_RELOAD_TIMER);
    }
}

function loadPortNumbers() {
    Homey.get("port_numbers", function (err, value) {
        if (value != null) {
            $("#settings_port_numbers").val(value);
        } else {
            $("#settings_port_numbers").val(DEFAULTS.PORTS_SETTING);
        }
    });
}

function loadHostTimeout() {
    Homey.get("host_timeout", function (err, value) {
        if (value != null) {
            $("#settings_host_timeout").val(value);
        } else {
            $("#settings_host_timeout").val(DEFAULTS.HOST_TIMEOUT_SETTING);
        }
    });
}

function loadLogMessageCount() {
    Homey.get("log_message_count", function (err, value) {
        if (value != null) {
            $("#settings_log_message_count").val(value);
        } else {
            $("#settings_log_message_count").val(DEFAULTS.LOG_COUNT_SETTING);
        }
    });
}

function loadHostCheckInterval() {
    Homey.get("host_check_interval", function (err, value) {
        if (value != null) {
            $("#settings_host_check_interval").val(value);
        } else {
            $("#settings_host_check_interval").val(DEFAULTS.HOST_CHECK_INTERVAL_SETTING);
        }
    });
}

function reloadLog() {
    Homey.get("currentLogs", function (err, value) {
        if (value && value.length > 1) {
            $('tr.logentry').remove();
            var buildingLog = "";
            $.each(value, function (index, obj) {
                var level = value[index]['level'];
                if (!level) level = "";
                var html =
                        "<tr class='logentry'><td class='datetime'>" +
                        value[index]['datetime'] +
                        "</td><td class='entry'>" +
                        level +
                        "</td><td class='entry'>" +
                        value[index]['message'] +
                        "</td></tr>";
                buildingLog += html;
            });

            $("table#logs").append(buildingLog);
        }
    });

    LOG_RELOAD_TIMER = setTimeout(reloadLog, 5000)
}

function isFloat(n) {
    return n === +n && n !== (n|0);
}

function isInteger(n) {
    return n === +n && n === (n|0);
}

function cleanPortNumbers(portNumbersDevidedByComma) {
    return portNumbersDevidedByComma.split(",").map(function(port) {
        return port.trim();
    }).join(",")
}

function readPortNumbers() {
    return cleanPortNumbers($("#settings_port_numbers").val());
}

function validatePortNumbers() {
    var errors = [];
    var portNumbers = readPortNumbers();
    console.log("Validating port "+portNumbers);
    if(!portNumbers) {
        errors.push("Invalid settings for port numbers. Should be TCP ports, seperated with a comma. Example: 1, 32000, 80")
    }
    else {
        portNumbers.split(",").map(function(cleanedPort) {
            console.log("Validating port "+cleanedPort);
            if(/^\d+$/.test(cleanedPort)) {
                try {
                    var port = parseInt(cleanedPort);
                    if(!(port >= 0 && port <= 65535)) {
                        errors.push(cleanedPort+" is not a valid port number. It should be a number between 0 and 65535.")
                    }

                    if(isFloat(parseFloat(cleanedPort))) {
                        errors.push(cleanedPort+" is not a valid port number. It should not be a floating point number.")
                    }

                    return port;
                }
                catch(ex) {
                    errors.push(cleanedPort+" is not a valid port number. It should be a number between 0 and 65535.")
                }
            }
            else {
                errors.push(cleanedPort+" is not a valid port number. It should be a whole number between 0 and 65535. Floating point numbers are not allowed.")
            }
        });
    }

    return errors;
}

function readLogMessageCount() {
    return $("#settings_log_message_count").val();
}

function validateLogMessageCount() {
    var errors = [];
    var count = readLogMessageCount();
    console.log("Validating log message count "+count);
    if (!(count && !isNaN(count) && count >= 5 && count <= 100)) {
        errors.push("Invalid setting for log message count: " + count + " rows. Should be between 5 and 100 rows.");
    }
    return errors;
}

function readHostCheckInterval() {
    return $("#settings_host_check_interval").val();
}

function validateHostCheckInterval() {
    var errors = [];
    var hostCheckInterval = readHostCheckInterval();
    console.log("Validating host check interval "+hostCheckInterval);
    if (!(hostCheckInterval && !isNaN(hostCheckInterval) && hostCheckInterval >= 1 && hostCheckInterval <= 15)) {
        errors.push("Invalid setting for host check interval: " + hostCheckInterval + " seconds. Should be between 1 and 15 seconds.")
    }
    return errors;
}

function readHostTimeout() {
    return $("#settings_host_timeout").val();
}

function validateHostTimeout() {
    var errors = [];
    var hostTimeout = readHostTimeout();
    console.log("Validating host timeout "+hostTimeout);
    if (!(hostTimeout && !isNaN(hostTimeout) && hostTimeout >= 1 && hostTimeout <= 15)) {
        errors.push("Invalid setting for host timeout: " + hostTimeout + " seconds. Should be between 1 and 15 seconds.")
    }
    return errors;
}

function save() {
    var $errorBox = $('.error-box');
    var $successBox = $('.success-box');
    $errorBox.text("");
    $successBox.text("");

    var errors = validateHostTimeout()
        .concat(validateHostCheckInterval())
        .concat(validateLogMessageCount())
        .concat(validatePortNumbers());

    if (errors.length > 0) {
        $errorBox.html(errors.map(function (err) {
            return "<span>" + err + "</span>";
        }).join("<br/>"))
    }
    else {
        Homey.set('log_message_count', readLogMessageCount());
        Homey.set('host_timeout', readHostTimeout());
        Homey.set('host_check_interval', readHostCheckInterval());
        Homey.set('port_numbers', readPortNumbers());

        $successBox.text("Saved changes");

        setTimeout(onHomeyReady, 300);

        setTimeout(function () {
            $successBox.text("");
        }, 2000);
    }
}