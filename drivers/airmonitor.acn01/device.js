// TODO: add configureAttributeReporting

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');

const util = require('../../lib/util');
const AqaraManufacturerSpecificCluster = require('../../lib/AqaraManufacturerSpecificCluster');

Cluster.addCluster(AqaraManufacturerSpecificCluster);

class AqaraAirQualityMonitor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // Enables debug logging in zigbee-clusters
    // debug(true);

    // enable debugging
    // this.enableDebug();

    // print the node's info to the console
    // this.printNode();

    // zclNode.endpoints[1].clusters[CLUSTER.BASIC.NAME]
    zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME]
      .on('attr.aqaraLifeline', this.onAqaraLifelineAttributeReport.bind(this));

    zclNode.endpoints[1].clusters[CLUSTER.TEMPERATURE_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onTemperatureMeasuredAttributeReport.bind(this, CLUSTER.TEMPERATURE_MEASUREMENT.NAME, 'measuredValue'));

    zclNode.endpoints[1].clusters[CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onRelativeHumidityMeasuredAttributeReport.bind(this, CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT.NAME, 'measuredValue'));

    zclNode.endpoints[1].clusters[CLUSTER.ANALOG_INPUT.NAME]
      .on('attr.presentValue', this.onVOCMeasuredAttributeReport.bind(this, CLUSTER.ANALOG_INPUT.NAME, 'presentValue'));

    if (this.isFirstInit()) {
      await this.configureAttributeReporting([{
        cluster: CLUSTER.ANALOG_INPUT,
        attributeName: 'presentValue',
        minInterval: 30,
        maxInterval: 10800,
        minChange: 20,
      },
      {
        cluster: CLUSTER.TEMPERATURE_MEASUREMENT,
        attributeName: 'measuredValue',
        minInterval: 30,
        maxInterval: 10800,
        minChange: 20,
      },
      {
        cluster: CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT,
        attributeName: 'measuredValue',
        minInterval: 60,
        maxInterval: 10800,
        minChange: 300,
      }]);
    }

    // zclNode.endpoints[1].clusters[CLUSTER.BASIC.NAME]
    zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME]
      .on('attr.aqaraVOCLevels', this.onVOCLevelsAttributeReport.bind(this, AqaraManufacturerSpecificCluster.NAME, 'aqaraVOCLevels'));

    zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
      .on('attr.batteryVoltage', this.onBatteryVoltageAttributeReport.bind(this, CLUSTER.POWER_CONFIGURATION.NAME, 'batteryVoltage'));
  }

  /**
   * Set `measure_temperature` when a `measureValue` attribute report is received on the
   * temperature measurement cluster.
   * @param {number} measuredValue
   */
  onTemperatureMeasuredAttributeReport(reportingClusterName, reportingAttribute, measuredValue) {
    // if (measuredValue !== -100) {
    const temperatureOffset = this.getSetting('temperature_offset') || 0;
    const parsedValue = this.getSetting('temperature_decimals') === '2' ? Math.round((measuredValue / 100) * 100) / 100 : Math.round((measuredValue / 100) * 10) / 10;
    if (parsedValue >= -65 && parsedValue <= 65) {
      this.log(`handle report (cluster: ${reportingClusterName}, attribute: ${reportingAttribute}, capability: measure_temperature), parsed payload:`, { temperature: parsedValue, temperatureOffset });
      this.setCapabilityValue('measure_temperature', parsedValue + temperatureOffset).catch(this.error);
    }
  }

  /**
   * Set `measure_humidity` when a `measureValue` attribute report is received on the relative
   * humidity measurement cluster.
   * @param {number} measuredValue
   */
  onRelativeHumidityMeasuredAttributeReport(reportingClusterName, reportingAttribute, measuredValue) {
    // if (measuredValue !== 100) {
    const humidityOffset = this.getSetting('humidity_offset') || 0;
    const parsedValue = this.getSetting('humidity_decimals') === '2' ? Math.round((measuredValue / 100) * 100) / 100 : Math.round((measuredValue / 100) * 10) / 10;
    if (parsedValue >= 0 && parsedValue <= 100) {
      this.log(`handle report (cluster: ${reportingClusterName}, attribute: ${reportingAttribute}, capability: measure_humidity), parsed payload:`, { humidity: parsedValue, humidityOffset });
      this.setCapabilityValue('measure_humidity', parsedValue + humidityOffset).catch(this.error);
    }
  }

  async onVOCMeasuredAttributeReport(reportingClusterName, reportingAttribute, measuredValue) {
    const parsedValue = measuredValue;
    /* Determing the VOC levels as defined below
    5 Unhealthy   2200 - 5500 Situation not acceptable Intense ventilation necessary
    4 Poor        660 - 2200 Major objections Intensified ventilation / airing necessary
    3 Moderate    220 - 660 Some objections Intensified ventilation recommended
    2 Good        65 - 220 No relevant objections Ventilation/airing recommended
    1 Excellent   65 No objections Target value
    */
    let AirQualityLevel = '0';
    if (parsedValue >= 2200) {
      AirQualityLevel = '5';
    } else if (parsedValue >= 660 && parsedValue < 2200) {
      AirQualityLevel = '4';
    } else if (parsedValue >= 220 && parsedValue < 660) {
      AirQualityLevel = '3';
    } else if (parsedValue >= 65 && parsedValue < 220) {
      AirQualityLevel = '2';
    } else (AirQualityLevel = '1');

    // Check if alarm threshold is exceeded
    const VOC_alarm_threshold = this.getSetting('VOC_alarm_threshold') || 220;
    const VOCalarm = parsedValue > VOC_alarm_threshold;

    // const { AirQualityLevelRead } = await this.zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME].readAttributes(['aqaraVOCLevels']).catch(this.error);
    // this.log('measure_VOC | DPManufacturerSpecificCluster - measuredValue (VOC):', parsedValue, 'Air Quality Level:', AirQualityLevel, AirQualityLevelRead, 'alarm_VOC:', VOCalarm);
    this.log(`handle report (cluster: ${reportingClusterName}, attribute: ${reportingAttribute}, capability: measure_VOC), parsed payload:`, parsedValue);
    this.setCapabilityValue('measure_VOC', parsedValue).catch(this.error);

    // Trigger the trigger card with tokens if the AirQualityLevel has changed
    if (AirQualityLevel !== this.getCapabilityValue('measure_AirQualityLevel')) {
      this.triggerFlow({
        id: 'measure_AirQualityLevel_changed',
        tokens: {
          measure_AirQualityLevel: parseInt(AirQualityLevel, 10),
        },
        state: null,
      })
        .catch(err => this.error('Error triggering measure_AirQualityLevel_changed', err));
    }

    this.log(`handle report (cluster: ${reportingClusterName}, attribute: ${reportingAttribute}, capability: measure_AirQualityLevel), parsed payload:`, AirQualityLevel);
    this.setCapabilityValue('measure_AirQualityLevel', AirQualityLevel).catch(this.error);

    this.log(`handle report (cluster: ${reportingClusterName}, attribute: ${reportingAttribute}, capability: alarm_VOC), parsed payload:`, VOCalarm);
    this.setCapabilityValue('alarm_VOC', VOCalarm).catch(this.error);
  }

  /**
   * Set `measure_temperature` when a `measureValue` attribute report is received on the
   * temperature measurement cluster.
   * @param {number} measuredValue
   */
  onVOCLevelsAttributeReport(reportingClusterName, reportingAttribute, measuredValue) {
    // if (measuredValue !== -100) {
    // const temperatureOffset = this.getSetting('temperature_offset') || 0;
    // const parsedValue = this.getSetting('temperature_decimals') === '2' ? Math.round((measuredValue / 100) * 100) / 100 : Math.round((measuredValue / 100) * 10) / 10;
    // if (parsedValue >= -20 && parsedValue <= 60) {
    this.log(`handle report (cluster: ${reportingClusterName}, attribute: ${reportingAttribute}, capability: measure_VOC), parsed payload:`, parsedValue);
    // this.log('measure_VOC | AqaraManufacturerSpecific - aqaraVOCLevels:', measuredValue);
    //  this.setCapabilityValue('measure_temperature', parsedValue + temperatureOffset).catch(this.error);
    // }
  }

  /**
   * Set `measure_temperature` when a `measureValue` attribute report is received on the
   * temperature measurement cluster.
   * @param {number} measuredValue
   */
  onBatteryVoltageAttributeReport(reportingClusterName, reportingAttribute, batteryVoltage) {
    if (typeof batteryVoltage === 'number') {
      const parsedBatPct = util.calculateBatteryPercentage(batteryVoltage * 100, '3V_2850_3000');
      if (this.hasCapability('measure_battery')) {
        this.log(`handle report (cluster: ${reportingClusterName}, attribute: ${reportingAttribute}, capability: measure_battery), parsed payload:`, parsedBatPct);
        this.setCapabilityValue('measure_battery', parsedBatPct).catch(this.error);
      }

      if (this.hasCapability('alarm_battery')) {
        this.log(`handle report (cluster: ${reportingClusterName}, attribute: ${reportingAttribute}, capability: alarm_battery), parsed payload:`, parsedBatPct < 20);
        this.setCapabilityValue('alarm_battery', parsedBatPct < 20).catch(this.error);
      }
    }
  }

  /**
   * This is Xiaomi's custom lifeline attribute, it contains a lot of data, af which the most
   * interesting the battery level. The battery level divided by 1000 represents the battery
   * voltage. If the battery voltage drops below 2600 (2.6V) we assume it is almost empty, based
   * on the battery voltage curve of a CR1632.
   * @param {{batteryLevel: number}} lifeline
   */
  onAqaraLifelineAttributeReport({
    batteryVoltage,
  } = {}) {
    this.debug('lifeline attribute report', {
      batteryVoltage,
    });
    if (typeof batteryVoltage === 'number') {
      this.onBatteryVoltageAttributeReport('AqaraLifeline', 'batteryVoltage', batteryVoltage / 100);
    }
  }

}

