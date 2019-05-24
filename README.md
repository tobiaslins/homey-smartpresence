# Smart Presence

Detects the presence of humans by their smartphones. The app works on detecting closed TCP ports of smart phones on your Wifi networks. This means it functions without installing the Homey app, allowing you to detect guests as well.

The app does NOT support MAC-addresses, cause of limitations in Homey.

If you like this app, consider showing your support:

<form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top">
<input type="hidden" name="cmd" value="_s-xclick" />
<input type="hidden" name="hosted_button_id" value="VENTP7VXTLRNW" />
<input type="image" src="https://www.paypal.com/en_US/i/btn/btn_donate_LG.gif" border="0" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Donate" />
<img alt="" border="0" src="https://www.paypal.com/en_US/i/scr/pixel.gif" width="1" height="1" />
</form>

## Adding device

For adding a device, please follow the following steps:

1. Give guest your wifi password.
2. Check the IP address off the smartphone. Most router user interfaces support this.
3. Make a DHCP reservation for the IP address, this makes sure that the device will get the same address every time. Again: most routers support DHCP reservations in their user interface.
4. Enter the IP address of the smartphone
5. Check 'Is Guest' if the smartphone does belong to a house guest. Don't check it if the smartphone belongs to a household member.

## Triggers

* Specific user left
* Specific user arrived
* Someone came home
* Someone left home
* First person came home
* Last person left home 
* A guest arrived
* A guest left
* The first guest arrived
* The last guest left
* A household member came home
* A household member left home
* The first household member came home
* The last household member left home

## Conditions

* Someone is home
* Someone left home
* Having guests
* Not having guests
* Household members home
* No household members home

## Upcoming features
* Drop the usage of devices (probably 0.5.0)
* Anonymous presence (with the help of your other sensors, probably 0.5.0)
* Room presence detection (with the help of your other sensors, probably 0.5.0)
* Feature requests can be posted on [BitBucket.org](https://bitbucket.org/terryhendrix/homey-smartpresence/issues?status=new&status=open)

## Release history

### 0.5.0
* Workaround for V2

### 0.4.1
* Fixed a bug introduced in 0.4.0

### 0.4.0
* Added person specific triggers and conditions.
* Dropped the "OFFLINE" status from devices that are not present, this collided with person specific conditions.

### 0.3.0
* Refactored the entire app to use less of homey's hardware.
* Add better explanation when adding a device.

### 0.2.7
* When a host was on the network, but isn't there for a quarter of the away delay. The host will be checked stressful, hoping this will fix issues with battery saving phone configurations. When the host is found again, it will use the configured host check interval. Results with LG G4 seem promising.

### 0.2.6
* Bugfix.

### 0.2.5
* Rollback experimental changes. Re-added host interval and host timeout settings.
* Fixed 2 typo's.
* Add support for windows phone by allowing you to set the TCP port numbers that the app will scan on. A port from this list is chosen randomly every time the app scans for presence.

### 0.2.4
* Checkboxes in flow cards work.
* Changed compatiblity to 1.x.

### 0.2.3
* Experimental changes.


### 0.2.2
* Improved dutch translations
* Remove host interval and host timeout settings. It will always run with interval 1 and timeout 3.
* Fix 'log is undefined' exception.
* Changed "Offline" to "Away" when a device is away.

### 0.2.1
* Household member triggers & conditions.
* Add 'Away delay'. This is required because some smartphones disconnect from the Wifi. They reconnect once in a while. This setting allows you to specify how it should take before the smartphone gets the 'Away' status.
* Monkey proofing.

### 0.2.0
* Guests triggers & conditions.
* Adding 'is guest' to device config.

### 0.1.0
* Initial presence implementation, using the [Net Scan app](https://apps.athom.com/app/nl.terryhendrix.netscan).
* Someone / nobody triggers & conditions


## Related projects
If you're looking for a TCP port monitoring app, checkout my [Net Scan app](https://apps.athom.com/app/nl.terryhendrix.netscan). 

