// SDK3 updated & validated: DONE

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');

const util = require('../../lib/util');
const XiaomiBasicCluster = require('../../lib/XiaomiBasicCluster');

Cluster.addCluster(XiaomiBasicCluster);

class XiaomiDoorWindowSensor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    // Add battery capabilities
    if (!this.hasCapability('measure_battery')) {
      this.addCapability('measure_battery').catch(this.error);
    }
    if (!this.hasCapability('alarm_battery')) {
      this.addCapability('alarm_battery').catch(this.error);
    }

    zclNode.endpoints[1].clusters[CLUSTER.ON_OFF.NAME]
      .on('attr.onOff', this.onContactReport.bind(this));

    // Lifeline
    zclNode.endpoints[1].clusters[XiaomiBasicCluster.NAME]
      .on('attr.xiaomiLifeline2', this.onXiaomiLifelineAttributeReport.bind(this));
  }

  /**
   * This attribute is reported when the contact alarm of the door and window sensor changes.
   * @param {boolean} onOff
   */

  onContactReport(data) {
    const reverseAlarmLogic = this.getSetting('reverse_contact_alarm') || false;
    const parsedData = !reverseAlarmLogic ? data === true : data === false;
    this.log(`alarm_contact -> ${parsedData}`);
    this.setCapabilityValue('alarm_contact', parsedData).catch(this.error);
  }

  /**
     * This is Xiaomi's custom lifeline attribute, it contains a lot of data, af which the most
     * interesting the battery level. The battery level divided by 1000 represents the battery
     * voltage. If the battery voltage drops below 2600 (2.6V) we assume it is almost empty, based
     * on the battery voltage curve of a CR1632.
     * @param {{batteryLevel: number}} lifeline
     */
  onXiaomiLifelineAttributeReport(attributeBuffer) {
    const state = attributeBuffer.readUInt8(3) === 1;
    const batteryVoltage = attributeBuffer.readUInt16LE(5);

    if (typeof state === 'boolean') {
      this.log('lifeline attribute report', state, 'parsedState', state === 1);
      this.onContactReport(state);
    }

    if (typeof batteryVoltage === 'number') {
      const parsedBatPct = util.calculateBatteryPercentage(batteryVoltage, '3V_2100');
      this.log('lifeline attribute report', batteryVoltage, 'parsedBatteryPct', parsedBatPct);
      this.setCapabilityValue('measure_battery', parsedBatPct).catch(this.error);
      this.setCapabilityValue('alarm_battery', parsedBatPct < 20).catch(this.error);
    }
  }

}

module.exports = XiaomiDoorWindowSensor;

// MCCGQ01LM_sensor_magnet

/*
Motion sensor:  <Buffer 02 ff 4c 06 00 10 01 21 bd 0b 21 a8 13 24 02 00 00 00 00 21 17 00 20 5c>
                <Buffer 02 ff 4c 06 00
                10 (bool)   01              // state
                21 (uint16) bd 0b           // battery
                21 (uint16) a8 13           // rssi?
                24 (uint40) 02 00 00 00 00  // txCount
                21 (uint16) 17 00           // rssi?
                20 (uint8)  5c              // CPU temperature
                >
Door sensor:    <Buffer 02 ff 4c 06 00 10 01 21 c4 0b 21 a8 43 24 06 00 00 00 00 21 7a 00 20 5c>
                <Buffer 02 ff 4c 06 00
                10 (bool)   01
                21 (uint16) c4 0b
                21 (uint16) a8 43
                24 (uint40) 06 00 00 00 00
                21 (uint16) 7a 00
                20 (uint16) 5c>

                <Buffer 06 00 10 00 21 bd 0b 21 a8 33 24 21 00 00 07 02 21 17 00 20 5c>
                <Buffer 06 00
                10 (bool)   00               // state (closed)
                21 (unit16) bd 0b            // battery
                21 (uint16) a8 33            // rssi?
                24 (uint40) 21 00 00 07 02   // txCount
                21 (uint16) 17 00            // rssi?
                20 (uint8)  5c               // CPU temperature
                >
                <Buffer 06 00 10 01 21 bd 0b 21 a8 33 24 22 00 00 07 02 21 17 00 20 5c>
*/

/*
Node overview
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] Node: 2a3902d3-988a-4ae5-adea-6e0d7c85ec5e
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] - Battery: false
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] - Endpoints: 0
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] -- Clusters:
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] --- zapp
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] --- genBasic
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] ---- cid : genBasic
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] ---- sid : attrs
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] --- genIdentify
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] ---- cid : genIdentify
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] ---- sid : attrs
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] --- genGroups
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] ---- cid : genGroups
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] ---- sid : attrs
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] --- genScenes
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] ---- cid : genScenes
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] ---- sid : attrs
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] --- genOnOff
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] ---- cid : genOnOff
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] ---- sid : attrs
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] --- genLevelCtrl
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] ---- cid : genLevelCtrl
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] ---- sid : attrs
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] --- genOta
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] ---- cid : genOta
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] ---- sid : attrs
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] --- manuSpecificCluster
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] ---- cid : manuSpecificCluster
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] ---- sid : attrs
2017-10-21 00:55:34 [log] [ManagerDrivers] [sensor_magnet] [0] ------------------------------------------
*/