module.exports = AqaraAirQualityMonitor;

// WSDCGQ11LM_weather

/*

Set temperature to PPM & Farenheit CL 0xfcc0, Attribute 0x0114, type Unint8, value 0x11 (17)
Set temperature to PPM & Celcius CL 0xfcc0, Attribute 0x0114, type Unint8, value 0x01 (1)
Set temperature to mg/m3 &  Celcius  CL 0xfcc0, Attribute 0x0114, type Unint8, value 0x00 (1)
Set temperature to mg/m3 & Farenheit  CL 0xfcc0, Attribute 0x0114, type Unint8, value 0x10 (16)

Reported attributes:
CL 0xfcc0, Attribute: 0x0129, type: Uint8, value == VOC levels???
0x00ff? During inclusion, writing to this attributes

Node overview:
2018-03-03 15:04:39 [log] [ManagerDrivers] [weather] [0] ------------------------------------------
2018-03-03 15:04:39 [log] [ManagerDrivers] [weather] [0] Node: 6364d680-e95a-4276-89eb-39f1a614f1e1
2018-03-03 15:04:39 [log] [ManagerDrivers] [weather] [0] - Battery: false
2018-03-03 15:04:39 [log] [ManagerDrivers] [weather] [0] - Endpoints: 0
2018-03-03 15:04:39 [log] [ManagerDrivers] [weather] [0] -- Clusters:
2018-03-03 15:04:39 [log] [ManagerDrivers] [weather] [0] --- zapp
2018-03-03 15:04:39 [log] [ManagerDrivers] [weather] [0] --- genBasic
2018-03-03 15:04:39 [log] [ManagerDrivers] [weather] [0] ---- 65281 : !�
f+��                                                                    !�!<$d)
!
2018-03-03 15:04:39 [log] [ManagerDrivers] [weather] [0] ---- cid : genBasic
2018-03-03 15:04:39 [log] [ManagerDrivers] [weather] [0] ---- sid : attrs
2018-03-03 15:04:39 [log] [ManagerDrivers] [weather] [0] ---- modelId : lumi.weather
2018-03-03 15:04:39 [log] [ManagerDrivers] [weather] [0] --- genIdentify
2018-03-03 15:04:39 [log] [ManagerDrivers] [weather] [0] ---- cid : genIdentify
2018-03-03 15:04:39 [log] [ManagerDrivers] [weather] [0] ---- sid : attrs
2018-03-03 15:04:39 [log] [ManagerDrivers] [weather] [0] --- genGroups
2018-03-03 15:04:39 [log] [ManagerDrivers] [weather] [0] ---- cid : genGroups
2018-03-03 15:04:39 [log] [ManagerDrivers] [weather] [0] ---- sid : attrs
2018-03-03 15:04:40 [log] [ManagerDrivers] [weather] [0] --- msTemperatureMeasurement
2018-03-03 15:04:40 [log] [ManagerDrivers] [weather] [0] ---- cid : msTemperatureMeasurement
2018-03-03 15:04:40 [log] [ManagerDrivers] [weather] [0] ---- sid : attrs
2018-03-03 15:04:40 [log] [ManagerDrivers] [weather] [0] ---- measuredValue : 2061
2018-03-03 15:04:40 [log] [ManagerDrivers] [weather] [0] --- msPressureMeasurement
2018-03-03 15:04:40 [log] [ManagerDrivers] [weather] [0] ---- 16 : 9947
2018-03-03 15:04:40 [log] [ManagerDrivers] [weather] [0] ---- 20 : -1
2018-03-03 15:04:40 [log] [ManagerDrivers] [weather] [0] ---- cid : msPressureMeasurement
2018-03-03 15:04:40 [log] [ManagerDrivers] [weather] [0] ---- sid : attrs
2018-03-03 15:04:40 [log] [ManagerDrivers] [weather] [0] ---- measuredValue : 994
2018-03-03 15:04:40 [log] [ManagerDrivers] [weather] [0] --- msRelativeHumidity
2018-03-03 15:04:40 [log] [ManagerDrivers] [weather] [0] ---- cid : msRelativeHumidity
2018-03-03 15:04:40 [log] [ManagerDrivers] [weather] [0] ---- sid : attrs
2018-03-03 15:04:40 [log] [ManagerDrivers] [weather] [0] ---- measuredValue : 3485
2018-03-03 15:04:40 [log] [ManagerDrivers] [weather] [0] --- manuSpecificCluster
2018-03-03 15:04:40 [log] [ManagerDrivers] [weather] [0] ---- cid : manuSpecificCluster
2018-03-03 15:04:40 [log] [ManagerDrivers] [weather] [0] ---- sid : attrs
2018-03-03 15:04:40 [log] [ManagerDrivers] [weather] [0] ------------------------------------------

*/
