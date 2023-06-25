# Aqara & Xiaomi Mi Smart Home (Zigbee)

### This app requires Homey SW release 3.0.0 or higher

This app adds support for the Zigbee Smart Home devices made by [Aqara](https://www.aqara.com/) and [Xiaomi](https://xiaomi-mi.com/).  
<a href="https://github.com/TedTolboom/com.xiaomi-mi-zigbee">
  <img src="https://raw.githubusercontent.com/TedTolboom/com.xiaomi-mi-zigbee/master/assets/images/small.png">
</a>  

## Links:
[Aqara & Xiaomi Zigbee app Athom apps](https://homey.app/en-gb/app/com.xiaomi-mi/)                    
[Aqara & Xiaomi Zigbee app Github repository](https://github.com/TedTolboom/com.xiaomi-mi-zigbee)   

## Supported devices (supported capabilities)
### Xiaomi devices   
* Door/Window sensor (MCCGQ01LM) (contact alarm)
* Occupancy Sensor (RTCGQ01LM)(motion alarm)
* Wireless switch (WXKG01LM) (1x - 4x click, Key Held, Key released)  
* Temperature/Humidity Sensor (WSDCGQ01LM) (temperature, relative humidity, battery level)
* Smart socket plug ZigBee edition (ZNCZ02LM)] (onoff, measure_power, meter_power, measure_voltage)
* Xiaomi Smart plug (EU) (ZNCZ04LM)] (onoff, measure_power, meter_power)   
* Xiaomi Light Sensor (GZCGQ01LM) (measure_luminance, measure_batery)

### Aqara devices   
* [Aqara Curtain Controller (Zigbee) (ZNCLDJ11LM)](https://www.aqara.com/en/curtain_controller-product.html) (open, close, idle, setpoint (100% = open, 0% = closed))
* [Aqara B1 Curtain Controller (Zigbee) (ZNCLDJ12LM)](https://www.aqara.com/en/curtain_controller-product.html) (open, close, idle, setpoint (100% = open, 0% = closed), measure_batery)     
* [Aqara Door and Window Sensor (MCCGQ11LM)](https://www.aqara.com/en/door_and_window_sensor-product.html) (contact alarm, battery level )
* [Aqara Motion Sensor (RTCGQ11LM)](https://www.aqara.com/en/motion_sensor.html) (motion alarm, luminance, battery level)
* [Aqara Temperature and Humidity Sensor (WSDCGQ11LM)](https://www.aqara.com/en/temperature_and_humidity_sensor-product.html) (temperature, relative humidity, atmospheric pressure, battery level)
* [Aqara Cube Controller (MFKZQ01LM)](https://www.aqara.com/en/cube_controller-product.html) (Slide, Shake, Double Tap, Rotate (angle, relative angle), Flip 90°, Flip 180°, battery level), see [device readme for details](https://github.com/TedTolboom/com.xiaomi-mi-zigbee/blob/master/docs/README_cube.md)
* [Aqara Smart Light Wall Switch (L) Single (QBKG04LM)](https://www.aqara.com/en/ctrl-neutral.html) / [Double (QBKG03LM)](https://www.aqara.com/en/ctrl-neutral.html) (onoff)
* [Aqara Smart Light Wall Switch (LN) Single (QBKG11LM)](https://www.aqara.com/en/ctrl-neutral.html) / [Double (QBKG12LM)](https://www.aqara.com/en/ctrl-neutral.html) (onoff, measure_power, meter_power, measure_voltage)
* [Aqara Wall Outlet (Zigbee) (QBCZ11LM)](https://www.aqara.com/en/wall_outlet-product.html) (onoff, measure_power, meter_power, measure_voltage)
* [Aqara Wireless switch with Gyro (WXKG12LM)](https://www.aqara.com/en/wireless_mini_switch.html) (1x, 2x click, key held, key released, Shaken, battery level)
* [Aqara Vibration Sensor (DJT11LM)](https://www.aqara.com/en/vibration_sensor-product.html) (tilt-, vibration-, drop-motion, tilt angles (to reference plane), tilt angles (to previous position), vibration strength, tilt-, vibration-, drop-alarm, battery level)      
* [Aqara Tunable LED Bulb (ZNLDP12LM)](https://www.aqara.com/cn/led_light.html) (onoff, dim, light_temperature)     
* [Aqara Double Relay (LLKZMK11LM)](https://www.aqara.com/) (onoff, measure_power)   
* [Aqara Smart EU plug (SP-EUC01)](https://www.aqara.com/) (onoff, measure_power, meter_power)   

  **Note:**   
  The following devices are sold under the same model number (e.g. WXKG11LM), but have different capabilities.
  From the outside (device and packaging) it is not possible to distinguish the devices with or without these capabilities; only after including them to a controller. Check the forum topic for experiences with sellers before purchasing these devices:   

* [Aqara Wireless switch (WXKG11LM, productID `sensor_switch.aq2`)](https://www.aqara.com/en/wireless_mini_switch.html) (1x - 4x click, battery level)   
* [Aqara Wireless Mini Switch (2018) (WXKG11LM, productID `remote.b1acn01`)](https://www.aqara.com/en/wireless_mini_switch.html) (1x, 2x click, key held, key released, battery level)   
* [Aqara Wireless Remote Switch Single (WXKG03LM, productID `sensor_86sw1lu`)](https://www.aqara.com/en/86plug.html) / [Double (WXKG02LM, productID `sensor_86sw2Un`)](https://www.aqara.com/en/86plug.html) (1x click for each button and combined)     
* [Aqara Wireless Switch Single (2018) (WXKG03LM, productID `remote.b186acn01`)](https://www.aqara.com/en/86plug.html) / [Double (2018) (WXKG02LM, productID `remote.b286acn01`)](https://www.aqara.com/en/86plug.html) (1x, 2x click, long press for each button and combined)   

## Devices Work in Progress (awaiting additional clusters in Homey's Zigbee implementation)
* MiJia Honeywell Smoke Detector White
* MiJia Honeywell Gas Leak Detector
* MiJia Aqara Water sensor

## Supported Languages:
* English
* German
* Dutch

## Acknowledgements:
This app and driver development has been supported by:  
* Sprut666666   
* Kasteleman   
* BasKiers
* RobinBolscher

## Feedback:
Any requests please post them in the [Aqara & Xiaomi Zigbee topic on the Athom Community forum](https://community.athom.com/t/156/) or contact me on [Slack](https://athomcommunity.slack.com/team/tedtolboom)    
Please report issues at the [issues section on Github](https://github.com/TedTolboom/com.xiaomi-mi-zigbee/issues) otherwise in the above mentioned topic.     

## Change Log:

### v 0.8.0
* Add support for [Aqara Smart EU plug (SP-EUC01)](https://www.aqara.com/) (onoff, measure_power, meter_power)   
* Xiaomi Smart plug (EU) (ZNCZ04LM)] (onoff, measure_power, meter_power)   
* Xiaomi Light Sensor (GZCGQ01LM) (measure_luminance, measure_batery)
* Add humidity and pressure offset settings for the [Aqara Temperature and Humidity Sensor (WSDCGQ11LM)](https://www.aqara.com/en/temperature_and_humidity_sensor-product.html) and Temperature/Humidity Sensor (WSDCGQ01LM)
* Add reverse contact alarm logic for [Aqara Door and Window Sensor (MCCGQ11LM)](https://www.aqara.com/en/door_and_window_sensor-product.html) and Door/Window sensor (MCCGQ01LM)

### v 0.7.1
* Fix issue with Aqara Cube trigger cards not showing argument fields   

### v 0.7.0
* Add support for the [Aqara B1 Curtain Controller (Zigbee) (ZNCLDJ12LM)](https://www.aqara.com/en/curtain_controller-product.html) (open, close, idle, setpoint (100% = open, 0% = closed), measure_batery)   
* Update app branding since more Aqara (then Xiaomi-Mi) devices are supported   
* Update of app to become compatible with new app store   
* Made app compatible with Homey SW > 3.0.0 (removing Homey Sw 1.x mobile definition)   
* Re-structured the app using `.homeycompose`     
* Update Homey meshdriver to v1.3.21   

### v 0.6.2
* Fix issues where the lifeline temperature sensor reporting      
* Update Homey meshdriver to v1.3.9   

### v 0.6.1
* Fix issue showing flow card conditions and triggers for Aqara Relay device   
* Fix issues where the lifeline reportParser is causing a crash of the app   
* Update Homey meshdriver to v1.3.7      

### v 0.6.0
* Add support for [Aqara Double Relay (LLKZMK11LM)](https://www.aqara.com/)   
* Add insights logging for Aqara Vibration sensor (all alarms and tilt angle) and Cube (rotation angle)   
* Prepare app and drivers for 'Energy' (Homey 3.0.0)
* Update Homey meshdriver to v1.3.6      

### v 0.5.5
* Fix issue that prevented to include some devices ending in `status.invalid_setting_type`    

### v 0.5.4
* Add German language support, thanks to the contribution of Sebastian Spoerer    
* Update Homey meshdriver to v1.2.32   

### v 0.5.3
* Add support for the [Aqara Tunable LED Bulb (ZNLDP12LM)](https://www.aqara.com/cn/led_light.html)    

### v 0.5.2
* Fix issue where motion alarm would be cancelled before the finalizing the motion alarm reset duration    

### v 0.5.1
* Fix issues where incorrect data is reported by the Xiaom and Aqara Temperature and Humidity Sensors [#125](https://github.com/TedTolboom/com.xiaomi-mi-zigbee/issues/125)   

### v 0.5.0
* Enabled Xiaomi lifeline reporting (device dependent interval), adding the following functions:
  - Battery reporting (measurement + alarm) enabled for multiple devices (see device - capability overview)   
  - Additional state / capability reporting (e.g. curtain position for `Aqara Curtain controller` or onoff state for the `Aqara wall switch`)   
  - Updated App dependency updated to Homey SW >= 1.5.13   
* Updated app to fully utilize Homey SW v2.0.0 options:
  - Fix issue where custom icons are not shown   
  - Add brandColor definition to match Xiaomi brand    
* Added `measure_power`, `meter_power` and `measure_voltage` capabilities to the `Aqara Wall Switch Single (LN)` and `Aqara Wall Switch Double (LN)`. **Note:** Re-inclusion is required to add these capabilities
* Added fixed polling interval (10 minutes) for `meter_power` and `measure_voltage` capabilities for `Aqara Smart socket plug`, `Aqara Smart Socket`, `Aqara Wall Switch Single (LN)` and `Aqara Wall Switch Double (LN)`
* Cleaned up device driver logging (moved some logging to the debug-logging mode)
* Updated readme device overview to show added capabilities and link towards the device info at the [official Aqara site](https://www.aqara.com/en/home.html)
* Update Homey meshdriver to v1.2.30
