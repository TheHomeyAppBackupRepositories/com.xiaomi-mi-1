// TODO add settings + Add genMultistateOutput options (single / double tripple press)

'use strict';

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const {
  debug, Cluster, CLUSTER,
} = require('zigbee-clusters');

const AqaraManufacturerSpecificCluster = require('../../lib/AqaraManufacturerSpecificCluster');
const AqaraMeteringDevice = require('../../lib/AqaraMeteringDevice');

Cluster.addCluster(AqaraManufacturerSpecificCluster);

class AqaraH1WallSwitchDoubleLN extends AqaraMeteringDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    this.powerMeasurementReporting = {};

    this.endpointIds = {
      leftSwitch: 1,
      rightSwitch: 2,
    };

    this.deviceLifetimeAttributes = {
      state: {
        capability: 'onoff',
        subDeviceId: 'leftSwitch',
      },
      state1: {
        capability: 'onoff',
        subDeviceId: 'rightSwitch',
      },
      power: {
        capability: 'measure_power',
        subDeviceId: 'leftSwitch',
      },
      consumption: {
        capability: 'meter_power',
        subDeviceId: 'leftSwitch',
      },
    };

    const subDeviceId = this.isSubDevice() ? this.getData().subDeviceId : 'leftSwitch';
    this.log('Initializing', subDeviceId, 'at endpoint', this.endpointIds[subDeviceId]);

    this.initAqaraMode();

    // Register capabilities and reportListeners for Left or Right switch
    if (this.hasCapability('onoff')) {
      this.debug('Register OnOff capability:', subDeviceId, 'at endpoint', this.endpointIds[subDeviceId]);
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        getOpts: {
          getOnStart: true,
        },
        endpoint: this.endpointIds[subDeviceId],
      });
    }

    // Register measure_power and meter_power capabilities and reportListeners only for main device
    if (!this.isSubDevice()) {
      zclNode.endpoints[41].clusters[CLUSTER.MULTI_STATE_INPUT.NAME]
        .on('attr.presentValue', this.onMSIPresentValueAttributeReport.bind(this, CLUSTER.MULTI_STATE_INPUT.NAME, 'presentValue', 'left'));
      zclNode.endpoints[42].clusters[CLUSTER.MULTI_STATE_INPUT.NAME]
        .on('attr.presentValue', this.onMSIPresentValueAttributeReport.bind(this, CLUSTER.MULTI_STATE_INPUT.NAME, 'presentValue', 'right'));
      zclNode.endpoints[51].clusters[CLUSTER.MULTI_STATE_INPUT.NAME]
        .on('attr.presentValue', this.onMSIPresentValueAttributeReport.bind(this, CLUSTER.MULTI_STATE_INPUT.NAME, 'presentValue', 'both'));
    }
    // Register the AttributeReportListener - Lifeline
    zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
      .on('attr.aqaraLifeline', this.onAqaraLifelineAttributeReport.bind(this));

    await super.onNodeInit({ zclNode });
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

  onMSIPresentValueAttributeReport(reportingClusterName, reportingAttribute, button, presentValue) {
    this.debug(`handle report (cluster: ${reportingClusterName}, attribute: ${reportingAttribute}, capability: NA), parsed payload: `, { presentValue, button });
  }

  /**
   * This is Xiaomi's custom lifeline attribute, it contains a lot of data, af which the most
   * interesting the battery level. The battery level divided by 1000 represents the battery
   * voltage. If the battery voltage drops below 2600 (2.6V) we assume it is almost empty, based
   * on the battery voltage curve of a CR1632.
   * @param {{batteryLevel: number}} lifeline
   */
  async onAqaraLifelineAttributeReport({
    state, state1, power, consumption, current, voltage,
  } = {}) {
    this.debug('lifeline attribute report', {
      state, state1, power, consumption, current, voltage,
    }, !this.isSubDevice());
    const subDeviceId = this.isSubDevice() ? this.getData().subDeviceId : 'leftSwitch';

    if (subDeviceId === 'leftSwitch') {
      // this.log('TEST', typeof state === 'boolean', typeof power === 'number', typeof consumption === 'number');
      if (this.hasCapability('onoff') && typeof state === 'boolean') {
        this.log('handle report (cluster: aqaraLifeline, capability: onoff), parsed payload:', state);
        this.setCapabilityValue('onoff', state).catch(this.error);
      }
      if (this.hasCapability('measure_power') && typeof power === 'number') {
        this.updatePowerMeasurement(power, 'aqaraLifeline');
        // this.log('handle report (cluster: aqaraLifeline, capability: measure_power), parsed payload:', power);
        // this.setCapabilityValue('measure_power', power).catch(this.error);
      }
      if (this.hasCapability('meter_power') && typeof consumption === 'number') {
        this.log('handle report (cluster: aqaraLifeline, capability: meter_power), parsed payload:', consumption);
        this.setCapabilityValue('meter_power', consumption).catch(this.error);
      }
    }
    if (subDeviceId === 'rightSwitch') {
      if (this.hasCapability('onoff') && typeof state1 === 'boolean') {
        this.log('handle report (cluster: aqaraLifeline, capability: onoff), parsed payload:', state1);
        this.setCapabilityValue('onoff', state1).catch(this.error);
      }
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    // aqaraPowerOutageMemory
    if (changedKeys.includes('save_state')) {
      this.log('disable LED:', newSettings.save_state);
      const result = await this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
        .writeAttributes({ aqaraPowerOutageMemory: newSettings.save_state });
      this.log('SETTINGS | Write Attribute - AqaraManufacturerSpecificCluster - aqaraPowerOutageMemory', newSettings.save_state, 'result:', result);
    }

    // aqaraPowerOutageMemory
    if (changedKeys.includes('disable_LED_indicator')) {
      this.log('disable LED:', newSettings.disable_LED_indicator);
      const result = await this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
        .writeAttributes({ aqaraLedDisabled: newSettings.disable_LED_indicator });
      this.log('SETTINGS | Write Attribute - AqaraManufacturerSpecificCluster - aqaraLedDisabled', newSettings.disable_LED_indicator, 'result:', result);
    }

    // aqaraPowerOutageMemory
    if (changedKeys.includes('switch_operation_mode')) {
      const result = await this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
        .writeAttributes({ aqaraSwitchOperationMode: newSettings.switch_operation_mode });
      this.log('SETTINGS | Write Attribute - AqaraManufacturerSpecificCluster - aqaraLedDisabled', newSettings.switch_operation_mode, 'result:', result);
    }
  }

}

