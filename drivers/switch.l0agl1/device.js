/*
Product ID: SSM-U02
*/

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const {
  debug, Cluster, CLUSTER,
} = require('zigbee-clusters');

const AqaraManufacturerSpecificCluster = require('../../lib/AqaraManufacturerSpecificCluster');

Cluster.addCluster(AqaraManufacturerSpecificCluster);

class AqaraT1SwitchModule extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    try {
      const { aqaraSwitchType, aqaraPowerOutageMemory } = await zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME].readAttributes('aqaraSwitchType', 'aqaraPowerOutageMemory');
      this.log('READattributes', aqaraSwitchType, aqaraPowerOutageMemory);
    } catch (err) {
      this.log('could not read Attribute AqaraManufacturerSpecificCluster');
      this.log(err);
    }

    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: 1,
      });
    }

    // measure_power
    if (this.hasCapability('measure_power')) {
      // Define acPower parsing factor based on device settings
      if (typeof this.activePowerFactor !== 'number') {
        const { acPowerMultiplier, acPowerDivisor } = await zclNode.endpoints[this.getClusterEndpoint(CLUSTER.ELECTRICAL_MEASUREMENT)].clusters[CLUSTER.ELECTRICAL_MEASUREMENT.NAME].readAttributes('acPowerMultiplier', 'acPowerDivisor');
        this.activePowerFactor = acPowerMultiplier / acPowerDivisor;
        this.debug('activePowerFactor:', acPowerMultiplier, acPowerDivisor, this.activePowerFactor);
      }

      this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0, // No minimum reporting interval
            maxInterval: 300, // Maximally every ~16 hours
            minChange: 1 / this.activePowerFactor, // Report when value changed by 5
          },
        },
        endpoint: this.getClusterEndpoint(CLUSTER.ELECTRICAL_MEASUREMENT),
      });
    }

    if (this.hasCapability('meter_power')) {
      // Define acPower parsing factor based on device settings
      if (typeof this.meteringFactor !== 'number') {
        const { multiplier, divisor } = await zclNode.endpoints[this.getClusterEndpoint(CLUSTER.METERING)].clusters[CLUSTER.METERING.NAME].readAttributes('multiplier', 'divisor');
        this.meteringFactor = multiplier / divisor;
        this.debug('meteringFactor:', multiplier, divisor, this.meteringFactor);
      }

      this.registerCapability('meter_power', CLUSTER.METERING, {
        reportOpts: {
        //  configureAttributeReporting: {
        //    minInterval: 120, // No minimum reporting interval
        //    maxInterval: 300, // Maximally every ~16 hours
        //    minChange: 0, // .01 / this.meteringFactor, // Report when value changed by 5
        //  },
        },
        endpoint: this.getClusterEndpoint(CLUSTER.METERING),
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

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    // aqaraSwitchType attribute
    if (changedKeys.includes('external_switch_type')) {
      const result = await this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
        .writeAttributes({ aqaraSwitchType: newSettings.external_switch_type });
      this.log('SETTINGS | Write Attribute - Aqara Manufacturer Specific Cluster - aqaraSwitchType', newSettings.external_switch_type, 'result:', result);
    }

    // aqaraPowerOutageMemory attribute
    if (changedKeys.includes('save_state')) {
      const result = await this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
        .writeAttributes({ aqaraPowerOutageMemory: newSettings.save_state });
      this.log('SETTINGS | Write Attribute - Aqara Manufacturer Specific Cluster - aqaraPowerOutageMemory', newSettings.save_state, 'result:', result);
    }
  }

}

module.exports = AqaraT1SwitchModule;
