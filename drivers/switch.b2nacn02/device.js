// SDK3 updated & validated: DONE

'use strict';

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const {
  debug, Cluster, CLUSTER,
} = require('zigbee-clusters');

const XiaomiBasicCluster = require('../../lib/XiaomiBasicCluster');

Cluster.addCluster(XiaomiBasicCluster);

class AqaraD1WallSwitchDoubleLN extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    this.endpointIds = {
      leftSwitch: 1,
      rightSwitch: 2,
    };

    const subDeviceId = this.isSubDevice() ? this.getData().subDeviceId : 'leftSwitch';
    this.log('Initializing', subDeviceId, 'at endpoint', this.endpointIds[subDeviceId]);

    // Register capabilities and reportListeners for Left or Right switch
    if (this.hasCapability('onoff')) {
      this.log('Initializing', subDeviceId, 'at endpoint', this.endpointIds[subDeviceId]);
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

    // Register the AttributeReportListener - Lifeline

    // zclNode.endpoints[1].clusters[XiaomiBasicCluster.NAME]
    //  .on('attr.xiaomiLifeline', this.onXiaomiLifelineAttributeReport.bind(this));
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

  /**
   * This is Xiaomi's custom lifeline attribute, it contains a lot of data, af which the most
   * interesting the battery level. The battery level divided by 1000 represents the battery
   * voltage. If the battery voltage drops below 2600 (2.6V) we assume it is almost empty, based
   * on the battery voltage curve of a CR1632.
   * @param {{batteryLevel: number}} lifeline
   */
  onXiaomiLifelineAttributeReport({
    state, state1,
  } = {}) {
    this.log('lifeline attribute report', {
      state, state1,
    });

    if (typeof state === 'number') {
      this.setCapabilityValue('onoff', state === 1).catch(this.error);
    }

    if (typeof state1 === 'number') {
      this.setCapabilityValue('onoff.1', state1 === 1).catch(this.error);
    }
  }

}

module.exports = AqaraD1WallSwitchDoubleLN;

