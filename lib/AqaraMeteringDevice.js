// TODO add settings + Add genMultistateOutput options (single / double tripple press)

'use strict';

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const {
  debug, Cluster, CLUSTER,
} = require('zigbee-clusters');

class AqaraMeteringDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    // Register measure_power and meter_power capabilities and reportListeners only for main device
    if (!this.isSubDevice()) {
      // Register measure_power capability
      if (this.hasCapability('measure_power')) {
        // Define electricaMeasurement cluster attribute reporting and parsing options. Do NOT await this.initElectricalMeasurementClusterAttributeReporting()
        if (!this.activePowerFactor) this.initElectricalMeasurementClusterAttributeReporting({ zclNode });

        this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
          reportParser(value) {
            const activePowerFactor = this.activePowerFactor || 1;
            if (value < 0 || this.analogInputReportingActive) return null;
            this.updatePowerMeasurement(value * activePowerFactor, 'electricaMeasurement');
            return null;
            // return value * activePowerFactor;
          },
          endpoint: this.getClusterEndpoint(CLUSTER.ELECTRICAL_MEASUREMENT),
        });

        zclNode.endpoints[21].clusters[CLUSTER.ANALOG_INPUT.NAME]
          .on('attr.presentValue', presentValue => {
            // this.log('handle report (cluster: analogInput, endpoint: 21, capability: measure_power), parsed payload:', presentValue);
            this.updatePowerMeasurement(presentValue, 'analogInput');
            // this.setCapabilityValue('measure_power', presentValue).catch(this.error);
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
          endpoint: this.getClusterEndpoint(CLUSTER.METERING),
        });

        zclNode.endpoints[31].clusters[CLUSTER.ANALOG_INPUT.NAME]
          .on('attr.presentValue', presentValue => {
            this.log('handle report (cluster: analogInput, endpoint: 31, capability: meter_power), parsed payload:', presentValue);
            this.setCapabilityValue('meter_power', presentValue).catch(this.error);
          });
      }
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

  async updatePowerMeasurement(parsedValue, reportingCluster) {
    // this.debug('Received power measurement', this.powerMeasurementReporting);
    if (parsedValue > 0 && !this.powerMeasurementReporting[reportingCluster]) {
      this.powerMeasurementReporting[reportingCluster] = true;
      this.debug(`Activated powerMetering for the ${reportingCluster} cluster`, this.powerMeasurementReporting);
    }

    if (this.powerMeasurementReporting[reportingCluster]) {
      this.log(`handle report (cluster: ${reportingCluster}, capability: measure_power), parsed payload: ${parsedValue}`);
      this.setCapabilityValue('measure_power', parsedValue).catch(this.error);
    }
  }

}

module.exports = AqaraMeteringDevice;
