// SDK3 updated & validated: DONE

'use strict';

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, CLUSTER, debug } = require('zigbee-clusters');

const util = require('../../lib/util');
const XiaomiSpecificOnOffCluster = require('../../lib/XiaomiSpecificOnOffCluster');
const XiaomiBasicCluster = require('../../lib/XiaomiBasicCluster');

Cluster.addCluster(XiaomiBasicCluster);
Cluster.addCluster(XiaomiSpecificOnOffCluster);

let keyHeld = false;
let lastKey = null;

class XiaomiWirelessSwitch extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    // Add battery capabilities
    if (!this.hasCapability('alarm_battery')) {
      await this.addCapability('alarm_battery').catch(this.error);
    }

    if (!this.hasCapability('measure_battery')) {
      await this.addCapability('measure_battery').catch(this.error);
    }

    // supported scenes and their reported attribute numbers (1 - 4 based on reported data, 90,91 custom code)
    this.sceneMap = {
      1: 'Key Pressed 1 time',
      2: 'Key Pressed 2 times',
      3: 'Key Pressed 3 times',
      4: 'Key Pressed 4 times',
      90: 'Key Held Down',
      91: 'Key Released',
    };

    zclNode.endpoints[1].clusters[CLUSTER.ON_OFF.NAME]
      .on('attr.onOff', this.onOnOffAttributeReport.bind(this));

    zclNode.endpoints[1].clusters[CLUSTER.ON_OFF.NAME]
      .on('attr.xiaomiOnOffScene', this.onOnOffAttributeReport.bind(this));

    // Lifeline
    zclNode.endpoints[1].clusters[XiaomiBasicCluster.NAME]
      .on('attr.xiaomiLifeline2', this.onXiaomiLifelineAttributeReport.bind(this));

    // define and register FlowCardTriggers
    this.onSceneAutocomplete = this.onSceneAutocomplete.bind(this);
  }

  onOnOffAttributeReport(repScene) {
    repScene = Number(repScene);
    this.log('genOnOff - onOff', repScene, 'lastKey', lastKey, 'keyHeld', keyHeld);
    if (lastKey !== repScene) {
      lastKey = repScene;
      let remoteValue = null;

      if (repScene === 0) {
        keyHeld = false;
        this.buttonHeldTimeout = setTimeout(() => {
          keyHeld = true;
          remoteValue = {
            scene: this.sceneMap[90],
          };
          this.debug('Scene and Button triggers', remoteValue);
          // Trigger the trigger card with 1 dropdown option
          this.triggerFlow({
            id: 'trigger_button1_scene',
            tokens: null,
            state: remoteValue,
          })
            .catch(err => this.error('Error triggering button1SceneTriggerDevice', err));

          // Trigger the trigger card with tokens
          this.triggerFlow({
            id: 'button1_button',
            tokens: remoteValue,
            state: remoteValue,
          })
            .catch(err => this.error('Error triggering button1ButtonTriggerDevice', err));
        }, (this.getSetting('button_long_press_threshold') || 1000));
      }
      if (repScene !== 0 && Object.keys(this.sceneMap).includes(repScene.toString())) {
        clearTimeout(this.buttonHeldTimeout);
        remoteValue = {
          scene: this.sceneMap[keyHeld && repScene === 1 ? 91 : repScene],
        };

        this.debug('Scene and Button triggers', remoteValue);
        // Trigger the trigger card with 1 dropdown option
        this.triggerFlow({
          id: 'trigger_button1_scene',
          tokens: null,
          state: remoteValue,
        })
          .catch(err => this.error('Error triggering button1SceneTriggerDevice', err));

        // Trigger the trigger card with tokens
        this.triggerFlow({
          id: 'button1_button',
          tokens: remoteValue,
          state: remoteValue,
        })
          .catch(err => this.error('Error triggering button1ButtonTriggerDevice', err));

        // reset lastKey after the last trigger
        this.buttonLastKeyTimeout = setTimeout(() => {
          lastKey = null;
        }, 3000);
      }
    }
  }

  onSceneAutocomplete(query, args, callback) {
    let resultArray = [];
    for (const sceneID in this.sceneMap) {
      resultArray.push({
        id: this.sceneMap[sceneID],
        name: this.homey.__(this.sceneMap[sceneID]),
      });
    }
    // filter for query
    resultArray = resultArray.filter(result => {
      return result.name.toLowerCase().indexOf(query.toLowerCase()) > -1;
    });
    this.debug(resultArray);
    return Promise.resolve(resultArray);
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
  onXiaomiLifelineAttributeReport(attributeBuffer) {
    const batteryVoltage = attributeBuffer.readUInt16LE(5);
    if (typeof batteryVoltage === 'number') {
      this.onBatteryVoltageAttributeReport('AqaraLifeline', 'batteryVoltage', batteryVoltage / 100);
    }
  }

}
module.exports = XiaomiWirelessSwitch;

// sensor_switch
/*
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] ZigBeeDevice has been inited
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] ------------------------------------------
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] Node: 8dd56393-7c25-4191-bc4d-7b87d44ae5fb
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] - Battery: false
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] - Endpoints: 0
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] -- Clusters:
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] --- zapp
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] --- genBasic
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] ---- cid : genBasic
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] ---- sid : attrs
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] ---- modelId : lumi.sensor_switch
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] --- genIdentify
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] ---- cid : genIdentify
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] ---- sid : attrs
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] --- genGroups
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] ---- cid : genGroups
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] ---- sid : attrs
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] --- genScenes
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] ---- cid : genScenes
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] ---- sid : attrs
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] --- genOnOff
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] ---- cid : genOnOff
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] ---- sid : attrs
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] ---- onOff : 1
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] --- genLevelCtrl
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] ---- cid : genLevelCtrl
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] ---- sid : attrs
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] --- genOta
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] ---- cid : genOta
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] ---- sid : attrs
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] --- manuSpecificCluster
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] ---- cid : manuSpecificCluster
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] ---- sid : attrs
2017-10-23 21:26:29 [log] [ManagerDrivers] [sensor_switch] [0] ------------------------------------------
*/
