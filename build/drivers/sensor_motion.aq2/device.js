// SDK3 updated & validated

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');

const util = require('../../lib/util');
const XiaomiBasicCluster = require('../../lib/XiaomiBasicCluster');

Cluster.addCluster(XiaomiBasicCluster);

class AqaraHumanBodySensor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    zclNode.endpoints[1].clusters[CLUSTER.OCCUPANCY_SENSING.NAME]
      .on('attr.occupancy', this.onOccupancyAttributeReport.bind(this));

    // zclNode.endpoints[1].clusters[CLUSTER.BASIC.NAME]
    zclNode.endpoints[1].clusters[XiaomiBasicCluster.NAME]
      .on('attr.xiaomiLifeline', this.onXiaomiLifelineAttributeReport.bind(this));

    zclNode.endpoints[1].clusters[CLUSTER.ILLUMINANCE_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onLuminanceMeasuredValueAttributeReport.bind(this));
  }

  /**
   * When an occupancy attribute report is received `alarm_motion` is set true. After the
   * timeout has expired (and no motion has been detected since) the `alarm_motion` is set false.
   * @param {boolean} occupied - True if motion is detected
   */
  onOccupancyAttributeReport({ occupied }) {
    this.log('occupancy attribute report', occupied);

    this.setCapabilityValue('alarm_motion', occupied).catch(this.error);

    // Set and clear motion timeout
    const alarmMotionResetWindow = this.getSetting('hacked_alarm_motion_reset_window') ? 5 : (this.getSetting('alarm_motion_reset_window') || 300);
    // Set a timeout after which the alarm_motion capability is reset
    if (this.motionAlarmTimeout) clearTimeout(this.motionAlarmTimeout);

    this.motionAlarmTimeout = setTimeout(() => {
      this.log('manual alarm_motion reset');
      this.setCapabilityValue('alarm_motion', false).catch(this.error);
    }, alarmMotionResetWindow * 1000);
  }

  /**
   * Set `measure_luminance` when a `measureValue` attribute report is received on the measure
   * luminance cluster.
   * @param {number} measuredValue
   */
  onLuminanceMeasuredValueAttributeReport(measuredValue) {
    this.log('illuminance measuredValue report', measuredValue);
    this.setCapabilityValue('measure_luminance', measuredValue).catch(this.error);
  }

  /**
   * This is Xiaomi's custom lifeline attribute, it contains a lot of data, af which the most
   * interesting the battery level. The battery level divided by 1000 represents the battery
   * voltage. If the battery voltage drops below 2600 (2.6V) we assume it is almost empty, based
   * on the battery voltage curve of a CR1632.
   * @param {{batteryLevel: number}} lifeline
   */
  onXiaomiLifelineAttributeReport({
    batteryVoltage,
  } = {}) {
    if (typeof batteryVoltage === 'number') {
      const parsedBatPct = util.calculateBatteryPercentage(batteryVoltage, '3V_2100');
      this.log('lifeline attribute report', batteryVoltage, 'parsedBatteryPct', parsedBatPct);
      this.setCapabilityValue('measure_battery', parsedBatPct).catch(this.error);
      this.setCapabilityValue('alarm_battery', parsedBatPct < 20).catch(this.error);
    }
  }

}

module.exports = AqaraHumanBodySensor;

// RTCGQ11LM_sensor_motion

/*
Node overview:
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] ZigBeeDevice has been inited
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] ------------------------------------------
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] Node: 52c927a0-98e3-4b1b-8074-2da221c04522
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] - Battery: false
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] - Endpoints: 0
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] -- Clusters:
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] --- zapp
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] --- genBasic
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] ---- cid : genBasic
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] ---- sid : attrs
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] ---- manufacturerName : LUMI
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] ---- modelId : lumi.sensor_motion.aq2
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] --- genOta
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] ---- cid : genOta
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] ---- sid : attrs
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] --- msIlluminanceMeasurement
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] ---- cid : msIlluminanceMeasurement
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] ---- sid : attrs
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] --- msOccupancySensing
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] ---- cid : msOccupancySensing
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] ---- sid : attrs
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] --- manuSpecificCluster
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] ---- cid : manuSpecificCluster
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] ---- sid : attrs
2017-09-14 20:29:21 [log] [ManagerDrivers] [aqara_human_body_sensor] [0] ------------------------------------------

*/