module.exports = AqaraH1WallSwitchDoubleLN;

/*

this.debug(`handle report (cluster: ${cluster.NAME}, capability: ${capabilityId}), raw payload:`, payload);

PowerOffMemory : cl. 0xfcc0, attribute: 0x0201, unit: Boolean, True / false
TurnOffIndicatorLight: cl. 0xfcc0, attribute: 0x0203, unit: Boolean, True / false
 - time 21:00 - 09:00 attribute: 0x023e, unit: 32-bit Unsigned integer (0x23), 0x00090015 (Default)
 - time 21:00 - 08:00 attribute: 0x023e, unit: 32-bit Unsigned integer (0x23), 0x00080015
 - time 20:00 - 09:00 attribute: 0x023e, unit: 32-bit Unsigned integer (0x23), 0x00090014 (Default)
ChangeToWirelessSwitch
switch 1  wireless = yes: ep 1, cl. 0xfcc0, attribute: 0x0200, unit: Uint8, 0
switch 1  wireless = no: ep 1, cl. 0xfcc0, attribute: 0x0200, unit: Uint8, 1
switch 2  wireless = yes: ep 2, cl. 0xfcc0, attribute: 0x0200, unit: Uint8, 0
switch 2  wireless = no: ep 2, cl. 0xfcc0, attribute: 0x0200, unit: Uint8, 1

ep41: left
ep42: right
ep51 : both

Invert indicatorLight: cl. 0xfcc0, attribute: 0x00f0, unit: uint8, 1 (inverted), 0 (normal = default)

cl. 0xfcc0, 0x00ee attribute unint 32  2838 (0x000b16)

cl. onoff, attribute 0x00f5, unint32 Uint32: 35378944 (0x021bd700)

64:10:00:65:10:00:03:28:1b:98:39:00:00:00:00:95:39:03:f5:19:3c:96:39:0a:97:11:45:97:39:00:00:00:00:05:21:06:00:9a:20:10:09:21:02:05:0b:20:00:0d:23:16:0b:00:00:0e:23:00:00:00:00:0f:23:00:00:72:c4
*/
