// TODO: add configureAttributeReporting

'use strict';

const { ZigBeeDevice, Util } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');

const util = require('../../lib/util');
const AqaraManufacturerSpecificCluster = require('../../lib/AqaraManufacturerSpecificCluster');

Cluster.addCluster(AqaraManufacturerSpecificCluster);

class AqaraT1TemperatureHumiditySensor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // print the node's info to the console
    // this.printNode();

    // remove alarm_battery capability (on request of Athom)
    if (this.hasCapability('alarm_battery')) await this.removeCapability('alarm_battery').catch(this.error);

    // zclNode.endpoints[1].clusters[CLUSTER.BASIC.NAME]
    zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME]
      .on('attr.aqaraLifeline', this.onAqaraLifelineAttributeReport.bind(this));

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
   * This is Aqara's custom lifeline attribute, it contains a lot of data, af which the most
   * interesting the battery level. The battery level divided by 1000 represents the battery
   * voltage.
   * @param {{batteryLevel: number}} lifeline
   */
  onAqaraLifelineAttributeReport({
    state, state1, state2, batteryVoltage,
  } = {}) {
    if (typeof state === 'number') this.onTemperatureMeasuredAttributeReport(state);
    if (typeof state1 === 'number') this.onRelativeHumidityMeasuredAttributeReport(state1);
    if (typeof state2 === 'number') this.onPressureMeasuredAttributeReport(state2);
    if (typeof batteryVoltage === 'number') {
      this.onBatteryVoltageAttributeReport('AqaraLifeline', 'batteryVoltage', batteryVoltage / 100);
    }
  }

}

module.exports = AqaraT1TemperatureHumiditySensor;
