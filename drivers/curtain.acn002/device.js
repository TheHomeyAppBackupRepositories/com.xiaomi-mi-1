// Definitions: Open = on = 100% (end state of up), Closed = off = 0% (end state of down)

'use strict';

const Homey = require('homey');

const { ZigBeeDevice, Util } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');
const AqaraManufacturerSpecificCluster = require('../../lib/AqaraManufacturerSpecificCluster');

Cluster.addCluster(AqaraManufacturerSpecificCluster);

class AqaraE1RollerShadeCompanion extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    if (this.isFirstInit()) {
      try {
        await zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME].writeAttributes({ mode: 1 }).catch(this.error);
      } catch (err) {
        this.error('failed to write mode attributes', err);
      }
    }

    try {
      const {
        aqaraCurtainReverse, aqaraCurtainOperatingSpeed, aqaraChargingStatus, aqaraBatteryStatus,
      } = await zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME].readAttributes('aqaraCurtainReverse', 'aqaraCurtainOperatingSpeed', 'aqaraChargingStatus', 'aqaraBatteryStatus').catch(this.error);
      this.log('READattributes during onInit: reverse_direction', aqaraCurtainReverse, 'aqaraCurtainOperatingSpeed', aqaraCurtainOperatingSpeed, 'aqaraChargingStatus', aqaraChargingStatus === 1, 'aqaraBatteryStatus', aqaraBatteryStatus);
      await this.setSettings({ reverse_direction: aqaraCurtainReverse, curtain_operating_speed: String(aqaraCurtainOperatingSpeed) });
    } catch (err) {
      this.log('could not read Attribute AqaraManufacturerSpecificCluster:', err);
    }

    // Define windowcoverings_set capability (1.0 = open, 0.0 = closed)
    if (this.hasCapability('windowcoverings_set')) {
      this.registerCapabilityListener('windowcoverings_set', async value => {
        this.log('windowcoverings_set - go to lift percentage', value, (value) * 100);
        await Util.wrapAsyncWithRetry(() => zclNode.endpoints[1].clusters[CLUSTER.ANALOG_OUTPUT.NAME].writeAttributes({ presentValue: (value) * 100 }), 3).catch(this.error);
      });

      // Get Position
      zclNode.endpoints[1].clusters[CLUSTER.ANALOG_OUTPUT.NAME]
        .on('attr.presentValue', this.onCurtainPositionAttrReport.bind(this));
    }

    // Get Position
    zclNode.endpoints[1].clusters[CLUSTER.MULTI_STATE_OUTPUT.NAME]
      .on('attr.presentValue', this.onCurtainStateAttrReport.bind(this));

    // Register the AttributeReportListener - Lifeline
    zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME]
      .on('attr.aqaraLifeline', this.onAqaraLifelineAttributeReport.bind(this));
  }

  onEndDeviceAnnounce() {
    this.log('device came online!');
    this.setAvailable().catch(this.error);
  }

  async onCurtainStateAttrReport(data) {
    // in some cases, when triggered from the controller, the device always reports closing (also in actual opening condition)
    const lookup = {
      0: 'closing',
      1: 'opening',
      2: 'paused',
      4: 'blocked',
    };
    if (this.hasCapability('alarm_motor')) {
      this.log('handle report (cluster: MultiStateOutput, attribute: presentValue, capability: alarm_motor), parsed payload:', data === 4);
      this.setCapabilityValue('alarm_motor', data === 4).catch(this.error);
    }
    if (this.hasCapability('curtain_motor_state') && data <= 2) {
      this.log('handle report (cluster: MultiStateOutput, attribute: presentValue, capability: curtain_motor_state), parsed payload:', lookup[data]);
      this.setCapabilityValue('curtain_motor_state', lookup[data]).catch(this.error);

      this.triggerFlow({
        id: 'curtain_motor_state',
        tokens: {},
        state: { motorState: lookup[data] },
      })
        .then(() => this.debug('Triggered curtainMotorStateTriggerDevice'))
        .catch(err => this.error('Error triggering curtainMotorStateTriggerDevice'));
    }
    // get position when motor is paused of blocked
    if (data >= 2) {
      const { presentValue } = await this.zclNode.endpoints[1].clusters[CLUSTER.ANALOG_OUTPUT.NAME].readAttributes('presentValue').catch(this.error);
      this.onCurtainPositionAttrReport(presentValue);
    }
  }

  async onCurtainPositionAttrReport(data) {
    if (this.hasCapability('windowcoverings_set')) {
      this.log('handle report (cluster: AnalogOutput, attribute: presentValue, capability: windowcoverings_set), parsed payload:', data / 100);
      this.setCapabilityValue('windowcoverings_set', (data / 100)).catch(this.error);
    }
  }

  onBatteryPercentageAttributeReport(reportingClusterName, reportingAttribute, batteryPercentage) {
    if (typeof batteryPercentage === 'number') {
      const parsedBatPct = batteryPercentage;
      if (this.hasCapability('measure_battery')) {
        this.log(`handle report (cluster: ${reportingClusterName}, attribute: ${reportingAttribute}, capability: measure_battery), parsed payload:`, parsedBatPct);
        this.setCapabilityValue('measure_battery', parsedBatPct).catch(this.error);
      }

      if (this.hasCapability('alarm_battery')) {
        this.log(`handle report (cluster: ${reportingClusterName}, attribute: ${reportingAttribute}, capability: alarm_battery), parsed payload:`, parsedBatPct < 20);
        this.setCapabilityValue('alarm_battery', parsedBatPct < 20).catch(this.error);
      }
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
    state, state1,
  } = {}) {
    this.log('lifeline attribute report', {
      state, state1,
    });
    // Postion
    if (typeof state === 'number' && state <= 100) {
      const parsedDim = (state / 100);
      this.log('onAqaraLifelineAttributeReport - windowcoverings_set', parsedDim);
      this.setCapabilityValue('windowcoverings_set', parsedDim).catch(this.error);
    }
    // Battery
    if (typeof state1 === 'number') {
      this.onBatteryPercentageAttributeReport('AqaraLifeline', 'state1', state1);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    const attributes = {};

    // reverse_direction attribute
    if (changedKeys.includes('reverse_direction')) {
      // const result = await this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
      //  .writeAttributes({ aqaraCurtainReverse: newSettings.reverse_direction ? 1 : 0 }).catch(this.error);
      attributes.aqaraCurtainReverse = newSettings['reverse_direction'];
      this.log('SETTINGS | Write Attribute - Aqara Manufacturer Specific Cluster - aqaraCurtainReverse', newSettings.reverse_direction ? 1 : 0);
    }

    // clear_position attribute
    if (changedKeys.includes('curtain_operating_speed')) {
      // const result = await this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
      //   .writeAttributes({ aqaraCurtainOperatingSpeed: newSettings.curtain_operating_speed }).catch(this.error);
      attributes.aqaraCurtainOperatingSpeed = newSettings['curtain_operating_speed'];
      this.log('SETTINGS | Write Attribute - Aqara Manufacturer Specific Cluster - aqaraCurtainOperatingSpeed', newSettings.curtain_operating_speed);
    }

    try {
      if (Object.keys(attributes).length > 0) {
        this.log('=>', attributes);
        await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
          .writeAttributes(attributes), 3);
      }
    } catch (err) {
      // reset settings values on failed update
      throw new Error(`failed to update settings. Message:${err}`);
    }
  }

  async setCurtainOperatingSpeedRunListener(args, state) {
    if (!args.hasOwnProperty('curtain_operating_speed')) throw new Error('curtain_operating_speed missing');
    try {
      this.log('FLOW > SETTINGS | Write Attribute - Aqara Manufacturer Specific Cluster - aqaraCurtainOperatingSpeed', newSettings.curtain_operating_speed);
      const result = await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
        .writeAttributes({ aqaraCurtainOperatingSpeed: args.curtain_operating_speed }), 3);
      return this.setSettings({
        curtain_operating_speed: args.curtain_operating_speed,
      });
    } catch (error) {
      return Promise.reject(error.message);
    }
  }

}

module.exports = AqaraE1RollerShadeCompanion;
