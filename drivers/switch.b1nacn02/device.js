// SDK3 updated: DONE

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const {
  debug, Cluster, CLUSTER,
} = require('zigbee-clusters');

const AqaraMeteringDevice = require('../../lib/AqaraMeteringDevice');

class AqaraD1WallSwitchSingleLN extends AqaraMeteringDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    this.powerMeasurementReporting = {};

    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0, // No minimum reporting interval
            maxInterval: 43200, // Maximally every ~12 hours
            minChange: 1, // Report when value changed by 5
          },
        },
        endpoint: this.getClusterEndpoint(CLUSTER.ON_OFF),
      });
    }

    await super.onNodeInit({ zclNode });
  }

}

module.exports = AqaraD1WallSwitchSingleLN;
