// TODO:
// This option allows to inter connect the relays which will make sure that only one relay is on at a time. 'genBinaryOutput', {0xff06: {value: value ? 0x01 : 0x00, type: 0x10}}, manufacturerOptions.xiaomi)

'use strict';

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const {
  debug, Cluster, CLUSTER,
} = require('zigbee-clusters');

const XiaomiBasicCluster = require('../../lib/XiaomiBasicCluster');

Cluster.addCluster(XiaomiBasicCluster);

class AqaraDoubleRelay extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    this.endpointIds = {
      firstOutlet: 1,
      secondOutlet: 2,
    };

    const subDeviceId = this.isSubDevice() ? this.getData().subDeviceId : 'firstOutlet';
    this.log('Initializing', subDeviceId, 'at endpoint', this.endpointIds[subDeviceId]);

    // Register capabilities and reportListeners for Left switch
    if (this.hasCapability('onoff')) {
      this.log('Register OnOff capability:', subDeviceId, 'at endpoint', this.endpointIds[subDeviceId]);
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: this.endpointIds[subDeviceId],
      });
    }

    // measure_power switch
    // applicationType : 589824 = 0x090000 Power in Watts
    // Register measure_power capability
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
        endpoint: 1,
      });
    }

    // Register the AttributeReportListener - Lifeline
    zclNode.endpoints[1].clusters[XiaomiBasicCluster.NAME]
      .on('attr.xiaomiLifeline', this.onXiaomiLifelineAttributeReport.bind(this));
  }

  /**
   * This is Xiaomi's custom lifeline attribute, it contains a lot of data, af which the most
   * interesting the battery level. The battery level divided by 1000 represents the battery
   * voltage. If the battery voltage drops below 2600 (2.6V) we assume it is almost empty, based
   * on the battery voltage curve of a CR1632.
   * @param {{batteryLevel: number}} lifeline
   */
  onXiaomiLifelineAttributeReport({
    state, state1,
  } = {}) {
    this.log('lifeline attribute report', {
      state, state1,
    });

    if (typeof state === 'number') {
      this.setCapabilityValue('onoff', state === 1).catch(this.error);
    }

    if (typeof state1 === 'number') {
      this.setCapabilityValue('onoff.1', state1 === 1).catch(this.error);
    }
  }

}

module.exports = AqaraDoubleRelay;

/*
Product ID: LLKZMK11LM
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ZigBeeDevice has been inited
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ------------------------------------------
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] Node: 42c7e365-10d0-4108-8ce6-d475cf81efe9
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] - Battery: false
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] - Endpoints: 0
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] -- Clusters:
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] --- zapp
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] --- genBasic
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- cid : genBasic
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- sid : attrs
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- zclVersion : 0
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- appVersion : 35
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- stackVersion : 2
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- hwVersion : 18
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- manufacturerName : LUMI
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- modelId : lumi.relay.c2acn01
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- dateCode : 09-20-2018
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- powerSource : 4
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- locationDesc :
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- alarmMask : 0
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] --- genPowerCfg
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- cid : genPowerCfg
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- sid : attrs
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- mainsVoltage : 0
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- mainsAlarmMask : 0
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- batteryVoltage : 0
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] --- genDeviceTempCfg
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- cid : genDeviceTempCfg
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- sid : attrs
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- currentTemperature : 33
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- lowTempThres : 45
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- highTempThres : 60
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] --- genIdentify
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- cid : genIdentify
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- sid : attrs
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- identifyTime : 0
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] --- genGroups
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- cid : genGroups
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- sid : attrs
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- nameSupport : 128
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] --- genScenes
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- cid : genScenes
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- sid : attrs
2019-09-15 22:03:29 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- count : 0
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- currentScene : 0
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- currentGroup : 0
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- sceneValid : 0
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- nameSupport : 0
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- lastCfgBy : 0xffffffffffffffff
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] --- genOnOff
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- cid : genOnOff
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- sid : attrs
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- onOff : 0
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] --- genTime
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- cid : genTime
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- sid : attrs
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- time : 0
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- timeStatus : 0
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] --- genAnalogInput
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- cid : genAnalogInput
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- sid : attrs
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- description : CHANN
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- maxPresentValue : 2500
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- outOfService : 0
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- presentValue : 0
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- statusFlags : 0
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] --- genBinaryOutput
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- cid : genBinaryOutput
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- sid : attrs
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- activeText : ON
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- description : CHANNEL1
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- inactiveText : OFF
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- minimumOffTime : 100000
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- minimumOnTime : 100000
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- outOfService : 0
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- presentValue : 0
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- statusFlags : 0
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- applicationType : 67109376
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] --- genOta
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- cid : genOta
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- sid : attrs
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] --- haElectricalMeasurement
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- cid : haElectricalMeasurement
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- sid : attrs
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- measurementType : 1
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- acFrequency : 65535
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- rmsVoltage : 65535
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- rmsCurrent : 65535
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- activePower : -1
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- powerFactor : 0
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] - Endpoints: 1
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] -- Clusters:
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] --- zapp
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] --- genGroups
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- cid : genGroups
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- sid : attrs
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- nameSupport : 128
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] --- genScenes
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- cid : genScenes
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- sid : attrs
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- count : 0
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- currentScene : 0
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- currentGroup : 0
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- sceneValid : 0
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- nameSupport : 0
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- lastCfgBy : 0xffffffffffffffff
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] --- genOnOff
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- cid : genOnOff
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- sid : attrs
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- onOff : 0
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] --- genBinaryOutput
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- cid : genBinaryOutput
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- sid : attrs
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- activeText : ON
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- description : CHANNEL2
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- inactiveText : OFF
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- minimumOffTime : 100000
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- minimumOnTime : 100000
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- outOfService : 0
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- presentValue : 0
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- statusFlags : 0
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ---- applicationType : 67109377
2019-09-15 22:03:30 [log] [ManagerDrivers] [relay.c2acn01] [0] ------------------------------------------

Captures:
Interlock mode: Endpoint 1, genBinaryOutput, 0xff06, bool,
*/
