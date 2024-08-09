// Definitions: Open = on = 100% (end state of up), Closed = off = 0% (end state of down)

'use strict';

const Homey = require('homey');

const { ZigBeeDevice, Util } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');

const AqaraManufacturerSpecificCluster = require('../../lib/AqaraManufacturerSpecificCluster');
// const AqaraSpecificWindowCoveringCluster = require('../../lib/AqaraSpecificWindowCoveringCluster');

Cluster.addCluster(AqaraManufacturerSpecificCluster);
// Cluster.addCluster(AqaraSpecificWindowCoveringCluster);

class AqaraCurtainDriverE1 extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    if (!this.hasCapability('button.auto_calibration_start')) await this.addCapability('button.auto_calibration_start');
    if (!this.hasCapability('button.auto_calibration_cont_open')) await this.addCapability('button.auto_calibration_cont_open');
    if (!this.hasCapability('button.auto_calibration_cont_closed')) await this.addCapability('button.auto_calibration_cont_closed');

    // Define windowcoverings_set capability (1.0 = open, 0.0 = closed)
    if (this.hasCapability('windowcoverings_set')) {
      this.registerCapability('windowcoverings_set', CLUSTER.WINDOW_COVERING, {
        getOpts: {
          getOnStart: true,
        },
        get: 'currentPositionLiftPercentage',
        set: 'goToLiftPercentage',
        async setParser(value) {
          const mappedValue = Util.mapValueRange(0, 1, 0, 100, value);
          const gotToLiftPercentageCommand = {
            // Round, otherwise might not be accepted by device
            percentageLiftValue: Math.round(mappedValue),
          };
          this.debug(`set → \`windowcoverings_set\`: ${value} → setParser → goToLiftPercentage`, gotToLiftPercentageCommand);
          // Send goToLiftPercentage command
          return gotToLiftPercentageCommand;
        },
        report: 'currentPositionLiftPercentage',
        reportParser(value) {
          if (value < 0 || value > 100) return null;
          // Parse input value
          const parsedValue = Util.mapValueRange(0, 100, 0, 1, value);
          return parsedValue;
        },
        endpoint: 1,
      });

      // Get Position
      zclNode.endpoints[1].clusters[CLUSTER.ANALOG_OUTPUT.NAME]
        .on('attr.presentValue', this.onCurtainPositionAttrReport.bind(this));

      // Get Position
      zclNode.endpoints[1].clusters[CLUSTER.WINDOW_COVERING.NAME]
        .on('attr.currentPositionLiftPercentage', this.onCurtainPositionAttrReport.bind(this));
    }

    // Define measure_battery capability
    if (this.hasCapability('measure_battery')) {
      // TEMP: configureAttributeReporting for batteryPercentageRemaining on each init
      if (this.isFirstInit()) {
        await this.configureAttributeReporting([{
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 60000,
          minChange: 2,
        }]);
      }

      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        getOpts: {
          getOnStart: true,
        },
        endpoint: 1,
      });
    }

    // Register the AttributeReportListener - Lifeline
    zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME]
      .on('attr.aqaraLifeline', this.onAqaraLifelineAttributeReport.bind(this))
      .on('attr.aqaraCurtainMoveState', this.onCurtainStateAttrReport.bind(this))
      .on('attr.aqaraCurtainHookState', this.onCurtainHookStateAttrReport.bind(this))
      .on('attr.aqaraCurtainLightSensor', this.onCurtainLightSensorAttrReport.bind(this))
      .on('attr.aqaraCurtainTargetPosition', this.onCurtainPositionAttrReport.bind(this));

    zclNode.endpoints[1].clusters[CLUSTER.BASIC.NAME]
      .on('attr.powerSource', this.onPowerSourceAttrReport.bind(this));

    this.registerCapabilityListener('button.hook_unlock', async () => {
      return this.maintenanceHookActions('UNLOCK');
    });

    this.registerCapabilityListener('button.hook_lock', async () => {
      return this.maintenanceHookActions('LOCK');
    });

    this.registerCapabilityListener('button.auto_calibration_start', async () => {
      await this.maintenanceCalibrationStart();
    });

    this.registerCapabilityListener('button.auto_calibration_cont_open', async () => {
      await this.maintenanceCalibrationContinue('Fully Open');
    });

    this.registerCapabilityListener('button.auto_calibration_cont_closed', async () => {
      await this.maintenanceCalibrationContinue('Fully Closed');
    });
  }

  async onPowerSourceAttrReport(data) {
    if (this.hasCapability('curtain_power_source')) {
      // Cluster definition is not updated to handle 0x07 as power source
      if (data !== undefined) {
        this.log('handle report (cluster: Basic, attribute: powerSource, capability: curtain_power_source), parsed payload:', data);
        this.setCapabilityValue('curtain_power_source', data).catch(this.error);
      }
    }
  }

  async onCurtainHookStateAttrReport(data) {
    if (this.hasCapability('curtain_hook_state')) {
      const lookup = {
        0: 'unlocked',
        1: 'locked',
        2: 'locking',
        3: 'unlocking',
      };
      this.log('handle report (cluster: AqaraManufacturerSpecificCluster, attribute: aqaraCurtainHookState, capability: curtain_hook_state), payload:', data, 'parsed payload:', lookup[data]);
      this.setCapabilityValue('curtain_hook_state', lookup[data]).catch(this.error);
    }
  }

  async onCurtainLightSensorAttrReport(data) {
    if (this.hasCapability('curtain_light_sensor')) {
      const lookup = {
        0: 'dark',
        1: 'light',
        2: 'medium',
      };
      this.log('handle report (cluster: AqaraManufacturerSpecificCluster, attribute: aqaraCurtainLightSensor, capability: curtain_light_sensor), payload:', data, 'parsed payload:', lookup[data]);
      this.setCapabilityValue('curtain_light_sensor', lookup[data]).catch(this.error);
    }
  }

  async onCurtainPositionAttrReport(data) {
    if (this.hasCapability('windowcoverings_set')) {
      const parsedValue = Util.mapValueRange(0, 100, 0, 1, data);
      this.log('handle report (cluster: AnalogOutput, attribute: presentValue, capability: windowcoverings_set), parsed payload:', parsedValue);
      this.setCapabilityValue('windowcoverings_set', parsedValue).catch(this.error);
    }
  }

  async onCurtainStateAttrReport(data) {
    // in some cases, when triggered from the controller, the device always reports closing (also in actual opening condition)
    const lookup = {
      0: 'closing',
      1: 'opening',
      2: 'paused',
      3: 'paused during calibration',
    };
    if (this.hasCapability('alarm_motor')) {
      this.log('handle report (cluster: AqaraManufacturerSpecificCluster, attribute: aqaraCurtainMoveState, capability: alarm_motor), parsed payload:', data === 4);
      this.setCapabilityValue('alarm_motor', data === 4).catch(this.error);
    }
    let parsedValue = null;
    if (this.hasCapability('curtain_motor_state')) {
      if (data === 3) {
        parsedValue = 'paused';
        this.log('handle report (cluster: AqaraManufacturerSpecificCluster, attribute: aqaraCurtainMoveState, capability: curtain_motor_state), parsed payload:', lookup[data]);
      }
      if (data <= 2) {
        parsedValue = lookup[data];
        this.log('handle report (cluster: AqaraManufacturerSpecificCluster, attribute: aqaraCurtainMoveState, capability: curtain_motor_state), parsed payload:', parsedValue);
      }
      // When autoCalibrationInProgress and paused or paused during calibration is received, emit event to calibration maintenanceAction
      if (this.autoCalibrationInProgress > 0 && data >= 2) this.homey.app.emit(`aqaraE1CurtainDriver.CurtainState: ${parsedValue}`);

      this.setCapabilityValue('curtain_motor_state', parsedValue).catch(this.error);
      this.triggerFlow({
        id: 'curtain_motor_state',
        tokens: {},
        state: { motorState: parsedValue },
      })
        .then(() => this.debug('Triggered curtainMotorStateTriggerDevice'))
        .catch(err => this.error('Error triggering curtainMotorStateTriggerDevice'));
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
    if (typeof state === 'number') {
    //  const parsedDim = (state / 100);
    //  this.log('onAqaraLifelineAttributeReport - windowcoverings_set', parsedDim);
    //  this.setCapabilityValue('windowcoverings_set', parsedDim).catch(this.error);
    }
    // Battery
    if (typeof state1 === 'number') {
      // this.onBatteryPercentageAttributeReport('AqaraLifeline', 'state1', state1);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    const attributes = {};

    // reverse_direction attribute
    if (changedKeys.includes('open_close_manual')) {
      attributes.aqaraCurtainHandOpen = !newSettings.open_close_manual;
      // const result = await this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
      //   .writeAttributes({ aqaraCurtainHandOpen: !newSettings.open_close_manual }).catch(this.error);
      this.log('SETTINGS | Write Attribute - Aqara Manufacturer Specific Cluster - aqaraCurtainHandOpen', newSettings.open_close_manual);
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

  async maintenanceHookActions(action) {
    this.debug('MaintenanceAction | Hook actions', action === 'LOCK' ? 'LOCKING' : 'UNLOCKING');
    await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
      .writeAttributes({ aqaraCurtainHookActions: action === 'LOCK' ? 1 : 0 }), 3).catch(this.error);
  }

  async maintenanceCalibrationStart() {
    this.log('MaintenanceAction | Auto calibration - start');

    this.debug('MaintenanceAction | Auto calibration - checking hook status');
    const { aqaraCurtainHookState } = await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
      .readAttributes(['aqaraCurtainHookState']), 3).catch(this.error);
    // if (attrs) {
    //  const { aqaraCurtainHookState } = attrs;
    // }

    if (aqaraCurtainHookState !== 1) throw new Error('Curtain driver not fully locked, lock first');

    this.autoCalibrationInProgress = 1;
    this.debug('MaintenanceAction | Auto calibration - reseting calibration points');
    await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
      .writeAttributes({ aqaraCurtainCalibrationActions: 0 }), 3)
      .catch(this.error);

    this.debug('MaintenanceAction | Auto calibration - starting auto calibration mode');
    await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
      .writeAttributes({ aqaraCalibrationMode: 0 }), 3)
      .catch(this.error);

    this.debug('MaintenanceAction | Auto calibration - normalizing direction');

    // direct usage of writeAttributes is not possible, use containment instead
    /*
    await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[this.getClusterEndpoint(AqaraSpecificWindowCoveringCluster)].clusters[AqaraSpecificWindowCoveringCluster.NAME]
      //  .writeAttributes({ mode: 0x00 })
      .writeAttributes({ mode: { motorDirectionReversed: false } }), 3)
      .catch(this.error);
    */
    const node = await this.homey.zigbee.getNode(this);

    await Util.wrapAsyncWithRetry(() => node.sendFrame(
      1, // endpoint id
      0x0102, // cluster id
      Buffer.from([
        0, // frame control
        this.nextSeqNr(), // transaction sequence number
        0x02, // write attirbute
        0x17, // attributes
        0x00, // first part of attribute
        0x18, // type
        0x00, // value
      ]),
    ), 3)
      .catch(this.error);

    this.debug('MaintenanceAction | Auto calibration - start moving');
    await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[this.getClusterEndpoint(CLUSTER.WINDOW_COVERING)].clusters[CLUSTER.WINDOW_COVERING.NAME]
      .upOpen(), 3)
      .catch(this.error);

    // wait for event listener to complete
    this.homey.app.once('aqaraE1CurtainDriver.CurtainState: paused', async () => {
      this.autoCalibrationTimeout = setTimeout(() => {
        if (this.autoCalibrationInProgress !== 2) {
          this.log('MaintenanceAction | Auto calibration - timed out (120 seconds)');
          this.autoCalibrationInProgress = 0;
        }
      }, 120 * 1000);
      return this.log('MaintenanceAction | Auto calibration - finished first step');
    });
  }

  async maintenanceCalibrationContinue(state) {
    if (this.autoCalibrationInProgress === 0) {
      this.log('MaintenanceAction | Auto calibration - not started or time out exceeded');
      throw new Error('Auto calibration not started or timed out, please restart with step 1');
    }
    this.debug('MaintenanceAction | Auto calibration - continue with second step, based on user input', state);
    clearTimeout(this.autoCalibrationTimeout);
    this.autoCalibrationInProgress = 2;

    if (state === 'Fully Open') {
      this.debug('MaintenanceAction | Auto calibration - start moving back(downClose)');
      await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[this.getClusterEndpoint(CLUSTER.WINDOW_COVERING)].clusters[CLUSTER.WINDOW_COVERING.NAME]
        .downClose(), 3)
        .catch(this.error);
    } else {
      this.debug('MaintenanceAction | Auto calibration - changing direction');

      // direct usage of writeAttributes is not possible, use containment instead
      /*
      await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[this.getClusterEndpoint(AqaraSpecificWindowCoveringCluster)].clusters[AqaraSpecificWindowCoveringCluster.NAME]
        .writeAttributes({ mode: { motorDirectionReversed: false } }), 3)
        .catch(this.error);
      */

      const node = await this.homey.zigbee.getNode(this);
      await Util.wrapAsyncWithRetry(() => node.sendFrame(
        1, // endpoint id
        0x0102, // cluster id
        Buffer.from([
          0, // frame control
          this.nextSeqNr(), // transaction sequence number
          0x02, // write attirbute
          0x17, // attributes
          0x00, // first part of attribute
          0x18, // type
          0x01, // value
        ]),
      ), 3)
        .catch(this.error);

      this.debug('MaintenanceAction | Auto calibration - start moving back (upOpen)');
      await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[this.getClusterEndpoint(CLUSTER.WINDOW_COVERING)].clusters[CLUSTER.WINDOW_COVERING.NAME]
        // .downClose(), 3)
        .upOpen(), 3)
        .catch(this.error);
    }
    // wait for event listener to complete
    this.homey.app.once('aqaraE1CurtainDriver.CurtainState: paused', async () => {
      this.autoCalibrationInProgress = 0;
      return this.log('MaintenanceAction | Auto calibration - finished second step = calibration');
    });
  }

  /**
   * Generates next transaction sequence number.
   * @returns {number} - Transaction sequence number.
   * @private
   */
  nextSeqNr() {
    this._nextTrxSeqNr = (this._nextTrxSeqNr + 1) % 256;
    return this._nextTrxSeqNr;
  }

}

module.exports = AqaraCurtainDriverE1;
