// SDK3 updated & validated: DONE

'use strict';

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const {
  debug, Cluster, CLUSTER,
} = require('zigbee-clusters');

const XiaomiBasicCluster = require('../../lib/XiaomiBasicCluster');
const AqaraMeteringDevice = require('../../lib/AqaraMeteringDevice');

Cluster.addCluster(XiaomiBasicCluster);

class AqaraD1WallSwitchDoubleLN extends AqaraMeteringDevice {

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
      rightSwitch: 2,
    };

    const subDeviceId = this.isSubDevice() ? this.getData().subDeviceId : 'leftSwitch';
    this.log('Initializing', subDeviceId, 'at endpoint', this.endpointIds[subDeviceId]);

    // Register capabilities and reportListeners for Left or Right switch
    if (this.hasCapability('onoff')) {
      this.debug('Register OnOff capability:', subDeviceId, 'at endpoint', this.endpointIds[subDeviceId]);
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        getOpts: {
          getOnStart: true,
        },
        endpoint: this.endpointIds[subDeviceId],
      });
    }

    await super.onNodeInit({ zclNode });
  }

}

module.exports = AqaraD1WallSwitchDoubleLN;
