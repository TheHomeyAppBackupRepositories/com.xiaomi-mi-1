// SDK3 updated: DONE

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const {
  debug, Cluster, CLUSTER,
} = require('zigbee-clusters');

class AqaraWallSwitchSingleL extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    // Register capabilities and reportListeners for  switch
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: 2,
      });
    }
  }

}

module.exports = AqaraWallSwitchSingleL;

/*
Product ID: QBKG04LM
*/
