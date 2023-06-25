'use strict';

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const {
  debug, Cluster, CLUSTER,
} = require('zigbee-clusters');

const XiaomiBasicCluster = require('../../lib/XiaomiBasicCluster');

Cluster.addCluster(XiaomiBasicCluster);

class AqaraSocket extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    // OnOff capability
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: 1,
      });
    }

    // measure_power
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

    // meter_power
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

module.exports = AqaraSocket;
/*
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] ZigBeeDevice has been inited
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] ------------------------------------------
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] Node: c1c03f62-2f9a-4109-99f7-49357bf29be4
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] - Battery: false
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] - Endpoints: 0
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] -- Clusters:
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] --- zapp
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] --- genBasic
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] ---- cid : genBasic
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] ---- sid : attrs
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] ---- zclVersion : 1
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] ---- appVersion : 22
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] ---- stackVersion : 2
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] ---- hwVersion : 18
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] ---- manufacturerName : LUMI
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] ---- modelId : lumi.plug
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] ---- dateCode : 02-28-2017
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] ---- powerSource : 1
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] --- genPowerCfg
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] ---- cid : genPowerCfg
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] ---- sid : attrs
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] ---- mainsVoltage : 2310
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] ---- mainsAlarmMask : 0
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] --- genDeviceTempCfg
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] ---- cid : genDeviceTempCfg
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] ---- sid : attrs
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] ---- currentTemperature : 25
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] ---- lowTempThres : 55
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] ---- highTempThres : 60
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] --- genIdentify
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] ---- cid : genIdentify
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] ---- sid : attrs
2018-01-14 09:13:49 [log] [ManagerDrivers] [plug] [0] ---- identifyTime : 0
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] --- genGroups
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- cid : genGroups
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- sid : attrs
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- nameSupport : 0
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] --- genScenes
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- cid : genScenes
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- sid : attrs
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- count : 0
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- currentScene : 0
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- currentGroup : 0
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- sceneValid : 0
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- nameSupport : 0
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- lastCfgBy : 0xffffffffffffffff
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] --- genOnOff
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- 61440 : 61443584
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- cid : genOnOff
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- sid : attrs
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- onOff : 1
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] --- genTime
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- cid : genTime
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- sid : attrs
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] --- genBinaryOutput
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- cid : genBinaryOutput
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- sid : attrs
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- activeText :
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- inactiveText :
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- outOfService : 0
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- presentValue : 0
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- statusFlags : 0
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] --- genOta
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- cid : genOta
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- sid : attrs
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] - Endpoints: 1
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] -- Clusters:
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] --- zapp
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] --- genGroups
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- cid : genGroups
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- sid : attrs
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] --- genAnalogInput
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- 261 : 0
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- 262 : 0
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- cid : genAnalogInput
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- sid : attrs
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- maxPresentValue : 0
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- outOfService : 0
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- presentValue : 0
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- statusFlags : 0
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- applicationType : 589824
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] - Endpoints: 2
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] -- Clusters:
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] --- zapp
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] --- genAnalogInput
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- 261 : 0
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- 262 : 0
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- cid : genAnalogInput
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- sid : attrs
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- maxPresentValue : 0
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- outOfService : 0
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- presentValue : 0.00019502778013702482
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- statusFlags : 0
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- applicationType : 720896
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] - Endpoints: 3
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] -- Clusters:
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] --- zapp
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] --- genGroups
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- cid : genGroups
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- sid : attrs
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] --- genBinaryInput
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- cid : genBinaryInput
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ---- sid : attrs
2018-01-14 09:13:50 [log] [ManagerDrivers] [plug] [0] ------------------------------------------

Cluster: genBasic (0x0000)
Atribute: Unknown (0xfff0)
Data Type: Octet String (0x41), length: 9
Disabled indicator: 	aa8005d14739031001
Enabled indicator:  	aa8005d14738031000

Power failure memory
enabled:  						aa8005d1472a011001
disabled: 						aa8005d14729011000	aa8005d1472b011000

Charging protection
enabled:							aa8005d1472c021001
disabled:							aa8005d1472d021000

Cluster: genAnalogInput (0x000c)
Attribute: Max Present Value (0x0041)
Data Type: Single Precision Floating Point (0x39)
*/
