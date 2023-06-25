// model: 'SP-EUC01'

'use strict';

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const {
  debug, Cluster, CLUSTER,
} = require('zigbee-clusters');

const AqaraManufacturerSpecificCluster = require('../../lib/AqaraManufacturerSpecificCluster');

Cluster.addCluster(AqaraManufacturerSpecificCluster);

class AqaraSmartPlugEU extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    try {
      const {
        aqaraLedDisabled, aqaraPowerOutageMemory, aqaraPowerOffMemory, aqaraMaximumPower,
      } = await zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME].readAttributes('aqaraLedDisabled', 'aqaraPowerOutageMemory', 'aqaraPowerOffMemory', 'aqaraMaximumPower');
      this.log('READattributes options', aqaraLedDisabled, aqaraPowerOutageMemory, aqaraPowerOffMemory, aqaraMaximumPower);
      // await this.setSettings({ reverse_direction: xiaomiCurtainReverse, open_close_manual: !xiaomiCurtainOpenCloseManual });

      const attrs = await zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME].discoverAttributesExtended();
      this.log('READattributes attrs', attrs);
    } catch (err) {
      this.log('could not read Attribute xiaomiSwitchOptions:', err);
    }

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

    zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME]
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

module.exports = AqaraSmartPlugEU;
/*
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ------------------------------------------
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] Node: 9c5b5186-ad44-409f-9f5e-7c99e39a2d13
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] - Battery: false
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] - Endpoints: 0
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] -- Clusters:
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] --- zapp
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] --- genBasic
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- 65533 : 1
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- cid : genBasic
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- sid : attrs
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- zclVersion : 3
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- appVersion : 22
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- stackVersion : 2
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- hwVersion : 1
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- manufacturerName : LUMI
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- modelId : lumi.plug.maeu01
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- dateCode : 09-10-2019
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- powerSource : 1
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] --- genDeviceTempCfg
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- 65533 : 1
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- cid : genDeviceTempCfg
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- sid : attrs
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- currentTemperature : 23
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- devTempAlarmMask : 2
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- highTempThres : 65
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- highTempDwellTripPoint : 1
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] --- genIdentify
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- 65533 : 1
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- cid : genIdentify
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- sid : attrs
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- identifyTime : 0
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] --- genGroups
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- 65533 : 1
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- cid : genGroups
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- sid : attrs
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- nameSupport : 0
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] --- genScenes
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- 65533 : 1
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- cid : genScenes
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- sid : attrs
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- count : 0
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- currentScene : 0
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- currentGroup : 0
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- sceneValid : 0
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- nameSupport : 0
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- lastCfgBy : 0xffffffffffffffff
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] --- genOnOff
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- 65533 : 1
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- cid : genOnOff
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- sid : attrs
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- onOff : 0
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- globalSceneCtrl : 1
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] --- genAlarms
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- 65533 : 1
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- cid : genAlarms
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- sid : attrs
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- alarmCount : 0
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] --- genTime
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- cid : genTime
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- sid : attrs
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] --- genOta
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- cid : genOta
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- sid : attrs
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] --- seMetering
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- 65533 : 1
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- cid : seMetering
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- sid : attrs
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- currentSummDelivered : [ 0, 136 ]
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- status : 0
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- unitOfMeasure : 0
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- multiplier : 1
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- divisor : 1000
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- summaFormatting : 35
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- demandFormatting : 0
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- meteringDeviceType : 0
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] --- haElectricalMeasurement
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- 65533 : 1
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- cid : haElectricalMeasurement
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- sid : attrs
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- measurementType : 8
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- activePower : 0
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- acPowerMultiplier : 1
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- acPowerDivisor : 10
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- acAlarmsMask : 4
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- acActivePowerOverload : 2300
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] - Endpoints: 1
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] -- Clusters:
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] --- zapp
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] --- genGreenPowerProxy
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- cid : genGreenPowerProxy
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ---- sid : attrs
2020-02-25 13:19:52 [log] [ManagerDrivers] [plug.maeu01] [0] ------------------------------------------

{ '3': 32,							= soc_temperature
  '5': 4,
  '7': 0,
  '8': 4886,
  '9': 770,
  '59': 7289341,
  '62': 103021886,
  '100': 1,
  '253': 16 }

Cluster: genBasic (0x0000)
Atribute: Unknown (0xfff0)
Data Type: Octet String (0x41), length: 9
Disabled indicator: 	aa8005d14713031001
Enabled indicator:  	aa8005d14714031000

Power failure memory
enabled:  						aa8005d1472a011001
disabled: 						aa8005d14729011000	aa8005d1472b011000

Charging protection
enabled:							aa8005d1472c021001
disabled:							aa8005d1472d021000

ACTUAL from G2H:
Cluster 0xFCC0, Attribute 0x0207, type bool, powerOfMemory
Cluster 0xFCC0, Attribute 0x020b, type 0x39 (float), Maximum power 100 - 2300 W

*/
