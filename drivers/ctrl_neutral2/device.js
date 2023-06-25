// SDK3 updated: DONE

'use strict';

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const {
  debug, Cluster, CLUSTER,
} = require('zigbee-clusters');

class AqaraWallSwitchDoubleL extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    // Register capabilities and reportListeners for Left switch
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: 2,
      });
    }

    // Register capabilities and reportListeners for Right switch
    if (this.hasCapability('onoff.1')) {
      this.registerCapability('onoff.1', CLUSTER.ON_OFF, {
        get: 'onOff',
        getOpts: {
          getOnStart: true,
        },
        set: value => (value ? 'setOn' : 'setOff'),
        /**
         * Return empty object, the command specifies the action for this cluster ('setOn'/setOff').
         * @returns {{}}
         */
        setParser: () => ({}),
        report: 'onOff',
        /**
         * @param {boolean} value
         * @returns {boolean}
         */
        reportParser(value) {
          const currentValue = this.getCapabilityValue('onoff.1');
          if (currentValue !== value) {
            this.triggerFlow({
              id: `trigger_switch2_turned_${value ? 'on' : 'off'}`,
              tokens: null,
              state: null,
            });
          }
          return value;
        },
        endpoint: 3,
      });
    }
  }

}

module.exports = AqaraWallSwitchDoubleL;

/*
Product ID: QBKG03LM
2018-01-14 10:00:22 [log] [ManagerDrivers] [ctrl_neutral2] [0] ZigBeeDevice has been inited
2018-01-14 10:00:22 [log] [ManagerDrivers] [ctrl_neutral2] [0] ------------------------------------------
2018-01-14 10:00:22 [log] [ManagerDrivers] [ctrl_neutral2] [0] Node: f0892c11-3cf9-4448-acb8-30691a9c43a3
2018-01-14 10:00:22 [log] [ManagerDrivers] [ctrl_neutral2] [0] - Battery: false
2018-01-14 10:00:22 [log] [ManagerDrivers] [ctrl_neutral2] [0] - Endpoints: 0
2018-01-14 10:00:22 [log] [ManagerDrivers] [ctrl_neutral2] [0] -- Clusters:
2018-01-14 10:00:22 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- zapp
2018-01-14 10:00:22 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- genBasic
2018-01-14 10:00:22 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- cid : genBasic
2018-01-14 10:00:22 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- sid : attrs
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- zclVersion : 0
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- appVersion : 18
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- stackVersion : 2
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- hwVersion : 38
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- manufacturerName : LUMI
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- modelId : lumi.ctrl_neutral2
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- dateCode : 11-11-2016
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- powerSource : 4
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- locationDesc :
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- genPowerCfg
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- cid : genPowerCfg
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- sid : attrs
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- mainsVoltage : 0
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- mainsAlarmMask : 0
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- batteryVoltage : 0
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- genDeviceTempCfg
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- cid : genDeviceTempCfg
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- sid : attrs
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- currentTemperature : 21
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- lowTempThres : 55
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- highTempThres : 60
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- genIdentify
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- cid : genIdentify
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- sid : attrs
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- identifyTime : 0
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- genTime
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- cid : genTime
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- sid : attrs
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- genOta
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- cid : genOta
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- sid : attrs
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] - Endpoints: 1
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] -- Clusters:
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- zapp
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- genGroups
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- cid : genGroups
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- sid : attrs
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- nameSupport : 128
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- genScenes
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- cid : genScenes
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- sid : attrs
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- count : 0
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- currentScene : 0
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- currentGroup : 0
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- sceneValid : 0
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- nameSupport : 128
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- genOnOff
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- 61440 : 53562368
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- cid : genOnOff
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- sid : attrs
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- onOff : 0
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- genBinaryOutput
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- cid : genBinaryOutput
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- sid : attrs
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- activeText : ON
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- description : CHANNEL1
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- inactiveText : OFF
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- minimumOffTime : 500000
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- minimumOnTime : 500000
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- outOfService : 0
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- presentValue : 0
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- statusFlags : 0
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- applicationType : 67109376
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] - Endpoints: 2
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] -- Clusters:
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- zapp
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- genGroups
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- cid : genGroups
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- sid : attrs
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- nameSupport : 128
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- genScenes
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- cid : genScenes
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- sid : attrs
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- count : 0
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- currentScene : 0
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- currentGroup : 0
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- sceneValid : 0
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- nameSupport : 128
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- genOnOff
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- cid : genOnOff
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- sid : attrs
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- onOff : 0
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- genBinaryOutput
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- cid : genBinaryOutput
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- sid : attrs
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- activeText : ON
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- description : CHANNEL2
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- inactiveText : OFF
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- minimumOffTime : 500000
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- minimumOnTime : 500000
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- outOfService : 0
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- presentValue : 0
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- statusFlags : 0
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- applicationType : 67109377
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] - Endpoints: 3
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] -- Clusters:
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- zapp
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- genOnOff
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- cid : genOnOff
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- sid : attrs
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- onOff : 1
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- genMultistateInput
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- cid : genMultistateInput
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- sid : attrs
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- numberOfStates : 4
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- outOfService : 0
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- presentValue : 0
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- statusFlags : 0
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] - Endpoints: 4
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] -- Clusters:
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- zapp
2018-01-14 10:00:23 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- genOnOff
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- cid : genOnOff
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- sid : attrs
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- onOff : 0
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- genMultistateInput
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- cid : genMultistateInput
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- sid : attrs
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- numberOfStates : 4
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- outOfService : 0
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- presentValue : 0
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- statusFlags : 0
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] - Endpoints: 5
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] -- Clusters:
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- zapp
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- genOnOff
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- cid : genOnOff
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- sid : attrs
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- onOff : 0
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- genMultistateInput
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- cid : genMultistateInput
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- sid : attrs
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- numberOfStates : 4
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- outOfService : 0
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- presentValue : 0
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- statusFlags : 0
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] - Endpoints: 6
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] -- Clusters:
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- zapp
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] --- genAnalogInput
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- cid : genAnalogInput
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- sid : attrs
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- description : POWER
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- maxPresentValue : 1600
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- minPresentValue : 0
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- outOfService : 0
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- presentValue : 0
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- resolution : 1
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- statusFlags : 0
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ---- applicationType : 590336
2018-01-14 10:00:24 [log] [ManagerDrivers] [ctrl_neutral2] [0] ------------------------------------------

Left button to a wireless switch:
Cluster: genBasic (0x0000)
Atribute: Unknown (0xff22) 65314
Data Type: 8-bit unsigned (0x20)
	disabled (regular switch): 18
	enabled: 254

Right button to a wireless switch:
Cluster: genBasic (0x0000)
Atribute: Unknown (0xff23) 65315
Data Type: 8-bit unsigned (0x20)
	disabled (regular switch): 18
	enabled: 254

When converted to a wireless switch:
Cluster: genOnOff (0x0006)
Atribute: onOff (0x0000)
1x click: Double attribute (off (0x00) + on (0x01))
2x click: data value 2 (0x02)
Hold: Off (0x00)
Release: ON (0x01)
*/
