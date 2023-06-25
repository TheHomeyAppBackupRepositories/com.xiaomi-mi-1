// SDK3 updated & validated

'use strict';

const { ZigBeeDevice, Util } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');

const util = require('../../lib/util');
const AqaraManufacturerSpecificCluster = require('../../lib/AqaraManufacturerSpecificCluster');

Cluster.addCluster(AqaraManufacturerSpecificCluster);

class AqaraMotionSensorP1 extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    // occupancy and illumination detection
    zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME]
      .on('attr.aqaraMotionAndIllumination', this.onMotionAndLuminanceMeasuredValueAttributeReport.bind(this))
      .on('attr.aqaraLifeline', this.onAqaraLifelineAttributeReport.bind(this));

    // if (this.hasCapability('measure_battery')) {
    zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
      .on('attr.batteryVoltage', this.onBatteryVoltageAttributeReport.bind(this, CLUSTER.POWER_CONFIGURATION.NAME, 'batteryVoltage'));
    // }
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
        this.setCapabilityValue('alarm_battery', parsedBatPct < this.getSetting('battery_threshold')).catch(this.error);
      }
    }
  }

  /**
   * Set `measure_luminance` when a `measureValue` attribute report is received on the measure
   * luminance cluster.
   * @param {number} measuredValue
   */
  onMotionAndLuminanceMeasuredValueAttributeReport(measuredValue) {
    // register motion
    this.log('handle report (cluster: OccupancySensing, attribute: -, capability: alarm_motion), parsed payload: n/a');
    this.setCapabilityValue('alarm_motion', true).catch(this.error);

    // set and clear motion timeout
    const alarmMotionResetWindow = (this.getSetting('alarm_motion_reset_window') || 300);
    // set a timeout after which the alarm_motion capability is reset
    if (this.alarmMotionTimeout) clearTimeout(this.alarmMotionTimeout);

    this.alarmMotionTimeout = setTimeout(() => {
      this.log('manual alarm_motion reset');
      this.setCapabilityValue('alarm_motion', false).catch(this.error);
    }, alarmMotionResetWindow * 1000);

    // set illuminance value
    if (typeof measuredValue === 'number') {
      // Sometimes the P1 sensor reports high illuminance values in dark conditions, don't process these
      if (measuredValue < 65000) {
        this.log('handle report (cluster: IlluminanceMeasurement, attribute: measuredValue, capability: measure_luminance), parsed payload:', measuredValue);
        this.setCapabilityValue('measure_luminance', measuredValue).catch(this.error);
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
    state1, batteryVoltage,
  } = {}) {
    // Illumination
    if (typeof state1 === 'number') {
      if (state1 < 65000) {
        this.log('handle report (cluster: AqaraManufacturerSpecificCluster, attribute: state1, capability: measure_luminance), parsed payload:', state1);
        this.setCapabilityValue('measure_luminance', state1).catch(this.error);
      }
    }
    // Battery
    if (typeof batteryVoltage === 'number') {
      this.onBatteryVoltageAttributeReport('AqaraLifeline', 'batteryVoltage', batteryVoltage / 100);
    }
  }

  /**
   * Update settings
   * @param {*} param0
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    const attributes = {};

    // reverse_direction attribute
    if (changedKeys.includes('alarm_motion_blind_time')) {
      // const result = await this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
      //  .writeAttributes({ aqaraMotionBlindTime: newSettings.alarm_motion_blind_time }).catch(this.error);
      attributes.aqaraMotionBlindTime = newSettings['alarm_motion_blind_time'];
      this.log('SETTINGS | Write Attribute - Aqara Manufacturer Specific Cluster - aqaraMotionBlindTime', newSettings.alarm_motion_blind_time);
    }
    if (changedKeys.includes('motion_sensitivity_level')) {
      // const result = await this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
      //   .writeAttributes({ aqaraSensitivityLevel: newSettings.motion_sensitivity_level }).catch(this.error);
      attributes.aqaraSensitivityLevel = newSettings['motion_sensitivity_level'];
      this.log('SETTINGS | Write Attribute - Aqara Manufacturer Specific Cluster - aqaraSensitivityLevel', newSettings.motion_sensitivity_level);
    }
    if (changedKeys.includes('motion_led_notifications')) {
      // const result = await this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
      //   .writeAttributes({ aqaraMotionLed: newSettings.motion_led_notifications }).catch(this.error);
      attributes.aqaraMotionLed = newSettings['motion_led_notifications'];
      this.log('SETTINGS | Write Attribute - Aqara Manufacturer Specific Cluster - aqaraMotionLed', newSettings.motion_led_notifications);
    }

    try {
      if (Object.keys(attributes).length > 0) {
        this.log('=>', attributes);
        await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
          .writeAttributes(attributes), 3);
      }
    } catch (err) {
      // reset settings values on failed update
      throw new Error(`failed to update settings. Message:${err}`);
    }
  }

}

module.exports = AqaraMotionSensorP1;
