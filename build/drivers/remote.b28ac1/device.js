// SDK3 updated & validated : DONE

'use strict';

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');

// const XiaomiBasicCluster = require('../../lib/XiaomiBasicCluster');

// Cluster.addCluster(XiaomiBasicCluster);
const util = require('../../lib/util');
const AqaraManufacturerSpecificCluster = require('../../lib/AqaraManufacturerSpecificCluster');

Cluster.addCluster(AqaraManufacturerSpecificCluster);

let lastKey = null;

class AqaraH1Remoteb28ac1 extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // print the node's info to the console
    // this.printNode();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // Set Aqara Opple mode to 1 to force sending MULTI_STATE_INPUT messages
    if (this.isFirstInit()) {
      try {
        await zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME].writeAttributes({ mode: 1 }); // , aqaraRemoteMode: 2
      } catch (err) {
        this.error('failed to write mode attributes', err);
      }

      try {
        await zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME].writeAttributes({ aqaraRemoteMode: 2 }); // , aqaraRemoteMode: 2
      } catch (err) {
        this.error('failed to write RemoteMode attributes', err);
      }

      try {
        await this.configureAttributeReporting([{
          endpointId: this.getClusterEndpoint(CLUSTER.POWER_CONFIGURATION),
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryVoltage',
          minInterval: 0,
          maxInterval: 3600,
          minChange: 1,
        }]);
      } catch (err) {
        this.error('failed to write RemoteMode attributes', err);
      }
    }

    // add battery capabilities if needed
    if (!this.hasCapability('measure_battery')) {
      this.addCapability('measure_battery').catch(this.error);
    }
    if (!this.hasCapability('alarm_battery')) {
      this.addCapability('alarm_battery').catch(this.error);
    }

    // supported scenes and their reported attribute numbers (all based on reported data)
    this.buttonMap = {
      Left: 'Left button',
      Right: 'Right button',
      Both: 'Both buttons',
    };

    this.sceneMap = {
      1: 'Key Pressed 1 time',
      2: 'Key Pressed 2 times',
      3: 'Key Pressed 3 times',
      0: 'Key Held Down',
    };

    zclNode.endpoints[1].clusters[CLUSTER.MULTI_STATE_INPUT.NAME]
      .on('attr.presentValue', this.onPresentValueAttributeReport.bind(this, 'Left'));

    zclNode.endpoints[2].clusters[CLUSTER.MULTI_STATE_INPUT.NAME]
      .on('attr.presentValue', this.onPresentValueAttributeReport.bind(this, 'Right'));

    zclNode.endpoints[3].clusters[CLUSTER.MULTI_STATE_INPUT.NAME]
      .on('attr.presentValue', this.onPresentValueAttributeReport.bind(this, 'Both'));

    zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
      .on('attr.batteryVoltage', this.onBatteryVoltageAttributeReport.bind(this));

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
   * Set `measure_temperature` when a `measureValue` attribute report is received on the
   * temperature measurement cluster.
   * @param {number} measuredValue
   */
  onBatteryVoltageAttributeReport(batteryVoltage) {
    if (typeof batteryVoltage === 'number') {
      const parsedBatPct = util.calculateBatteryPercentage(batteryVoltage * 100, '3V_2500');
      this.log('measure_battery | PowerConfiguration - batteryVoltage:', batteryVoltage * 100, 'parsedBatteryPct', parsedBatPct);
      this.setCapabilityValue('measure_battery', parsedBatPct).catch(this.error);
      this.setCapabilityValue('alarm_battery', parsedBatPct < 20).catch(this.error);
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
      const parsedBatPct = util.calculateBatteryPercentage(batteryVoltage, '3V_2500');
      this.log('lifeline attribute report', {
        batteryVoltage,
      }, 'parsedBatteryPct', parsedBatPct);
      this.setCapabilityValue('measure_battery', parsedBatPct).catch(this.error);
      this.setCapabilityValue('alarm_battery', parsedBatPct < 20).catch(this.error);
    }
  }

}
module.exports = AqaraH1Remoteb28ac1;

// WXKG07LM_ remote.b286acn02;
/*
Clicks: Cluster MULTI_STATE_INPUT (0x0012), endpoints 1, 2, 3, attribute 0x55 (presentValue), value 1 (1 click)
1, 2, 3 = 1x - 3x Clicks
0 = held

High speed click mode:cluster: 0xFFC0, attribute 0x0125, type UInt8, value 0x01
Multifunction mode: (single click, double click and long press).: cluster: 0xFFC0, attribute 0x0125, type UInt8, value 0x02

*/
