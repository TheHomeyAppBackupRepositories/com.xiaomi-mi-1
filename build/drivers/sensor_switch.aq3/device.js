// SDK3 updated & validated: DONE

'use strict';

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');

const util = require('../../lib/util');
const XiaomiBasicCluster = require('../../lib/XiaomiBasicCluster');

Cluster.addCluster(XiaomiBasicCluster);

let lastKey = null;

class AqaraWirelessSwitchAq3 extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    // supported scenes and their reported attribute numbers (all based on reported data)
    this.sceneMap = {
      1: 'Key Pressed 1 time',
      2: 'Key Pressed 2 times',
      16: 'Key Held Down',
      17: 'Key Released',
      18: 'Shaken',
    };

    zclNode.endpoints[1].clusters[CLUSTER.MULTI_STATE_INPUT.NAME]
      .on('attr.presentValue', this.onPresentValueAttributeReport.bind(this));

    zclNode.endpoints[1].clusters[XiaomiBasicCluster.NAME]
      .on('attr.xiaomiLifeline', this.onXiaomiLifelineAttributeReport.bind(this));

    // define and register FlowCardTriggers
    this.onSceneAutocomplete = this.onSceneAutocomplete.bind(this);
  }

  onPresentValueAttributeReport(repScene) {
    this.log('MultistateInputCluster - presentValue', repScene, this.sceneMap[repScene], 'lastKey', lastKey);

    if (lastKey !== repScene) {
      lastKey = repScene;
      if (Object.keys(this.sceneMap).includes(repScene.toString())) {
        const remoteValue = {
          scene: this.sceneMap[repScene],
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

}
module.exports = AqaraWirelessSwitchAq3;

// WXKG12LM_sensor_switch.aq3
/*
Node overview:
2018-03-27 23:54:02 [log] [ManagerDrivers] [sensor_switch.aq3] [0] ZigBeeDevice has been inited
2018-03-27 23:54:02 [log] [ManagerDrivers] [sensor_switch.aq3] [0] ------------------------------------------
2018-03-27 23:54:02 [log] [ManagerDrivers] [sensor_switch.aq3] [0] Node: 609c6602-98b4-42ae-8aba-a50a22a01977
2018-03-27 23:54:02 [log] [ManagerDrivers] [sensor_switch.aq3] [0] - Battery: false
2018-03-27 23:54:02 [log] [ManagerDrivers] [sensor_switch.aq3] [0] - Endpoints: 0
2018-03-27 23:54:02 [log] [ManagerDrivers] [sensor_switch.aq3] [0] -- Clusters:
2018-03-27 23:54:02 [log] [ManagerDrivers] [sensor_switch.aq3] [0] --- zapp
2018-03-27 23:54:02 [log] [ManagerDrivers] [sensor_switch.aq3] [0] --- genBasic
2018-03-27 23:54:02 [log] [ManagerDrivers] [sensor_switch.aq3] [0] ---- cid : genBasic
2018-03-27 23:54:02 [log] [ManagerDrivers] [sensor_switch.aq3] [0] ---- sid : attrs
2018-03-27 23:54:02 [log] [ManagerDrivers] [sensor_switch.aq3] [0] ---- manufacturerName : LUMI
2018-03-27 23:54:02 [log] [ManagerDrivers] [sensor_switch.aq3] [0] ---- modelId : lumi.sensor_swit
2018-03-27 23:54:02 [log] [ManagerDrivers] [sensor_switch.aq3] [0] --- genPowerCfg
2018-03-27 23:54:02 [log] [ManagerDrivers] [sensor_switch.aq3] [0] ---- cid : genPowerCfg
2018-03-27 23:54:02 [log] [ManagerDrivers] [sensor_switch.aq3] [0] ---- sid : attrs
2018-03-27 23:54:02 [log] [ManagerDrivers] [sensor_switch.aq3] [0] --- genOnOff
2018-03-27 23:54:02 [log] [ManagerDrivers] [sensor_switch.aq3] [0] ---- cid : genOnOff
2018-03-27 23:54:02 [log] [ManagerDrivers] [sensor_switch.aq3] [0] ---- sid : attrs
2018-03-27 23:54:02 [log] [ManagerDrivers] [sensor_switch.aq3] [0] --- genMultistateInput
2018-03-27 23:54:02 [log] [ManagerDrivers] [sensor_switch.aq3] [0] ---- cid : genMultistateInput
2018-03-27 23:54:02 [log] [ManagerDrivers] [sensor_switch.aq3] [0] ---- sid : attrs
2018-03-27 23:54:02 [log] [ManagerDrivers] [sensor_switch.aq3] [0] ------------------------------------------
*/
