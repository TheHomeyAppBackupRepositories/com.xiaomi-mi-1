// SDK3 updated & validated

'use strict';

const { ZigBeeLightDevice } = require('homey-zigbeedriver');
const {
  debug, Cluster, CLUSTER,
} = require('zigbee-clusters');

class AqaraTunableBulb extends ZigBeeLightDevice {

  async onNodeInit({ zclNode }) {
    this.setStoreValue('colorTempMin', 153).catch(this.error); // 6500K = 153 Mired
    this.setStoreValue('colorTempMax', 370).catch(this.error); // 2700K = 370 Mired

    await super.onNodeInit({ zclNode, supportsHueAndSaturation: false, supportsColorTemperature: true });

    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();
  }

}

module.exports = AqaraTunableBulb;

/*

2700K - 6500K = 370 - 153 Mired
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ------------------------------------------
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] Node: 0f639a36-c76d-4cdb-9f73-1ab1b5ad5839
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] - Battery: false
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] - Endpoints: 0
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] -- Clusters:
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] --- zapp
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] --- genBasic
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- cid : genBasic
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- sid : attrs
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- zclVersion : 1
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- appVersion : 22
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- stackVersion : 2
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- hwVersion : 1
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- manufacturerName : LUMI
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- modelId : lumi.light.aqcn02
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- dateCode : 09-30-2018
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- powerSource : 4
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- swBuildId : 1.22
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] --- genPowerCfg
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- cid : genPowerCfg
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- sid : attrs
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- mainsVoltage : 0
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] --- genIdentify
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- cid : genIdentify
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- sid : attrs
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- identifyTime : 0
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] --- genGroups
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- cid : genGroups
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- sid : attrs
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- nameSupport : 0
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] --- genScenes
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- cid : genScenes
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- sid : attrs
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- count : 0
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- currentScene : 0
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- currentGroup : 0
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- sceneValid : 0
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- nameSupport : 0
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- lastCfgBy : 0xffffffffffffffff
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] --- genOnOff
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- cid : genOnOff
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- sid : attrs
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- onOff : 1
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- onTime : 0
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- offWaitTime : 0
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] --- genLevelCtrl
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- cid : genLevelCtrl
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- sid : attrs
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- currentLevel : 255
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- remainingTime : 0
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- onOffTransitionTime : 150
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] --- genTime
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- cid : genTime
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- sid : attrs
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] --- genAnalogOutput
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- cid : genAnalogOutput
2019-02-10 11:34:55 [log] [ManagerDrivers] [light.aqcn02] [0] ---- sid : attrs
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] --- genMultistateOutput
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] ---- cid : genMultistateOutput
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] ---- sid : attrs
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] --- genOta
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] ---- cid : genOta
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] ---- sid : attrs
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] --- closuresWindowCovering
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] ---- cid : closuresWindowCovering
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] ---- sid : attrs
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] --- lightingColorCtrl
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] ---- cid : lightingColorCtrl
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] ---- sid : attrs
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] ---- remainingTime : 0
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] ---- currentX : 20650
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] ---- currentY : 21396
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] ---- colorTemperature : 153
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] ---- colorMode : 1
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] ---- colorTempPhysicalMin : 0
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] ---- colorTempPhysicalMax : 65279
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] --- msTemperatureMeasurement
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] ---- cid : msTemperatureMeasurement
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] ---- sid : attrs
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] --- msPressureMeasurement
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] ---- cid : msPressureMeasurement
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] ---- sid : attrs
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] --- msRelativeHumidity
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] ---- cid : msRelativeHumidity
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] ---- sid : attrs
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] --- msOccupancySensing
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] ---- cid : msOccupancySensing
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] ---- sid : attrs
2019-02-10 11:34:56 [log] [ManagerDrivers] [light.aqcn02] [0] ------------------------------------------
*/
