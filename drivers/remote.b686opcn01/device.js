'use strict';

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');

const util = require('../../lib/util');
const AqaraManufacturerSpecificCluster = require('../../lib/AqaraManufacturerSpecificCluster');

Cluster.addCluster(AqaraManufacturerSpecificCluster);

let lastKey = null;

class AqaraRemoteb686opcn01 extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    this.initAqaraMode();

    // supported scenes and their reported attribute numbers (all based on reported data)
    this.buttonMap = {
      1: 'Button 1',
      2: 'Button 2',
      3: 'Button 3',
      4: 'Button 4',
      5: 'Button 5',
      6: 'Button 6',
    };

    this.sceneMap = {
      1: 'Key Pressed 1 time',
      2: 'Key Pressed 2 times',
      3: 'Key Pressed 3 times',
      0: 'Key Held Down',
      255: 'Key Released',
    };

    // In order to handle the attribute reports, bind a listener
    zclNode.endpoints[1].clusters[CLUSTER.MULTI_STATE_INPUT.NAME]
      .on('attr.presentValue', this.onPresentValueAttributeReport.bind(this, 1));

    zclNode.endpoints[2].clusters[CLUSTER.MULTI_STATE_INPUT.NAME]
      .on('attr.presentValue', this.onPresentValueAttributeReport.bind(this, 2));

    zclNode.endpoints[3].clusters[CLUSTER.MULTI_STATE_INPUT.NAME]
      .on('attr.presentValue', this.onPresentValueAttributeReport.bind(this, 3));

    zclNode.endpoints[4].clusters[CLUSTER.MULTI_STATE_INPUT.NAME]
      .on('attr.presentValue', this.onPresentValueAttributeReport.bind(this, 4));

    zclNode.endpoints[5].clusters[CLUSTER.MULTI_STATE_INPUT.NAME]
      .on('attr.presentValue', this.onPresentValueAttributeReport.bind(this, 5));

    zclNode.endpoints[6].clusters[CLUSTER.MULTI_STATE_INPUT.NAME]
      .on('attr.presentValue', this.onPresentValueAttributeReport.bind(this, 6));

    zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME]
      .on('attr.aqaraLifeline', this.onAqaraLifelineAttributeReport.bind(this));

    // define and register FlowCardTriggers
    this.onSceneAutocomplete = this.onSceneAutocomplete.bind(this);

    // define and register FlowCardTriggers
    this.onButtonAutocomplete = this.onButtonAutocomplete.bind(this);
  }

  async initAqaraMode() {
    // Set Aqara Opple mode to 1 to force sending messages
    if (this.isFirstInit()) {
      try {
        await this.zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME].writeAttributes({ mode: 1 });
      } catch (err) {
        this.error('failed to write mode attributes', err);
      }
    }
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
  onAqaraLifelineAttributeReport({
    batteryVoltage,
  } = {}) {
    if (typeof batteryVoltage === 'number') {
      this.onBatteryVoltageAttributeReport('AqaraLifeline', 'batteryVoltage', batteryVoltage / 100);
    }
  }

}
module.exports = AqaraRemoteb686opcn01;

// WXKG12LM_sensor_switch.aq3
/*
Node overview:
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ------------------------------------------
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] Node: ef00bd72-0e00-4fc7-9f75-f90ed8df3a44
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] - Battery: true
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] - Endpoints: 0
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] -- Clusters:
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] --- zapp
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] --- genBasic
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- 9 : 224
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- 10 : bwl
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- 11 : www.aqara.com
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- 65533 : 1
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- cid : genBasic
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- sid : attrs
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- zclVersion : 3
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- appVersion : 17
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- stackVersion : 2
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- hwVersion : 1
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- manufacturerName : LUMI
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- modelId : lumi.remote.b686opcn01
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- dateCode : 20190730
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- powerSource : 3
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- appProfileVersion : 255
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- swBuildId : 2019www.
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] --- genPowerCfg
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- 65533 : 1
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- cid : genPowerCfg
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- sid : attrs
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- batteryVoltage : 31
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- batterySize : 7
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- batteryQuantity : 1
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- batteryRatedVoltage : 30
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] --- genIdentify
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- 65533 : 1
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- cid : genIdentify
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- sid : attrs
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- identifyTime : 0
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] --- genOnOff
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- cid : genOnOff
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- sid : attrs
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] --- genLevelCtrl
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- cid : genLevelCtrl
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- sid : attrs
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] --- lightingColorCtrl
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- cid : lightingColorCtrl
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ---- sid : attrs
2020-02-25 16:08:47 [log] [ManagerDrivers] [remote.b686opcn01] [0] ------------------------------------------
*/
