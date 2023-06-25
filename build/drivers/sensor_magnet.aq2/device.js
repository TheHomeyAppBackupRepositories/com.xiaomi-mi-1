// SDK3 updated & validated: DONE

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');

const util = require('../../lib/util');
const XiaomiBasicCluster = require('../../lib/XiaomiBasicCluster');

Cluster.addCluster(XiaomiBasicCluster);

class AqaraDoorWindowSensor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    zclNode.endpoints[1].clusters[CLUSTER.ON_OFF.NAME]
      .on('attr.onOff', this.onContactReport.bind(this, CLUSTER.ON_OFF.NAME, 'onOff'));

    zclNode.endpoints[1].clusters[XiaomiBasicCluster.NAME]
      .on('attr.xiaomiLifeline', this.onXiaomiLifelineAttributeReport.bind(this));
  }

  /**
   * This attribute is reported when the contact alarm of the door and window sensor changes.
   * @param {boolean} onOff
   */

  onContactReport(reportingClusterName, reportingAttribute, data) {
    const reverseAlarmLogic = this.getSetting('reverse_contact_alarm') || false;
    const parsedData = !reverseAlarmLogic ? data === true : data === false;
    this.log(`handle report (cluster: ${reportingClusterName}, attribute: ${reportingAttribute}, capability: alarm_contact), parsed payload: ${parsedData}`);
    this.setCapabilityValue('alarm_contact', parsedData).catch(this.error);
  }

  /**
   * This is Xiaomi's custom lifeline attribute, it contains a lot of data, af which the most
   * interesting the battery level. The battery level divided by 1000 represents the battery
   * voltage. If the battery voltage drops below 2600 (2.6V) we assume it is almost empty, based
   * on the battery voltage curve of a CR1632.
   * @param {{batteryLevel: number}} lifeline
   */
  onXiaomiLifelineAttributeReport({
    state, batteryVoltage,
  } = {}) {
    this.debug('lifeline attribute report', {
      batteryVoltage, state,
    });

    if (typeof state === 'boolean') {
      // this.log('lifeline attribute report', state, 'parsedState', state === 1);
      this.onContactReport('AqaraLifeline', 'state', state);
    }

    if (typeof batteryVoltage === 'number') {
      const parsedBatPct = util.calculateBatteryPercentage(batteryVoltage, '3V_2100');
      this.log('handle report (cluster: AqaraLifeline, attribute: batteryVoltage, capability: measure_battery), parsed payload:', parsedBatPct);
      this.setCapabilityValue('measure_battery', parsedBatPct).catch(this.error);
      this.log('handle report (cluster: aqaraLifeline, attribute: batteryVoltage, capability: alarm_battery), parsed payload:', parsedBatPct < 20);
      this.setCapabilityValue('alarm_battery', parsedBatPct < 20).catch(this.error);
    }
  }

}

module.exports = AqaraDoorWindowSensor;

// MCCGQ11LM_sensor_magnet
/*
Node overview:
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] ------------------------------------------
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] Node: 838816d1-66b1-4a2e-a9da-b4758ae6f2db
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] - Battery: false
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] - Endpoints: 0
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] -- Clusters:
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] --- zapp
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] --- genBasic
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] ---- 65281 : !�
                                                                                  (!�!&$
!d
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] ---- cid : genBasic
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] ---- sid : attrs
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] ---- modelId : lumi.sensor_magnet.aq2
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] --- genIdentify
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] ---- cid : genIdentify
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] ---- sid : attrs
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] --- genGroups
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] ---- cid : genGroups
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] ---- sid : attrs
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] --- genOnOff
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] ---- cid : genOnOff
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] ---- sid : attrs
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] ---- onOff : 1
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] --- manuSpecificCluster
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] ---- cid : manuSpecificCluster
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] ---- sid : attrs
2018-03-03 15:04:39 [log] [ManagerDrivers] [sensor_magnet.aq2] [0] ------------------------------------------

*/
