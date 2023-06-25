'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');

const util = require('../../lib/util');
const XiaomiBasicCluster = require('../../lib/XiaomiBasicCluster');

Cluster.addCluster(XiaomiBasicCluster);

class AqaraWaterSensor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    // Capture the zoneStatusChangeNotification
    zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME]
      .onZoneStatusChangeNotification = payload => {
        this.onIASZoneStatusChangeNoficiation(payload);
      };

    // Register the AttributeReportListener - Lifeline
    zclNode.endpoints[1].clusters[XiaomiBasicCluster.NAME]
      .on('attr.xiaomiLifeline', this.onXiaomiLifelineAttributeReport.bind(this));
  }

  /**
   * Update alarm capabilities based on the IASZoneStatusChangeNotification.
   */
  onIASZoneStatusChangeNoficiation({
    zoneStatus, extendedStatus, zoneId, delay,
  }) {
    this.log('handle report (cluster: iasZone, attribute: zoneStatus.alarm1, capability: alarm_water), parsed payload:', zoneStatus.alarm1);
    this.setCapabilityValue('alarm_water', zoneStatus.alarm1).catch(this.error);
    this.log('handle report (cluster: iasZone, attribute: zoneStatus.battery, capability: alarm_battery), parsed payload:', zoneStatus.battery);
    this.setCapabilityValue('alarm_battery', zoneStatus.battery).catch(this.error);
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
    batteryVoltage,
  } = {}) {
    if (typeof batteryVoltage === 'number') {
      this.onBatteryVoltageAttributeReport('AqaraLifeline', 'batteryVoltage', batteryVoltage / 100);
    }
  }

}

module.exports = AqaraWaterSensor;

/*
Alarm:
2020-10-03T06:13:10.368Z zigbee-clusters:endpoint ep: 1, cl: iasZone (1280), error while handling frame unknown_command_received {
  meta: { transId: 0, linkQuality: 102, dstEndpoint: 1, timestamp: 7144012 },
  frame: ZCLStandardHeader {
    frameControl: Bitmap [ clusterSpecific, directionToClient, disableDefaultResponse ],
    trxSequenceNumber: 3,
    cmdId: 0,
    data: <Buffer 01 00 00 ff 00 00>
  }
}

2020-10-03T06:13:28.505Z zigbee-clusters:endpoint ep: 1, cl: iasZone (1280), error while handling frame unknown_command_received {
  meta: { transId: 0, linkQuality: 102, dstEndpoint: 1, timestamp: 7200780 },
  frame: ZCLStandardHeader {
    frameControl: Bitmap [ clusterSpecific, directionToClient, disableDefaultResponse ],
    trxSequenceNumber: 4,
    cmdId: 0,
    data: <Buffer 00 00 00 ff 00 00>
  }
}

2017-10-29 19:03:00 [log] [ManagerDrivers] [sensor_wleak.aq1] [0] ------------------------------------------
2017-10-29 19:03:00 [log] [ManagerDrivers] [sensor_wleak.aq1] [0] Node: ccdc2a0a-a438-42d3-a3d7-4de0de5e21e4
2017-10-29 19:03:00 [log] [ManagerDrivers] [sensor_wleak.aq1] [0] - Battery: false
2017-10-29 19:03:00 [log] [ManagerDrivers] [sensor_wleak.aq1] [0] - Endpoints: 0
2017-10-29 19:03:00 [log] [ManagerDrivers] [sensor_wleak.aq1] [0] -- Clusters:
2017-10-29 19:03:00 [log] [ManagerDrivers] [sensor_wleak.aq1] [0] --- zapp
2017-10-29 19:03:00 [log] [ManagerDrivers] [sensor_wleak.aq1] [0] --- genBasic
2017-10-29 19:03:00 [log] [ManagerDrivers] [sensor_wleak.aq1] [0] ---- cid : genBasic
2017-10-29 19:03:00 [log] [ManagerDrivers] [sensor_wleak.aq1] [0] ---- sid : attrs
2017-10-29 19:03:00 [log] [ManagerDrivers] [sensor_wleak.aq1] [0] --- genPowerCfg
2017-10-29 19:03:00 [log] [ManagerDrivers] [sensor_wleak.aq1] [0] ---- cid : genPowerCfg
2017-10-29 19:03:00 [log] [ManagerDrivers] [sensor_wleak.aq1] [0] ---- sid : attrs
2017-10-29 19:03:00 [log] [ManagerDrivers] [sensor_wleak.aq1] [0] --- genIdentify
2017-10-29 19:03:00 [log] [ManagerDrivers] [sensor_wleak.aq1] [0] ---- cid : genIdentify
2017-10-29 19:03:00 [log] [ManagerDrivers] [sensor_wleak.aq1] [0] ---- sid : attrs
2017-10-29 19:03:00 [log] [ManagerDrivers] [sensor_wleak.aq1] [0] --- genOta
2017-10-29 19:03:00 [log] [ManagerDrivers] [sensor_wleak.aq1] [0] ---- cid : genOta
2017-10-29 19:03:00 [log] [ManagerDrivers] [sensor_wleak.aq1] [0] ---- sid : attrs
2017-10-29 19:03:00 [log] [ManagerDrivers] [sensor_wleak.aq1] [0] ------------------------------------------
*/
