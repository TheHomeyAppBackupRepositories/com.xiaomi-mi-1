// SDK3 updated: DONE

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const {
  debug, Cluster, CLUSTER,
} = require('zigbee-clusters');

const XiaomiBasicCluster = require('../../lib/XiaomiBasicCluster');

Cluster.addCluster(XiaomiBasicCluster);

class AqaraWallSwitchSingleLN extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: 1,
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
        endpoint: 2,
      });
    }

    // meter_power switch
    // applicationType : 720896 = 0x0B0000 Energy in kWH
    // Register meter_power capability
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
        endpoint: 3,
      });
    }

    // measure_voltage
    if (this.hasCapability('measure_voltage')) {
      await this.removeCapability('measure_voltage').catch(this.error);
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
    state,
  } = {}) {
    this.log('lifeline attribute report', {
      state,
    });

    if (typeof state === 'number') {
      this.setCapabilityValue('onoff', state === 1).catch(this.error);
    }
  }

}

module.exports = AqaraWallSwitchSingleLN;

/*
Product ID: QBKG11LM
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ------------------------------------------
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] Node: 897c2809-5948-4025-bbfe-877e2c9b51b4
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] - Battery: false
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] - Endpoints: 0
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] -- Clusters:
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] --- zapp
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] --- genBasic
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- cid : genBasic
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- sid : attrs
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- zclVersion : 1
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- appVersion : 31
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- stackVersion : 2
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- hwVersion : 18
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- manufacturerName : LUMI
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- modelId : lumi.ctrl_ln1.aq1
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- dateCode : 10-11-2017
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- powerSource : 1
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] --- genPowerCfg
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- cid : genPowerCfg
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- sid : attrs
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- mainsVoltage : 2244
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] --- genDeviceTempCfg
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- cid : genDeviceTempCfg
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- sid : attrs
2018-07-16 18:47:47 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- currentTemperature : 25
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] --- genIdentify
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- cid : genIdentify
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- sid : attrs
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- identifyTime : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] --- genGroups
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- cid : genGroups
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- sid : attrs
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- nameSupport : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] --- genScenes
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- cid : genScenes
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- sid : attrs
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- count : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- currentScene : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- currentGroup : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- sceneValid : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- nameSupport : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- lastCfgBy : 0xffffffffffffffff
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] --- genOnOff
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- cid : genOnOff
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- sid : attrs
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- onOff : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] --- genTime
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- cid : genTime
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- sid : attrs
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] --- genBinaryOutput
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- cid : genBinaryOutput
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- sid : attrs
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- outOfService : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- presentValue : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- statusFlags : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] --- genOta
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- cid : genOta
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- sid : attrs
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] - Endpoints: 1
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] -- Clusters:
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] --- zapp
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] --- genGroups
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- cid : genGroups
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- sid : attrs
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] --- genAnalogInput
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- 261 : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- 262 : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- cid : genAnalogInput
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- sid : attrs
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- outOfService : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- presentValue : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- statusFlags : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- applicationType : 589824
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] - Endpoints: 2
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] -- Clusters:
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] --- zapp
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] --- genAnalogInput
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- 261 : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- 262 : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- cid : genAnalogInput
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- sid : attrs
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- outOfService : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- presentValue : 0.0034527250099927187
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- statusFlags : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- applicationType : 720896
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] - Endpoints: 3
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] -- Clusters:
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] --- zapp
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] --- genBinaryOutput
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- cid : genBinaryOutput
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- sid : attrs
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- outOfService : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- presentValue : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- statusFlags : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] --- genMultistateInput
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- cid : genMultistateInput
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- sid : attrs
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- numberOfStates : 6
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- outOfService : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- presentValue : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ---- statusFlags : 0
2018-07-16 18:47:48 [log] [ManagerDrivers] [ctrl_ln1.aq1] [0] ------------------------------------------
*/
