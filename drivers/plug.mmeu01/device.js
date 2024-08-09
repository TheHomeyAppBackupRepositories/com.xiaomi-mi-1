// SDK3 updated & validated: DONE

'use strict';

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const {
  debug, Cluster, CLUSTER,
} = require('zigbee-clusters');

const AqaraManufacturerSpecificCluster = require('../../lib/AqaraManufacturerSpecificCluster');

Cluster.addCluster(AqaraManufacturerSpecificCluster);

class XiaomiSmartPlugEU extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    this.initSettings();

    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0, // No minimum reporting interval
            maxInterval: 43200, // Maximally every ~12 hours
            minChange: 1, // Report when value changed by 5
          },
        },
        endpoint: 1,
      });
    }

    // measure_power
    if (this.hasCapability('measure_power')) {
      this.registerCapability('measure_power', CLUSTER.ANALOG_INPUT, {
        get: 'presentValue',
        getOpts: {
          getOnStart: true,
        },
        report: 'presentValue',
        reportParser(value) {
          return value;
        },
        endpoint: 21,
      });
    }

    if (this.hasCapability('meter_power')) {
      this.registerCapability('meter_power', CLUSTER.ANALOG_INPUT, {
        get: 'presentValue',
        getOpts: {
          getOnStart: true,
        },
        report: 'presentValue',
        reportParser(value) {
          return value;
        },
        endpoint: 22,
      });
    }

    zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME]
      .on('attr.aqaraLifeline', this.onAqaraLifelineAttributeReport.bind(this));
  }

  async initSettings() {
    try {
      const {
        aqaraLedDisabled, aqaraPowerOutageMemory, aqaraPowerOffMemory, aqaraMaximumPower,
      } = await this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME].readAttributes(['aqaraLedDisabled', 'aqaraPowerOutageMemory', 'aqaraPowerOffMemory', 'aqaraMaximumPower']).catch(this.error);
      this.log('READattributes options, aqaraLedDisabled:', aqaraLedDisabled, 'aqaraPowerOutageMemory:', aqaraPowerOutageMemory, 'aqaraPowerOffMemory:', aqaraPowerOffMemory, 'aqaraMaximumPower:', aqaraMaximumPower);
      await this.setSettings({ save_state: aqaraPowerOutageMemory });
    } catch (err) {
      this.log('could not read Attribute xiaomiSwitchOptions:', err);
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
    state, consumption, power,
  } = {}) {
    this.log('lifeline attribute report', {
      state, consumption, power,
    });

    if (typeof state === 'number') {
      this.log('handle report (cluster: aqaraLifeline, capability: onoff), parsed payload:', state === 1);
      this.setCapabilityValue('onoff', state === 1).catch(this.error);
    }

    if (typeof consumption === 'number') {
      this.log('handle report (cluster: aqaraLifeline, capability: meter_power), parsed payload:', consumption);
      this.setCapabilityValue('meter_power', consumption).catch(this.error);
    }

    if (typeof power === 'number') {
      this.log('handle report (cluster: aqaraLifeline, capability: measure_power), parsed payload:', power);
      this.setCapabilityValue('measure_power', power).catch(this.error);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    // aqaraPowerOutageMemory attribute
    if (changedKeys.includes('save_state')) {
      const result = await this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
        .writeAttributes({ aqaraPowerOutageMemory: newSettings.save_state });
      this.log('SETTINGS | Write Attribute - Aqara Manufacturer Specific Cluster - aqaraPowerOutageMemory', newSettings.save_state, 'result:', result);
    }
  }

}

module.exports = XiaomiSmartPlugEU;
/*
00 01 c0 fc 04 01 01 5e 1c 5f 11 74 0a f7 00 41
3d

64 10 01
03 28 18
98 39 ba 49 f3 41
95 39 b4 c7 d1 40
96 39 00 20 0f 45
97 39 93 cc 04 43
05 21 01 00
9a 20 10
08 21 16 01
07 27 00 00 00 00 00 00 00 00
09 21 00 04
0b 20 00
9b 10 01

00 01 c0 fc
04 01 01 03 1c 5f 11 6c 0a f7 00 41 3d
05 21 01 00
64 10 01 03 28 18
95 39 ec a7 d1 40
96 39 00 20 0f 45
97 39 93 cc 04 43
98 39 ba 49 f3 41
9a 20 10
08 21 16 01
07 27 00 00 00 00 00 00 00 00
09 21 00
04 0b 20 00
9b 10 01

2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ------------------------------------------
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] Node: ffabe1c8-373b-4974-9d5f-37f9c63bd2be
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] - Battery: false
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] - Endpoints: 0
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] -- Clusters:
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] --- 64704
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- 247 : d(�9�9�~Y>�9�E�9!�!'	!
                                                                                                  �
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- 519 : 1
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- cid : 64704
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- sid : attrs
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] --- zapp
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] --- genBasic
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- 65533 : 1
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- cid : genBasic
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- sid : attrs
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- zclVersion : 3
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- appVersion : 22
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- stackVersion : 2
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- hwVersion : 1
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- manufacturerName : LUMI
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- modelId : lumi.plug.mmeu01
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- dateCode : 09-06-2019
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- powerSource : 1
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] --- genDeviceTempCfg
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- 65533 : 1
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- cid : genDeviceTempCfg
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- sid : attrs
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- currentTemperature : 30
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- devTempAlarmMask : 2
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- highTempThres : 65
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- highTempDwellTripPoint : 1
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] --- genIdentify
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- 65533 : 1
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- cid : genIdentify
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- sid : attrs
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- identifyTime : 0
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] --- genGroups
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- 65533 : 1
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- cid : genGroups
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- sid : attrs
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- nameSupport : 0
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] --- genScenes
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- 65533 : 1
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- cid : genScenes
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- sid : attrs
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- count : 0
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- currentScene : 0
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- currentGroup : 0
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- sceneValid : 0
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- nameSupport : 0
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- lastCfgBy : 0xffffffffffffffff
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] --- genOnOff
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- 245 : 50331392
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- 65533 : 1
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- cid : genOnOff
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- sid : attrs
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- onOff : 0
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- globalSceneCtrl : 1
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] --- genTime
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- cid : genTime
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- sid : attrs
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] --- genOta
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- cid : genOta
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- sid : attrs
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] - Endpoints: 1
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] -- Clusters:
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] --- zapp
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] --- genAnalogInput
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- 65533 : 1
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- cid : genAnalogInput
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- sid : attrs
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- outOfService : 0
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- presentValue : 0
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- statusFlags : 0
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- applicationType : 589824
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] - Endpoints: 2
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] -- Clusters:
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] --- zapp
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] --- genAnalogInput
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- 65533 : 1
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- cid : genAnalogInput
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- sid : attrs
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- outOfService : 0
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- presentValue : 0.21239805221557617
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- statusFlags : 0
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- applicationType : 720896
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] - Endpoints: 3
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] -- Clusters:
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] --- zapp
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] --- genGreenPowerProxy
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- cid : genGreenPowerProxy
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ---- sid : attrs
2020-02-25 20:33:25 [log] [ManagerDrivers] [plug.mmeu01] [0] ------------------------------------------
*/
