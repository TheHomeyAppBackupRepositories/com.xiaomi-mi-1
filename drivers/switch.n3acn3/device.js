// SDK3 updated & validated: DONE

'use strict';

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const {
  debug, Cluster, CLUSTER,
} = require('zigbee-clusters');

const AqaraManufacturerSpecificCluster = require('../../lib/AqaraManufacturerSpecificCluster');
const AqaraMeteringDevice = require('../../lib/AqaraMeteringDevice');

Cluster.addCluster(AqaraManufacturerSpecificCluster);

class AqaraD1WallSwitchTripleLN extends AqaraMeteringDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    this.powerMeasurementReporting = {};

    this.endpointIds = {
      leftSwitch: 1,
      middleSwitch: 2,
      rightSwitch: 3,
    };

    const subDeviceId = this.isSubDevice() ? this.getData().subDeviceId : 'leftSwitch';
    this.log('Initializing', subDeviceId, 'at endpoint', this.endpointIds[subDeviceId]);

    // Register capabilities and reportListeners for Left or Right switch
    if (this.hasCapability('onoff')) {
      this.log('Register OnOff capability:', subDeviceId, 'at endpoint', this.endpointIds[subDeviceId]);
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: this.endpointIds[subDeviceId],
      });
    }

    await super.onNodeInit({ zclNode });
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

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    // aqaraPowerOutageMemory attribute
    if (changedKeys.includes('save_state')) {
      const result = await this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
        .writeAttributes({ aqaraPowerOutageMemory: newSettings.save_state });
      this.log('SETTINGS | Write Attribute - Aqara Manufacturer Specific Cluster - aqaraPowerOutageMemory', newSettings.save_state, 'result:', result);
    }
  }

}

module.exports = AqaraD1WallSwitchTripleLN;

/*
Product ID:
Deconz: OnOff Cluster: OnTime (u16), OffWaitTime (u16), PowerOn OnOff (enum8)

Actual captured:
Left to wireless switch: endPoint 1, 0xfcc0, attrs  0x0200, type 0x20 uint8, 0 (wireless)
Middle: endpoint 2
right: endpoint 3

If wireless: MultiState input: presentvalue

Holding left switch: 0xfcc0, attrs  0x00f7, bool true

*/
