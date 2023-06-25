// SDK3 updated & validated: DONE

'use strict';

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const {
  debug, Cluster, CLUSTER,
} = require('zigbee-clusters');

const util = require('../../lib/util');
const XiaomiBasicCluster = require('../../lib/XiaomiBasicCluster');
const XiaomiSpecificOnOffCluster = require('../../lib/XiaomiSpecificOnOffCluster');

Cluster.addCluster(XiaomiBasicCluster);
Cluster.addCluster(XiaomiSpecificOnOffCluster);

let lastKey = null;

class AqaraWirelessSwitchAq2 extends ZigBeeDevice {

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
      3: 'Key Pressed 3 times',
      4: 'Key Pressed 4 times',
    };
    /* Containment
    const node = await this.homey.zigbee.getNode(this);
    const zclNode = new ZCLNode({
    	sendFrame: node.sendFrame.bind(node),
    	endpointDescriptors: node.endpointDescriptors,
    });
    node.handleFrame = (endpointId, clusterId, frame, meta) => {
      this.log('ONOFF', frame, frame.length);
      if (endpointId === 1 && clusterId === 6 && frame.lenght === 11) {
        const onOffStatus1 = (JSON.parse(JSON.stringify(frame)).data[6]);
        const onOffStatus2 = (JSON.parse(JSON.stringify(frame)).data[10]);
        this.log('ONOFF', frame, onOffStatus1, onOffStatus2, frame.length);
        return;
      }
      // If you can't handle the incoming frame yourself pass it to zclNode
      return zclNode.handleFrame(endpointId, clusterId, frame, meta);
    };
    */

    // zclNode.endpoints[1].clusters[CLUSTER.BASIC.NAME]
    zclNode.endpoints[1].clusters[XiaomiBasicCluster.NAME]
      .on('attr.xiaomiLifeline', this.onXiaomiLifelineAttributeReport.bind(this));

    zclNode.endpoints[1].clusters[CLUSTER.ON_OFF.NAME]
      .on('attr.onOff', this.onOnOffAttributeReport.bind(this));

    zclNode.endpoints[1].clusters[CLUSTER.ON_OFF.NAME]
      .on('attr.xiaomiOnOffScene', this.onOnOffAttributeReport.bind(this));

    // define and register FlowCardTriggers
    this.onSceneAutocomplete = this.onSceneAutocomplete.bind(this);
  }

  onOnOffAttributeReport(repScene) {
    repScene = Number(repScene);
    this.log('genOnOff - onOff', repScene, this.sceneMap[repScene], 'lastKey', lastKey);

    if (lastKey !== repScene && repScene > 0) {
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
  onXiaomiLifelineAttributeReport({
    batteryVoltage,
  } = {}) {
    if (typeof batteryVoltage === 'number') {
      this.onBatteryVoltageAttributeReport('AqaraLifeline', 'batteryVoltage', batteryVoltage / 100);
    }
  }

}
module.exports = AqaraWirelessSwitchAq2;

// WXKG11LM_sensor_switch.aq2
/*
Node overview:
2018-03-03 16:10:55 [log] [ManagerDrivers] [sensor_switch.aq2] [0] ------------------------------------------
2018-03-03 16:10:55 [log] [ManagerDrivers] [sensor_switch.aq2] [0] Node: 31956e48-9b41-47f5-a9b3-66ca8e09c15c
2018-03-03 16:10:55 [log] [ManagerDrivers] [sensor_switch.aq2] [0] - Battery: false
2018-03-03 16:10:55 [log] [ManagerDrivers] [sensor_switch.aq2] [0] - Endpoints: 0
2018-03-03 16:10:55 [log] [ManagerDrivers] [sensor_switch.aq2] [0] -- Clusters:
2018-03-03 16:10:55 [log] [ManagerDrivers] [sensor_switch.aq2] [0] --- zapp
2018-03-03 16:10:55 [log] [ManagerDrivers] [sensor_switch.aq2] [0] --- genBasic
2018-03-03 16:10:55 [log] [ManagerDrivers] [sensor_switch.aq2] [0] ---- 65281 : !�
                                                                                  (!�!"$
!
2018-03-03 16:10:55 [log] [ManagerDrivers] [sensor_switch.aq2] [0] ---- cid : genBasic
2018-03-03 16:10:55 [log] [ManagerDrivers] [sensor_switch.aq2] [0] ---- sid : attrs
2018-03-03 16:10:55 [log] [ManagerDrivers] [sensor_switch.aq2] [0] ---- modelId : lumi.sensor_switch.aq2
2018-03-03 16:10:55 [log] [ManagerDrivers] [sensor_switch.aq2] [0] --- genGroups
2018-03-03 16:10:55 [log] [ManagerDrivers] [sensor_switch.aq2] [0] ---- cid : genGroups
2018-03-03 16:10:55 [log] [ManagerDrivers] [sensor_switch.aq2] [0] ---- sid : attrs
2018-03-03 16:10:55 [log] [ManagerDrivers] [sensor_switch.aq2] [0] --- genOnOff
2018-03-03 16:10:55 [log] [ManagerDrivers] [sensor_switch.aq2] [0] ---- cid : genOnOff
2018-03-03 16:10:55 [log] [ManagerDrivers] [sensor_switch.aq2] [0] ---- sid : attrs
2018-03-03 16:10:55 [log] [ManagerDrivers] [sensor_switch.aq2] [0] --- manuSpecificCluster
2018-03-03 16:10:56 [log] [ManagerDrivers] [sensor_switch.aq2] [0] ---- cid : manuSpecificCluster
2018-03-03 16:10:56 [log] [ManagerDrivers] [sensor_switch.aq2] [0] ---- sid : attrs
2018-03-03 16:10:56 [log] [ManagerDrivers] [sensor_switch.aq2] [0] ------------------------------------------
*/
