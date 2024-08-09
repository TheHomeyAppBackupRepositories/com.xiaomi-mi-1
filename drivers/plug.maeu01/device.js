// model: 'SP-EUC01'

'use strict';

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const {
  debug, Cluster, CLUSTER,
} = require('zigbee-clusters');

const AqaraManufacturerSpecificCluster = require('../../lib/AqaraManufacturerSpecificCluster');
const AqaraMeteringDevice = require('../../lib/AqaraMeteringDevice');

Cluster.addCluster(AqaraManufacturerSpecificCluster);

class AqaraSmartPlugEU extends AqaraMeteringDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    this.powerMeasurementReporting = {};

    this.initSettings();

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

    // Register the AttributeReportListener - Lifeline
    zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
      .on('attr.aqaraLifeline', this.onAqaraLifelineAttributeReport.bind(this));

    await super.onNodeInit({ zclNode });
  }

  async initSettings() {
    try {
      const {
        aqaraLedDisabled, aqaraPowerOutageMemory, aqaraPowerOffMemory, aqaraMaximumPower,
      } = await this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME].readAttributes(['aqaraLedDisabled', 'aqaraPowerOutageMemory', 'aqaraPowerOffMemory', 'aqaraMaximumPower']).catch(this.error);
      this.log('READattributes options, aqaraLedDisabled:', aqaraLedDisabled, 'aqaraPowerOutageMemory:', aqaraPowerOutageMemory, 'aqaraPowerOffMemory:', aqaraPowerOffMemory, 'aqaraMaximumPower:', aqaraMaximumPower);
      await this.setSettings({ save_state: aqaraPowerOutageMemory });
    } catch (err) {
      this.log('could not read Attribute xiaomiSwitchOptions:', err);
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
    state, consumption, power,
  } = {}) {
    this.log('lifeline attribute report', {
      state, consumption, power,
    });

    if (typeof state === 'number') {
      this.log('handle report (cluster: aqaraLifeline, capability: onoff), parsed payload:', state === 1);
      this.setCapabilityValue('onoff', state === 1).catch(this.error);
    }

    if (typeof consumption === 'number') {
      this.log('handle report (cluster: aqaraLifeline, capability: meter_power), parsed payload:', consumption);
      this.setCapabilityValue('meter_power', consumption).catch(this.error);
    }

    if (typeof power === 'number') {
      // this.log('handle report (cluster: aqaraLifeline, capability: measure_power), parsed payload:', power);
      this.updatePowerMeasurement(power, 'aqaraLifeline');
      // this.setCapabilityValue('measure_power', power).catch(this.error);
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

module.exports = AqaraSmartPlugEU;
