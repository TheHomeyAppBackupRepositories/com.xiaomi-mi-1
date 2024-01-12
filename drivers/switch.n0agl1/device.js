/*
Product ID: SSM-U01
*/

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const {
  debug, Cluster, CLUSTER,
} = require('zigbee-clusters');

const AqaraManufacturerSpecificCluster = require('../../lib/AqaraManufacturerSpecificCluster');

Cluster.addCluster(AqaraManufacturerSpecificCluster);

class AqaraT1SwitchModuleNeutral extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    this.analogInputReportingActive = false;

    this.initSettings();

    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: 1,
      });
    }

    // Register measure_power capability
    if (this.hasCapability('measure_power')) {
      // Define acPower parsing factor based on device settings

      // Define electricaMeasurement cluster attribute reporting and parsing options. Do NOT await this.initElectricalMeasurementClusterAttributeReporting()
      if (!this.activePowerFactor) this.initElectricalMeasurementClusterAttributeReporting({ zclNode });

      this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
        reportParser(value) {
          const activePowerFactor = this.activePowerFactor || 1;
          if (value < 0 || this.analogInputReportingActive) return null;
          return value * activePowerFactor;
        },
        /* reportOpts: {
          configureAttributeReporting: {
            minInterval: 5, // Minimum interval of 5 seconds
            maxInterval: 300, // Maximally every ~16 hours
            minChange: 1 / this.activePowerFactor, // Report when value changed by 5
          },
        }, */
        endpoint: this.getClusterEndpoint(CLUSTER.ELECTRICAL_MEASUREMENT),
      });
    }

    if (this.hasCapability('meter_power')) {

      // Define Metering cluster attribute reporting and parsing options. Do NOT await this.initMeteringClusterAttributeReporting()
      if (!this.meteringFactor) this.initMeteringClusterAttributeReporting({ zclNode });

      this.registerCapability('meter_power', CLUSTER.METERING, {
        reportParser(value) {
          const meteringFactor = this.meteringFactor || 1;
          if (value < 0 || this.analogInputReportingActive) return null;
          return value * meteringFactor;
        },
        /* reportOpts: {
          configureAttributeReporting: {
            minInterval: 300, // Minimum interval of 5 minutes
            maxInterval: 3600, // Maximally every ~16 hours
            minChange: 0.01 / this.meteringFactor, // Report when value changed by 5
          },
        }, */
        endpoint: this.getClusterEndpoint(CLUSTER.METERING),
      });
    }

    if (this.hasCapability('measure_power') || this.hasCapability('meter_power')) {
      const node = await this.homey.zigbee.getNode(this);
      node.handleFrame = (endpointId, clusterId, frame, meta) => {
        if (endpointId === 21 && clusterId === 12) {
          this.debug('Analog_Input (21) | measure_power', frame, meta);
          // Find position of the presentValue attributeId
          const presentValueAttributeIdBytePosition = frame.indexOf('55', 0, 'hex');
          // When presentValue attribute is received with defined length
          if (presentValueAttributeIdBytePosition > 0 && frame.length > 3) {
            // prevent 0 Watt reports from electricaMeasurement activePower attributes
            this.analogInputReportingActive = true;
            const parsedValue = frame.readFloatLE(presentValueAttributeIdBytePosition + 3);
            this.log('handle report (cluster: analogInput, endpoint: 21, capability: measure_power), parsed payload:', parsedValue);
            this.setCapabilityValue('measure_power', parsedValue);
          }
        } else if (endpointId === 31 && clusterId === 12) {
          const presentValueAttributeIdBytePosition = frame.indexOf('55', 0, 'hex');
          this.debug('Analog_Input (31) | meter_power', frame, meta);
          if (presentValueAttributeIdBytePosition > 0 && frame.length > 3) {
            const parsedValue = frame.readFloatLE(presentValueAttributeIdBytePosition + 3);
            this.log('handle report (cluster: analogInput, endpoint: 31, capability: meter_power), parsed payload:', parsedValue);
            this.setCapabilityValue('meter_power', parsedValue);
          }
        } else {
          return zclNode.handleFrame(endpointId, clusterId, frame, meta);
        }
      };
    }

    // Register the AttributeReportListener - Lifeline
    zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
      .on('attr.aqaraLifeline', this.onAqaraLifelineAttributeReport.bind(this));
  }

  async initSettings() {
    try {
      const { aqaraSwitchType, aqaraPowerOutageMemory } = await this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME].readAttributes(['aqaraSwitchType', 'aqaraPowerOutageMemory']).catch(this.error);
      this.log('READattributes', aqaraSwitchType, aqaraPowerOutageMemory);

      await this.setSettings({ external_switch_type: aqaraSwitchType.toString(), save_state: aqaraPowerOutageMemory });
    } catch (err) {
      this.log('could not read Attribute AqaraManufacturerSpecificCluster:', err);
    }
  }

  async initMeteringClusterAttributeReporting({ zclNode }) {
    if (!this.getStoreValue('meteringFactor')) {
      try {
        const { multiplier, divisor } = await this.zclNode.endpoints[this.getClusterEndpoint(CLUSTER.METERING)].clusters[CLUSTER.METERING.NAME].readAttributes(['multiplier', 'divisor']).catch(this.error);
        this.meteringFactor = multiplier / divisor;
        this.setStoreValue('meteringFactor', this.meteringFactor).catch(this.error);
        this.debug('meteringFactor read from multiplier and divisor attributes:', multiplier, divisor, this.meteringFactor);
      } catch (error) {
        this.meteringFactor = 1 / 3600000; // fall back, not stored. Will be retried at the next onNodeInit
        this.debug('meteringFactor NOT read from multiplier and divisor attributes, due to', error);
      }
    } else {
      this.meteringFactor = this.getStoreValue('meteringFactor');
      this.debug('meteringFactor retrieved from Store:', this.meteringFactor);
    }
    this.log('Defined meteringFactor:', this.meteringFactor);
    this.debug('--  initializing attribute reporting for the metering cluster');
    await this.configureAttributeReporting([{
      cluster: CLUSTER.METERING,
      attributeName: 'currentSummationDelivered',
      minInterval: 300,
      maxInterval: 3600,
      minChange: 0.01 / this.meteringFactor,
      endpointId: this.getClusterEndpoint(CLUSTER.METERING),
    }]).catch(this.error);

    /*
    this.debug('--  initializing referenceCurrentSummationDelivered for the meteringCluster');
    if (this.isFirstInit()) {
      await this.setRefCurrentSummationDelivered();
      this.setCapabilityValue('meter_power', 0).catch(this.error);
      this.debug('Set referenceCurrentSummationDelivered by reading attributes:', this.referenceCurrentSummationDelivered);
    } else if (!this.getStoreValue('referenceCurrentSummationDelivered')) {
      this.referenceCurrentSummationDelivered = 0;
      this.debug('storeValue for referenceCurrentSummationDelivered not defined, set to 0');
    } else {
      this.referenceCurrentSummationDelivered = this.getStoreValue('referenceCurrentSummationDelivered');
      this.debug('retrieving referenceCurrentSummationDelivered from Store:', this.referenceCurrentSummationDelivered);
    }
    this.log('Defined referenceCurrentSummationDelivered:', this.referenceCurrentSummationDelivered);
    */
  }

  async initElectricalMeasurementClusterAttributeReporting({ zclNode }) {
    if (!this.getStoreValue('activePowerFactor')) {
      try {
        const { acPowerMultiplier, acPowerDivisor } = await this.zclNode.endpoints[this.getClusterEndpoint(CLUSTER.ELECTRICAL_MEASUREMENT)].clusters[CLUSTER.ELECTRICAL_MEASUREMENT.NAME]
          .readAttributes(['acPowerMultiplier', 'acPowerDivisor']);
        this.activePowerFactor = acPowerMultiplier / acPowerDivisor;
        this.setStoreValue('activePowerFactor', this.activePowerFactor).catch(this.error);
        this.debug('activePowerFactor read from acPowerMultiplier and acPowerDivisor attributes:', acPowerMultiplier, acPowerDivisor, this.activePowerFactor);
      } catch (error) {
        this.activePowerFactor = 0.1; // fall back, not stored. Will be retried at the next onNodeInit
        this.debug('activePowerFactor NOT read from acPowerMultiplier and acPowerDivisor attributes, due to', error);
      }
    } else {
      this.activePowerFactor = this.getStoreValue('activePowerFactor');
      this.debug('activePowerFactor retrieved from Store:', this.activePowerFactor);
    }
    this.log('Defined activePowerFactor:', this.activePowerFactor);
    this.debug('--  initializing attribute reporting for the electricalMeasurement cluster');
    await this.configureAttributeReporting([{
      cluster: CLUSTER.ELECTRICAL_MEASUREMENT,
      attributeName: 'activePower',
      minInterval: 5,
      maxInterval: 300,
      minChange: 0.5 / this.activePowerFactor,
      endpointId: this.getClusterEndpoint(CLUSTER.ELECTRICAL_MEASUREMENT),
    }]).catch(this.error);
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
      this.log('handle report (cluster: aqaraLifeline, capability: measure_power), parsed payload:', power);
      this.setCapabilityValue('measure_power', power).catch(this.error);
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

module.exports = AqaraT1SwitchModuleNeutral;

/*
Deconz options to still add
aqaraPowerOutageMemory (done)
aqaraSwitchType (done)
aqaraPowerReportThreshold
aqaraMaximumPower
*/
