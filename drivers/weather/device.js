// TODO: add configureAttributeReporting

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, CLUSTER } = require('zigbee-clusters');

const util = require('../../lib/util');
const XiaomiBasicCluster = require('../../lib/XiaomiBasicCluster');

Cluster.addCluster(XiaomiBasicCluster);

class AqaraWeatherSensor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // print the node's info to the console
    // this.printNode();

    // zclNode.endpoints[1].clusters[CLUSTER.BASIC.NAME]
    zclNode.endpoints[1].clusters[XiaomiBasicCluster.NAME]
      .on('attr.xiaomiLifeline', this.onXiaomiLifelineAttributeReport.bind(this));

    zclNode.endpoints[1].clusters[CLUSTER.TEMPERATURE_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onTemperatureMeasuredAttributeReport.bind(this));

    zclNode.endpoints[1].clusters[CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onRelativeHumidityMeasuredAttributeReport.bind(this));

    zclNode.endpoints[1].clusters[CLUSTER.PRESSURE_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onPressureMeasuredAttributeReport.bind(this));
  }

  /**
   * Set `measure_temperature` when a `measureValue` attribute report is received on the
   * temperature measurement cluster.
   * @param {number} measuredValue
   */
  onTemperatureMeasuredAttributeReport(measuredValue) {
    // if (measuredValue !== -100) {
    const temperatureOffset = this.getSetting('temperature_offset') || 0;
    const parsedValue = this.getSetting('temperature_decimals') === '2' ? Math.round((measuredValue / 100) * 100) / 100 : Math.round((measuredValue / 100) * 10) / 10;
    if (parsedValue >= -65 && parsedValue <= 65) {
      this.log('handle report (cluster: TemperatureMeasurement, attribute: measuredValue, capability: measure_temperature), parsed payload:', parsedValue, '+ temperature offset', temperatureOffset);
      this.setCapabilityValue('measure_temperature', parsedValue + temperatureOffset).catch(this.error);
    }
  }

  /**
   * Set `measure_humidity` when a `measureValue` attribute report is received on the relative
   * humidity measurement cluster.
   * @param {number} measuredValue
   */
  onRelativeHumidityMeasuredAttributeReport(measuredValue) {
    // if (measuredValue !== 100) {
    const humidityOffset = this.getSetting('humidity_offset') || 0;
    const parsedValue = this.getSetting('humidity_decimals') === '2' ? Math.round((measuredValue / 100) * 100) / 100 : Math.round((measuredValue / 100) * 10) / 10;
    if (parsedValue >= 0 && parsedValue <= 100) {
      this.log('handle report (cluster: RelativeHumidity, attribute: measuredValue, capability: measure_humidity), parsed payload:', parsedValue, '+ humidity offset', humidityOffset);
      this.setCapabilityValue('measure_humidity', parsedValue + humidityOffset).catch(this.error);
    }
  }

  /**
   * Set `measure_pressure` when a `measureValue` attribute report is received on the pressure
   * measurement cluster.
   * @param {number} measuredValue
   */
  onPressureMeasuredAttributeReport(measuredValue) {
    const pressureOffset = this.getSetting('pressure_offset') || 0;
    const parsedValue = Math.round((measuredValue / 100) * 100);
    this.log('handle report (cluster: PressureMeasurement, attribute: measuredValue, capability: measure_pressure), parsed payload:', parsedValue, '+ pressure offset', pressureOffset);
    this.setCapabilityValue('measure_pressure', parsedValue + pressureOffset).catch(this.error);
  }

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
  onXiaomiLifelineAttributeReport({
    state, state1, state2, batteryVoltage,
  } = {}) {
    this.log('lifeline attribute report', {
      batteryVoltage, state, state1, state2,
    });
    if (typeof state === 'number') this.onTemperatureMeasuredAttributeReport(state);
    if (typeof state1 === 'number') this.onRelativeHumidityMeasuredAttributeReport(state1);
    if (typeof state2 === 'number') this.onPressureMeasuredAttributeReport(state2 / 100);
    if (typeof batteryVoltage === 'number') {
      this.onBatteryVoltageAttributeReport('AqaraLifeline', 'batteryVoltage', batteryVoltage / 100);
    }
  }

}

module.exports = AqaraWeatherSensor;

// WSDCGQ11LM_weather

/*
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
