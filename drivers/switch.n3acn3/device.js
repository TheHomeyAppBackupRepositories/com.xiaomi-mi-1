// SDK3 updated & validated: DONE

'use strict';

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const {
  debug, Cluster, CLUSTER,
} = require('zigbee-clusters');

const AqaraManufacturerSpecificCluster = require('../../lib/AqaraManufacturerSpecificCluster');

Cluster.addCluster(AqaraManufacturerSpecificCluster);

class AqaraD1WallSwitchTripleLN extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    this.analogInputReportingActive = false;

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
          // Find position of the presentValue attributeId
          const presentValueAttributeIdBytePosition = frame.indexOf('55', 0, 'hex');
          // When presentValue attribute is received with defined length
          if (presentValueAttributeIdBytePosition > 0 && frame.length > 3) {
            // prevent 0 Watt reports from electricaMeasurement activePower attributes
            this.analogInputReportingActive = true;
            const parsedValue = frame.readFloatLE(presentValueAttributeIdBytePosition + 3);
            this.log('handle report (cluster: analogInput, endpoint: 21, capability: measure_power), parsed payload:', parsedValue);
            this.setCapabilityValue('measure_power', parsedValue).catch(this.error);
          }
        } else if (endpointId === 31 && clusterId === 12) {
          const presentValueAttributeIdBytePosition = frame.indexOf('55', 0, 'hex');
          this.debug('Analog_Input (31) | meter_power', frame, meta);
          if (presentValueAttributeIdBytePosition > 0 && frame.length > 3) {
            // prevent 0 Watt reports from electricaMeasurement activePower attributes
            this.analogInputReportingActive = true;
            const parsedValue = frame.readFloatLE(presentValueAttributeIdBytePosition + 3);
            this.log('handle report (cluster: analogInput, endpoint: 31, capability: meter_power), parsed payload:', parsedValue);
            this.setCapabilityValue('meter_power', parsedValue).catch(this.error);
          }
        } else {
          return zclNode.handleFrame(endpointId, clusterId, frame, meta);
        }
      };
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

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    // aqaraPowerOutageMemory attribute
    if (changedKeys.includes('save_state')) {
      const result = await this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
        .writeAttributes({ aqaraPowerOutageMemory: newSettings.save_state });
      this.log('SETTINGS | Write Attribute - Aqara Manufacturer Specific Cluster - aqaraPowerOutageMemory', newSettings.save_state, 'result:', result);
    }
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

  async initPowerFactor() {
    // this.log("DEBUG: not meteringFactor", typeof this.getStoreValue('meteringFactor') !== 'number', !this.getStoreValue('meteringFactor'), !this.getStoreValue('meteringFactor2'));
    if (!this.getStoreValue('activePowerFactor')) {
      const { acPowerMultiplier, acPowerDivisor } = await this.zclNode.endpoints[this.getClusterEndpoint(CLUSTER.ELECTRICAL_MEASUREMENT)].clusters[CLUSTER.ELECTRICAL_MEASUREMENT.NAME].readAttributes(['acPowerMultiplier', 'acPowerDivisor']).catch(this.error);
      this.activePowerFactor = acPowerMultiplier / acPowerDivisor;
      this.setStoreValue('activePowerFactor', this.activePowerFactor).catch(this.error);
      this.debug('activePowerFactor read from acPowerMultiplier and acPowerDivisor attributes:', acPowerMultiplier, acPowerDivisor, this.activePowerFactor);
    } else {
      this.activePowerFactor = this.getStoreValue('activePowerFactor');
      this.debug('activePowerFactor retrieved from Store:', this.activePowerFactor);
    }
    this.log('Defined activePowerFactor:', this.activePowerFactor);
  }

  async initMeterFactor() {
    // this.log("DEBUG: not meteringFactor", typeof this.getStoreValue('meteringFactor') !== 'number', !this.getStoreValue('meteringFactor'), !this.getStoreValue('meteringFactor2'));
    if (!this.getStoreValue('meteringFactor')) {
      const { multiplier, divisor } = await this.zclNode.endpoints[this.getClusterEndpoint(CLUSTER.ELECTRICAL_MEASUREMENT)].clusters[CLUSTER.METERING.NAME].readAttributes(['multiplier', 'divisor']).catch(this.error);
      this.meteringFactor = multiplier / divisor;
      this.setStoreValue('meteringFactor', this.meteringFactor).catch(this.error);
      this.debug('meteringFactor read from multiplier and divisor attributes:', multiplier, divisor, this.meteringFactor);
    } else {
      this.meteringFactor = this.getStoreValue('meteringFactor');
      this.debug('meteringFactor retrieved from Store:', this.meteringFactor);
    }
    this.log('Defined meteringFactor:', this.meteringFactor);
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
