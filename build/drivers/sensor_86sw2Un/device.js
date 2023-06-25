// SDK3 updated & validated: DONE

'use strict';

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');

const util = require('../../lib/util');
const XiaomiBasicCluster = require('../../lib/XiaomiBasicCluster');

Cluster.addCluster(XiaomiBasicCluster);

module.exports = class AqaraLightSwitchDouble extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // print the node's info to the console
    // this.printNode();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // add battery capabilities if needed
    if (!this.hasCapability('measure_battery')) {
      this.addCapability('measure_battery').catch(this.error);
    }
    if (!this.hasCapability('alarm_battery')) {
      this.addCapability('alarm_battery').catch(this.error);
    }

    this.buttonMap = {
      Left: 'Left button',
      Right: 'Right button',
      Both: 'Both buttons',
    };

    this.sceneMap = {
      0: 'Key Pressed 1 time',
    };

    zclNode.endpoints[1].clusters[CLUSTER.ON_OFF.NAME]
      .on('attr.onOff', this.onOnOffAttributeReport.bind(this, 'Left'));

    zclNode.endpoints[2].clusters[CLUSTER.ON_OFF.NAME]
      .on('attr.onOff', this.onOnOffAttributeReport.bind(this, 'Right'));

    zclNode.endpoints[3].clusters[CLUSTER.ON_OFF.NAME]
      .on('attr.onOff', this.onOnOffAttributeReport.bind(this, 'Both'));

    // Lifeline
    zclNode.endpoints[1].clusters[XiaomiBasicCluster.NAME]
      .on('attr.xiaomiLifeline', this.onXiaomiLifelineAttributeReport.bind(this));

    // define and register FlowCardTriggers
    this.onSceneAutocomplete = this.onSceneAutocomplete.bind(this);

    // define and register FlowCardTriggers
    this.onButtonAutocomplete = this.onButtonAutocomplete.bind(this);
  }

  /**
     * This is Xiaomi's custom lifeline attribute, it contains a lot of data, af which the most
     * interesting the battery level. The battery level divided by 1000 represents the battery
     * voltage. If the battery voltage drops below 2600 (2.6V) we assume it is almost empty, based
     * on the battery voltage curve of a CR1632.
     * @param {{batteryLevel: number}} lifeline
     */
  onXiaomiLifelineAttributeReport({
    batteryVoltage,
  } = {}) {
    if (typeof batteryVoltage === 'number') {
      const parsedBatPct = util.calculateBatteryPercentage(batteryVoltage, '3V_2100');
      this.log('lifeline attribute report', batteryVoltage, 'parsedBatteryPct', parsedBatPct);
      this.setCapabilityValue('measure_battery', parsedBatPct).catch(this.error);
      this.setCapabilityValue('alarm_battery', parsedBatPct < 20).catch(this.error);
    }
  }

  /**
     * This attribute is reported when the contact alarm of the door and window sensor changes.
     * @param {boolean} onOff
     */
  onOnOffAttributeReport(repButton, repScene) {
    repScene = Number(repScene);
    this.log('genOnOff - onOff', repScene, repButton, 'button', Object.keys(this.sceneMap).includes(repScene.toString()));
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

};

// WXKG02LM
/*
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ------------------------------------------
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] Node: 1185fec2-4b26-438d-aaa9-7a54ee4486a9
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] - Battery: false
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] - Endpoints: 0
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] -- Clusters:
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] --- zapp
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] --- genBasic
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- cid : genBasic
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- sid : attrs
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] --- genIdentify
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- cid : genIdentify
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- sid : attrs
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] --- genGroups
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- cid : genGroups
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- sid : attrs
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] --- genScenes
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- cid : genScenes
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- sid : attrs
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] --- genMultistateInput
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- cid : genMultistateInput
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- sid : attrs
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] --- genOta
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- cid : genOta
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- sid : attrs
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] --- manuSpecificCluster
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- cid : manuSpecificCluster
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- sid : attrs
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] - Endpoints: 1
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] -- Clusters:
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] --- zapp
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] --- genIdentify
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- cid : genIdentify
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- sid : attrs
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] --- genGroups
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- cid : genGroups
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- sid : attrs
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] --- genScenes
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- cid : genScenes
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- sid : attrs
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] --- genMultistateInput
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- cid : genMultistateInput
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- sid : attrs
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] - Endpoints: 2
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] -- Clusters:
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] --- zapp
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] --- genIdentify
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- cid : genIdentify
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- sid : attrs
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] --- genGroups
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- cid : genGroups
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- sid : attrs
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] --- genScenes
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- cid : genScenes
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- sid : attrs
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] --- genAnalogInput
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- cid : genAnalogInput
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ---- sid : attrs
2017-10-22 23:20:10 [log] [ManagerDrivers] [sensor_86sw2Un] [0] ------------------------------------------
*/
