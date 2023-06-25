// TODO add settings + Add genMultistateOutput options (single / double tripple press)

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const {
  debug, Cluster, CLUSTER,
} = require('zigbee-clusters');

const AqaraManufacturerSpecificCluster = require('../../lib/AqaraManufacturerSpecificCluster');

Cluster.addCluster(AqaraManufacturerSpecificCluster);

class AqaraD1WallSwitchSingleL extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    this.endpointIds = {
      leftSwitch: 2,
    };

    const subDeviceId = this.isSubDevice() ? this.getData().subDeviceId : 'leftSwitch';
    this.log('Initializing', subDeviceId, 'at endpoint', this.endpointIds[subDeviceId]);

    // Register capabilities and reportListeners for  switch
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: this.endpointIds[subDeviceId],
      });
    }

    // Register the AttributeReportListener - Lifeline
    zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
      .on('attr.aqaraLifeline', this.onAqaraLifelineAttributeReport.bind(this));
  }

  /**
   * This is Xiaomi's custom lifeline attribute, it contains a lot of data, af which the most
   * interesting the battery level. The battery level divided by 1000 represents the battery
   * voltage. If the battery voltage drops below 2600 (2.6V) we assume it is almost empty, based
   * on the battery voltage curve of a CR1632.
   * @param {{batteryLevel: number}} lifeline
   */
  onAqaraLifelineAttributeReport({
    state,
  } = {}) {
    this.log('lifeline attribute report', {
      state,
    });

    if (typeof state === 'number') {
      this.setCapabilityValue('onoff', state === 1).catch(this.error);
    }
  }

}

module.exports = AqaraD1WallSwitchSingleL;

/*
Product ID: QBKG04LM
*/