/*
Product ID: QBKG12LM
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ------------------------------------------
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] Node: 1466ceaa-ceca-4a03-b088-f2ed973982d5
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] - Battery: false
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] - Endpoints: 0
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] -- Clusters:
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- zapp
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- genBasic
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- 65281 : de(�9�9��$:!�!'	!
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- cid : genBasic
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- sid : attrs
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- zclVersion : 1
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- appVersion : 31
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- stackVersion : 2
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- hwVersion : 18
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- manufacturerName : LUMI
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- modelId : lumi.ctrl_ln2.aq1
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- dateCode : 10-12-2017
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- powerSource : 1
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- genPowerCfg
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- cid : genPowerCfg
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- sid : attrs
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- mainsVoltage : 2240
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- genDeviceTempCfg
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- cid : genDeviceTempCfg
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- sid : attrs
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- currentTemperature : 22
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- genIdentify
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- cid : genIdentify
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- sid : attrs
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- identifyTime : 0
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- genGroups
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- cid : genGroups
2018-05-16 22:26:49 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- sid : attrs
2018-05-16 22:26:50 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- nameSupport : 128
2018-05-16 22:26:50 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- genScenes
2018-05-16 22:26:50 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- cid : genScenes
2018-05-16 22:26:50 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- sid : attrs
2018-05-16 22:26:50 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- count : 0
2018-05-16 22:26:50 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- currentScene : 0
2018-05-16 22:26:50 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- currentGroup : 0
2018-05-16 22:26:50 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- sceneValid : 0
2018-05-16 22:26:50 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- nameSupport : 0
2018-05-16 22:26:50 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- lastCfgBy : 0xffffffffffffffff
2018-05-16 22:26:50 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- genOnOff
2018-05-16 22:26:50 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- 61440 : 117440737
2018-05-16 22:26:50 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- cid : genOnOff
2018-05-16 22:26:50 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- sid : attrs
2018-05-16 22:26:50 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- onOff : 0
2018-05-16 22:26:50 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- genTime
2018-05-16 22:26:50 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- cid : genTime
2018-05-16 22:26:51 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- sid : attrs
2018-05-16 22:26:51 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- genBinaryOutput
2018-05-16 22:26:51 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- cid : genBinaryOutput
2018-05-16 22:26:51 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- sid : attrs
2018-05-16 22:26:51 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- outOfService : 0
2018-05-16 22:26:51 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- presentValue : 0
2018-05-16 22:26:51 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- statusFlags : 0
2018-05-16 22:26:51 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- genOta
2018-05-16 22:26:51 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- cid : genOta
2018-05-16 22:26:51 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- sid : attrs
2018-05-16 22:26:51 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] - Endpoints: 1
2018-05-16 22:26:52 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] -- Clusters:
2018-05-16 22:26:52 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- zapp
2018-05-16 22:26:52 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- genOnOff
2018-05-16 22:26:52 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- 61440 : 117440743
2018-05-16 22:26:52 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- cid : genOnOff
2018-05-16 22:26:52 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- sid : attrs
2018-05-16 22:26:52 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- onOff : 0
2018-05-16 22:26:52 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- genBinaryOutput
2018-05-16 22:26:52 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- cid : genBinaryOutput
2018-05-16 22:26:52 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- sid : attrs
2018-05-16 22:26:52 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- outOfService : 0
2018-05-16 22:26:52 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- presentValue : 0
2018-05-16 22:26:52 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- statusFlags : 0
2018-05-16 22:26:52 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] - Endpoints: 2
2018-05-16 22:26:52 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] -- Clusters:
2018-05-16 22:26:52 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- zapp
2018-05-16 22:26:53 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- genGroups
2018-05-16 22:26:53 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- cid : genGroups
2018-05-16 22:26:53 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- sid : attrs
2018-05-16 22:26:53 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- genAnalogInput
2018-05-16 22:26:53 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- 261 : 0
2018-05-16 22:26:54 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- 262 : 0
2018-05-16 22:26:54 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- cid : genAnalogInput
2018-05-16 22:26:54 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- sid : attrs
2018-05-16 22:26:54 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- outOfService : 0
2018-05-16 22:26:54 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- presentValue : 0
2018-05-16 22:26:54 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- statusFlags : 0
2018-05-16 22:26:54 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- applicationType : 589824
2018-05-16 22:26:54 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] - Endpoints: 3
2018-05-16 22:26:54 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] -- Clusters:
2018-05-16 22:26:54 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- zapp
2018-05-16 22:26:54 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- genAnalogInput
2018-05-16 22:26:54 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- 261 : 0
2018-05-16 22:26:54 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- 262 : 0
2018-05-16 22:26:55 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- cid : genAnalogInput
2018-05-16 22:26:55 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- sid : attrs
2018-05-16 22:26:55 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- outOfService : 0
2018-05-16 22:26:55 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- presentValue : 0.0006293333135545254
2018-05-16 22:26:55 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- statusFlags : 0
2018-05-16 22:26:55 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- applicationType : 720896
2018-05-16 22:26:55 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] - Endpoints: 4
2018-05-16 22:26:55 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] -- Clusters:
2018-05-16 22:26:55 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- zapp
2018-05-16 22:26:55 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- genBinaryOutput
2018-05-16 22:26:55 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- cid : genBinaryOutput
2018-05-16 22:26:55 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- sid : attrs
2018-05-16 22:26:55 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- outOfService : 0
2018-05-16 22:26:55 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- presentValue : 0
2018-05-16 22:26:55 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- statusFlags : 0
2018-05-16 22:26:56 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- genMultistateInput
2018-05-16 22:26:56 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- cid : genMultistateInput
2018-05-16 22:26:56 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- sid : attrs
2018-05-16 22:26:56 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- numberOfStates : 6
2018-05-16 22:26:56 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- outOfService : 0
2018-05-16 22:26:56 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- presentValue : 1
2018-05-16 22:26:56 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- statusFlags : 0
2018-05-16 22:26:56 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] - Endpoints: 5
2018-05-16 22:26:56 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] -- Clusters:
2018-05-16 22:26:57 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- zapp
2018-05-16 22:26:57 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- genBinaryOutput
2018-05-16 22:26:57 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- cid : genBinaryOutput
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- sid : attrs
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- outOfService : 0
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- presentValue : 0
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- statusFlags : 0
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- genMultistateInput
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- cid : genMultistateInput
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- sid : attrs
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- numberOfStates : 6
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- outOfService : 0
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- presentValue : 1
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- statusFlags : 0
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] - Endpoints: 6
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] -- Clusters:
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- zapp
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- genBinaryOutput
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- cid : genBinaryOutput
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- sid : attrs
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- outOfService : 0
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- presentValue : 0
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- statusFlags : 0
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] --- genMultistateInput
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- cid : genMultistateInput
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- sid : attrs
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- numberOfStates : 6
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- outOfService : 0
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- presentValue : 0
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ---- statusFlags : 0
2018-05-16 22:26:58 [log] [ManagerDrivers] [ctrl_ln2.aq1] [0] ------------------------------------------
*/
