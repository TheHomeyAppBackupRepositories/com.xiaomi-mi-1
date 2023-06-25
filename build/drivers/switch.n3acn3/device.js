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

    // Set Aqara Opple mode to 1
    if (this.isFirstInit()) {
      try {
        await zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME].writeAttributes({ mode: 1 }); // , aqaraRemoteMode: 2
      } catch (err) {
        this.error('failed to write mode attributes', err);
      }
    }

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

    // measure_power switch
    // applicationType : 589824 = 0x090000 Power in Watts
    // Register measure_power capability

    // measure_power
    if (this.hasCapability('measure_power')) {
      // Define acPower parsing factor based on device settings
      if (typeof this.getStoreValue('activePowerFactor') !== 'number') {
        try {
          const { acPowerMultiplier, acPowerDivisor } = await zclNode.endpoints[this.getClusterEndpoint(CLUSTER.ELECTRICAL_MEASUREMENT)].clusters[CLUSTER.ELECTRICAL_MEASUREMENT.NAME].readAttributes('acPowerMultiplier', 'acPowerDivisor');
          this.activePowerFactor = acPowerMultiplier / acPowerDivisor;
          this.setStoreValue('activePowerFactor', this.activePowerFactor).catch(this.error);
          this.debug('SET activePowerFactor:', acPowerMultiplier, acPowerDivisor, this.activePowerFactor);
        } catch (err) {
          this.debug('Could not read electricaMeasurementCluster attributes `acPowerMultiplier`, `acPowerDivisor`:', err);
          this.activePowerFactor = 0.1; // default value
          this.debug('DEFAULT activePowerFactor:', this.activePowerFactor);
        }
      } else {
        this.activePowerFactor = this.getStoreValue('activePowerFactor');
        this.debug('READ activePowerFactor:', this.activePowerFactor);
      }

      this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 5, // Minimum interval of 5 seconds
            maxInterval: 300, // Maximally every ~16 hours
            minChange: 1 / this.activePowerFactor, // Report when value changed by 5
          },
        },
        endpoint: this.getClusterEndpoint(CLUSTER.ELECTRICAL_MEASUREMENT),
      });
    }

    if (this.hasCapability('meter_power')) {
      // Define acPower parsing factor based on device settings
      if (typeof this.getStoreValue('meteringFactor') !== 'number') {
        try {
          const { multiplier, divisor } = await zclNode.endpoints[this.getClusterEndpoint(CLUSTER.METERING)].clusters[CLUSTER.METERING.NAME].readAttributes('multiplier', 'divisor');
          this.meteringFactor = multiplier / divisor;
          this.setStoreValue('meteringFactor', this.meteringFactor).catch(this.error);
          this.debug('SET meteringFactor:', multiplier, divisor, this.meteringFactor);
        } catch (err) {
          this.debug('could not read meteringCluster attributes `multiplier` and `divisor`:', err);
          this.meteringFactor = 0.001; // default value
          this.debug('DEFAULT meteringFactor:', this.meteringFactor);
        }
      } else {
        this.meteringFactor = this.getStoreValue('meteringFactor');
        this.debug('READ activePowerFactor:', this.meteringFactor);
      }

      this.registerCapability('meter_power', CLUSTER.METERING, {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 300, // Minimum interval of 5 minutes
            maxInterval: 3600, // Maximally every ~16 hours
            minChange: 0.01 / this.meteringFactor, // Report when value changed by 5
          },
        },
        endpoint: this.getClusterEndpoint(CLUSTER.METERING),
      });
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
