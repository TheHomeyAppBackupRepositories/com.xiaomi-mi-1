'use strict';

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');

const util = require('../../lib/util');
const AqaraManufacturerSpecificCluster = require('../../lib/AqaraManufacturerSpecificCluster');

Cluster.addCluster(AqaraManufacturerSpecificCluster);

let lastKey = null;

class AqaraRemoteb286opcn01 extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    // Set Aqara Opple mode to 1 to force sending MULTI_STATE_INPUT messages
    if (this.isFirstInit()) {
      try {
        await zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME].writeAttributes({ mode: 1 });
      } catch (err) {
        this.error('failed to read  attributes', err);
      }
    }

    // supported scenes and their reported attribute numbers (all based on reported data)
    this.buttonMap = {
      1: 'Button 1',
      2: 'Button 2',
    };

    this.sceneMap = {
      1: 'Key Pressed 1 time',
      2: 'Key Pressed 2 times',
      3: 'Key Pressed 3 times',
      0: 'Key Held Down',
      255: 'Key Released',
    };

    if (this.isFirstInit()) {
      try {
        await zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME].writeAttributes({ mode: 1 });
      } catch (err) {
        this.error('failed to read  attributes', err);
      }
    }

    // In order to handle the attribute reports, bind a listener
    zclNode.endpoints[1].clusters[CLUSTER.MULTI_STATE_INPUT.NAME]
      .on('attr.presentValue', this.onPresentValueAttributeReport.bind(this, 1));

    zclNode.endpoints[2].clusters[CLUSTER.MULTI_STATE_INPUT.NAME]
      .on('attr.presentValue', this.onPresentValueAttributeReport.bind(this, 2));

    zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME]
      .on('attr.aqaraLifeline', this.onAqaraLifelineAttributeReport.bind(this));

    // define and register FlowCardTriggers
    this.onSceneAutocomplete = this.onSceneAutocomplete.bind(this);

    // define and register FlowCardTriggers
    this.onButtonAutocomplete = this.onButtonAutocomplete.bind(this);
  }

  onPresentValueAttributeReport(repButton, repScene) {
    this.log('MultistateInputCluster - presentValue', this.buttonMap[repButton], this.sceneMap[repScene], 'lastKey', lastKey);
    if (lastKey !== `${repButton} ${repScene}`) {
      lastKey = `${repButton} ${repScene}`;
      if (Object.keys(this.sceneMap).includes(repScene.toString())) {
        const remoteValue = {
          button: this.buttonMap[repButton],
          scene: this.sceneMap[repScene],
        };
        this.debug('Scene and Button triggers', remoteValue);
        // Trigger the trigger card with 1 dropdown option
        this.triggerFlow({
          id: 'trigger_button2_scene',
          tokens: null,
          state: remoteValue,
        })
          .catch(err => this.error('Error triggering button1SceneTriggerDevice', err));

        // Trigger the trigger card with tokens
        this.triggerFlow({
          id: 'button2_button',
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

  onButtonAutocomplete(query, args, callback) {
    let resultArray = [];
    for (const sceneID in this.buttonMap) {
      resultArray.push({
        id: this.buttonMap[sceneID],
        name: this.homey.__(this.buttonMap[sceneID]),
      });
    }

    // filter for query
    resultArray = resultArray.filter(result => {
      return result.name.toLowerCase().indexOf(query.toLowerCase()) > -1;
    });
    this.debug(resultArray);
    return Promise.resolve(resultArray);
  }

  /**
   * This is Xiaomi's custom lifeline attribute, it contains a lot of data, af which the most
   * interesting the battery level. The battery level divided by 1000 represents the battery
   * voltage. If the battery voltage drops below 2600 (2.6V) we assume it is almost empty, based
   * on the battery voltage curve of a CR1632.
   * @param {{batteryLevel: number}} lifeline
   */
  onAqaraLifelineAttributeReport({
    batteryVoltage,
  } = {}) {
    if (typeof batteryVoltage === 'number') {
      const parsedBatPct = util.calculateBatteryPercentage(batteryVoltage, '3V_2500');
      this.log('lifeline attribute report', {
        batteryVoltage,
      }, 'parsedBatteryPct', parsedBatPct);
      this.setCapabilityValue('measure_battery', parsedBatPct).catch(this.error);
      this.setCapabilityValue('alarm_battery', parsedBatPct < 20).catch(this.error);
    }
  }

}
module.exports = AqaraRemoteb286opcn01;

// WXKG12LM_sensor_switch.aq3
/*
Node overview:
2018-10-13 17:37:48 [log] [ManagerDrivers] [remote.b286acn01] [0] ZigBeeDevice has been inited
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] ------------------------------------------
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] Node: 94d963cd-7751-4ed6-a799-e4bd841a6bc4
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] - Battery: false
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] - Endpoints: 0
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] -- Clusters:
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] --- zapp
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] --- genBasic
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- cid : genBasic
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- sid : attrs
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] --- genIdentify
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- cid : genIdentify
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- sid : attrs
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] --- genGroups
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- cid : genGroups
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- sid : attrs
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] --- genScenes
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- cid : genScenes
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- sid : attrs
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] --- genMultistateInput
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- cid : genMultistateInput
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- sid : attrs
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] --- genOta
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- cid : genOta
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- sid : attrs
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] --- manuSpecificCluster
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- cid : manuSpecificCluster
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- sid : attrs
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] - Endpoints: 1
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] -- Clusters:
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] --- zapp
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] --- genIdentify
2018-10-13 17:37:49 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- cid : genIdentify
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- sid : attrs
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] --- genGroups
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- cid : genGroups
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- sid : attrs
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] --- genScenes
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- cid : genScenes
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- sid : attrs
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] --- genMultistateInput
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- cid : genMultistateInput
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- sid : attrs
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] - Endpoints: 2
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] -- Clusters:
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] --- zapp
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] --- genIdentify
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- cid : genIdentify
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- sid : attrs
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] --- genGroups
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- cid : genGroups
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- sid : attrs
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] --- genScenes
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- cid : genScenes
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- sid : attrs
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] --- genAnalogInput
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- cid : genAnalogInput
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] ---- sid : attrs
2018-10-13 17:37:50 [log] [ManagerDrivers] [remote.b286acn01] [0] ------------------------------------------
*/
