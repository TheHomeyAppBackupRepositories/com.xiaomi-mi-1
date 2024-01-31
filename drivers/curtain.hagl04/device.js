// Definitions: Open = on = 100% (end state of up), Closed = off = 0% (end state of down)

'use strict';

const commandMap = {
  up: 0,
  idle: 2,
  down: 1,
};

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');

const XiaomiBasicCluster = require('../../lib/XiaomiBasicCluster');

Cluster.addCluster(XiaomiBasicCluster);

const REPORT_DEBOUNCER = 2000;

class AqaraCurtainB1 extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    //  debug(true);

    // print the node's info to the console
    // this.printNode();

    try {
      const { xiaomiCurtainClearPosition, xiaomiCurtainReverse, xiaomiCurtainOpenCloseManual } = await zclNode.endpoints[this.getClusterEndpoint(XiaomiBasicCluster)].clusters[XiaomiBasicCluster.NAME].readAttributes('xiaomiCurtainClearPosition', 'xiaomiCurtainReverse', 'xiaomiCurtainOpenCloseManual').catch(this.error);
      this.log('READattributes clear_position', xiaomiCurtainClearPosition, 'reverse_direction', xiaomiCurtainReverse, 'open_close_manual', xiaomiCurtainOpenCloseManual, '(', !xiaomiCurtainOpenCloseManual, ')');
      await this.setSettings({ reverse_direction: xiaomiCurtainReverse, open_close_manual: !xiaomiCurtainOpenCloseManual });
    } catch (err) {
      this.log('could not read Attribute XiaomiBasicCluster:', err);
    }

    // try {
    //  const result = await this.zclNode.endpoints[this.getClusterEndpoint(XiaomiBasicCluster)].clusters[XiaomiBasicCluster.NAME]
    //    .writeAttributes({ xiaomiCurtainOpenCloseManual: false });
    //  this.log('SETTINGS | Write Attribute - Xiaomi Basic Cluster - xiaomiCurtainOpenCloseManual', true, 'result:', result);
    // } catch (err) {
    //  this.log('could not read Attribute XiaomiBasicCluster:', err);
    // }

    // Add onoff capability if not available
    if (this.hasCapability('onoff')) {
      await this.removeCapability('onoff').catch(this.error);
    }

    // Add windowcoverings_closed capability if not available
    if (!this.hasCapability('windowcoverings_closed')) {
      await this.addCapability('windowcoverings_closed').catch(this.error);
    }

    // Define windowcoverings_closed capability (true = closed, false = open)
    if (this.hasCapability('windowcoverings_closed')) {
      this.registerCapabilityListener('windowcoverings_closed', async value => {
        this.log('windowcoverings_closed |', value, '- go to state', commandMap[value ? 'down' : 'up']);
        await zclNode.endpoints[1].clusters[CLUSTER.MULTI_STATE_OUTPUT.NAME].writeAttributes({ presentValue: commandMap[value ? 'down' : 'up'] }).catch(this.error);
        this._reportDebounceEnabled = true;
      });
    }

    // Define windowcoverings_state capability (up (to open end state) = 1, down (to closed end state) = 0, idle = 2)
    if (this.hasCapability('windowcoverings_state')) {
      this.registerCapability('windowcoverings_state', CLUSTER.MULTI_STATE_OUTPUT, {
        get: 'presentValue',
        getOpts: {
          getOnStart: true,
        },
        endpoint: 1,
      });

      this.registerCapabilityListener('windowcoverings_state', async value => {
        this.log('windowcoverings_state - go to state', commandMap[value]);
        await zclNode.endpoints[1].clusters[CLUSTER.MULTI_STATE_OUTPUT.NAME].writeAttributes({ presentValue: commandMap[value] }).catch(this.error);
      });
    }

    // Define windowcoverings_set capability (1.0 = open, 0.0 = closed)
    if (this.hasCapability('windowcoverings_set')) {
      this.registerCapability('windowcoverings_set', CLUSTER.ANALOG_OUTPUT, {
        get: 'presentValue',
        getOpts: {
          getOnStart: true,
        },
        endpoint: 1,
      });

      this.registerCapabilityListener('windowcoverings_set', async value => {
        this.log('windowcoverings_set - go to lift percentage', (1 - value) * 100);
        await zclNode.endpoints[1].clusters[CLUSTER.ANALOG_OUTPUT.NAME].writeAttributes({ presentValue: (1 - value) * 100 }).catch(this.error);
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
      await this.configureAttributeReporting([{
        cluster: CLUSTER.POWER_CONFIGURATION,
        attributeName: 'batteryPercentageRemaining',
        minInterval: 3600,
        maxInterval: 60000,
        minChange: 2,
      }]);

      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        getOpts: {
          getOnStart: true,
        },
        endpoint: 1,
      });
    }

    // Register the AttributeReportListener - Lifeline
    zclNode.endpoints[1].clusters[XiaomiBasicCluster.NAME]
      .on('attr.xiaomiLifeline', this.onXiaomiLifelineAttributeReport.bind(this));

    // Add button.calibrate capability if not available
    if (!this.hasCapability('button.calibrate')) {
      await this.addCapability('button.calibrate').catch(this.error);
    }

    this.registerCapabilityListener('button.calibrate', async () => {
      try {
        // Step 1: set clear position attribute to true
        this.debug('MaintenanceAction | Calibrate Tracks - Step 1: Start calibration and write Attribute to True');
        const result = await this.zclNode.endpoints[this.getClusterEndpoint(XiaomiBasicCluster)].clusters[XiaomiBasicCluster.NAME]
          .writeAttributes({ xiaomiCurtainClearPosition: true });
        // Step 2-4: Cycle curtains close - open to define new end points and set attribute back to false
        this.calibrateCurtainTracks();
      } catch (err) {
        this.debug('MaintenanceAction | Calibrate Tracks - ERROR: Could not complete maintenanceAction:', err);
        throw new Error('Something went wrong');
      }
      // Maintenance action button was pressed, return a promise
      return true;
    });
  }

  async onCurtainPositionAttrReport(data) {
    this.debug('onCurtainPositionAttrReport', data);
    clearTimeout(this.curtainTernaryTimeout);

    if (data === 2) {
      this.log('onCurtainPositionAttrReport - windowcoverings_state', 'idle');
      this.setCapabilityValue('windowcoverings_state', 'idle').catch(this.error);
    }

    // If reports are not generated by set command from Homey update directly
    if (data !== 2 && !this._reportDebounceEnabled) {
      const { presentValue } = await this.zclNode.endpoints[1].clusters[CLUSTER.ANALOG_OUTPUT.NAME].readAttributes('presentValue').catch(this.error);

      this.log('onCurtainPositionAttrReport - windowcoverings_closed', presentValue !== 0);
      this.setCapabilityValue('windowcoverings_closed', presentValue !== 0).catch(this.error);

      this.log('onCurtainPositionAttrReport - windowcoverings_set', presentValue, 1 - (presentValue / 100));
      this.setCapabilityValue('windowcoverings_set', 1 - (presentValue / 100)).catch(this.error);
    }

    // Else set debounce timeout to prevent capability value updates while moving
    if (this._reportPercentageDebounce) clearTimeout(this._reportPercentageDebounce);
    this._reportPercentageDebounce = setTimeout(() => this._reportDebounceEnabled = false, REPORT_DEBOUNCER);

    // update Ternary buttons
    this.curtainTernaryTimeout = setTimeout(() => {
      this.setCapabilityValue('windowcoverings_state', 'idle').catch(this.error);
    }, 3000);
  }

  /**
   * This is Xiaomi's custom lifeline attribute, it contains a lot of data, af which the most
   * interesting the battery level. The battery level divided by 1000 represents the battery
   * voltage. If the battery voltage drops below 2600 (2.6V) we assume it is almost empty, based
   * on the battery voltage curve of a CR1632.
   * @param {{batteryLevel: number}} lifeline
   */
  onXiaomiLifelineAttributeReport({
    state,
  } = {}) {
    this.log('lifeline attribute report', {
      state,
    });

    if (typeof state === 'number') {
      const parsedDim = 1 - (state / 100);
      this.log('onXiaomiLifelineAttributeReport - windowcoverings_set', parsedDim);
      this.setCapabilityValue('windowcoverings_set', parsedDim).catch(this.error);
      // this.setCapabilityValue('onoff', parsedDim === 1).catch(this.error);
      this.setCapabilityValue('windowcoverings_closed', parsedDim === 0).catch(this.error);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    // reverse_direction attribute
    if (changedKeys.includes('reverse_direction')) {
      const result = await this.zclNode.endpoints[this.getClusterEndpoint(XiaomiBasicCluster)].clusters[XiaomiBasicCluster.NAME]
        .writeAttributes({ xiaomiCurtainReverse: newSettings.reverse_direction }).catch(this.error);
      this.log('SETTINGS | Write Attribute - Xiaomi Basic Cluster - xiaomiCurtainReverse', newSettings.reverse_direction, 'result:', result);
    }

    // clear_position attribute
    if (changedKeys.includes('clear_position')) {
      const result = await this.zclNode.endpoints[this.getClusterEndpoint(XiaomiBasicCluster)].clusters[XiaomiBasicCluster.NAME]
        .writeAttributes({ xiaomiCurtainClearPosition: newSettings.clear_position }).catch(this.error);
      this.log('SETTINGS | Write Attribute - Xiaomi Basic Cluster - xiaomiCurtainClearPosition', newSettings.clear_position, 'result:', result);
    }

    // reverse_direction attribute
    if (changedKeys.includes('open_close_manual')) {
      const result = await this.zclNode.endpoints[this.getClusterEndpoint(XiaomiBasicCluster)].clusters[XiaomiBasicCluster.NAME]
        .writeAttributes({ xiaomiCurtainOpenCloseManual: !newSettings.open_close_manual }).catch(this.error);
      this.log('SETTINGS | Write Attribute - Xiaomi Basic Cluster - xiaomiCurtainOpenCloseManual', newSettings.open_close_manual, 'result:', result);
    }

    try {
      const { xiaomiCurtainClearPosition, xiaomiCurtainReverse, xiaomiCurtainOpenCloseManual } = await this.zclNode.endpoints[this.getClusterEndpoint(XiaomiBasicCluster)].clusters[XiaomiBasicCluster.NAME].readAttributes('xiaomiCurtainClearPosition', 'xiaomiCurtainReverse', 'xiaomiCurtainOpenCloseManual');
      this.log('READattributes', xiaomiCurtainClearPosition, xiaomiCurtainReverse, xiaomiCurtainOpenCloseManual, '(', !xiaomiCurtainOpenCloseManual, ')');
      // await this.setSettings({ clear_position: xiaomiCurtainClearPosition, reverse_direction: xiaomiCurtainReverse, open_close_manual: xiaomiCurtainOpenCloseManual });
    } catch (err) {
      this.log('could not read Attribute XiaomiBasicCluster:', err);
    }
  }

  async calibrateCurtainTracks() {
    // Step 2-5: Cycle curtains open - close - open to define new end points and set attribute back to false
    const delay = ms => new Promise(res => setTimeout(res, ms));
    // Step 2: fully open curtains and wait for 20 seconds
    this.debug('MaintenanceAction | Calibrate Tracks - Step 2: Fully close and wait 20 seconds');
    await this.zclNode.endpoints[1].clusters[CLUSTER.MULTI_STATE_OUTPUT.NAME].writeAttributes({ presentValue: commandMap['down'] }).catch(this.error);
    await delay(20000);

    // Step 3: fully close curtains and wait for 20 seconds
    this.debug('MaintenanceAction | Calibrate Tracks - Step 3: Fully open and wait 20 seconds');
    await this.zclNode.endpoints[1].clusters[CLUSTER.MULTI_STATE_OUTPUT.NAME].writeAttributes({ presentValue: commandMap['up'] }).catch(this.error);
    await delay(20000);

    // Step 4: Set clear position attribute to false
    this.debug('MaintenanceAction | Calibrate Tracks - Step 4: Finalize and write Attribute to False');
    await this.zclNode.endpoints[this.getClusterEndpoint(XiaomiBasicCluster)].clusters[XiaomiBasicCluster.NAME]
      .writeAttributes({ xiaomiCurtainClearPosition: false }).catch(this.error);
  }

}

module.exports = AqaraCurtainB1;

/*
Product type no: ZNCLDJ12LM
2019-10-24 21:58:25 [log] [ManagerDrivers] [curtain.hagl04] [0] ------------------------------------------
2019-10-24 21:58:25 [log] [ManagerDrivers] [curtain.hagl04] [0] Node: f876d475-14e0-434e-be1f-396ef435c236
2019-10-24 21:58:25 [log] [ManagerDrivers] [curtain.hagl04] [0] - Battery: false
2019-10-24 21:58:25 [log] [ManagerDrivers] [curtain.hagl04] [0] - Endpoints: 0
2019-10-24 21:58:25 [log] [ManagerDrivers] [curtain.hagl04] [0] -- Clusters:
2019-10-24 21:58:25 [log] [ManagerDrivers] [curtain.hagl04] [0] --- zapp
2019-10-24 21:58:25 [log] [ManagerDrivers] [curtain.hagl04] [0] --- genBasic
2019-10-24 21:58:25 [log] [ManagerDrivers] [curtain.hagl04] [0] ---- cid : genBasic
2019-10-24 21:58:25 [log] [ManagerDrivers] [curtain.hagl04] [0] ---- sid : attrs
2019-10-24 21:58:25 [log] [ManagerDrivers] [curtain.hagl04] [0] --- genPowerCfg
2019-10-24 21:58:25 [log] [ManagerDrivers] [curtain.hagl04] [0] ---- cid : genPowerCfg
2019-10-24 21:58:25 [log] [ManagerDrivers] [curtain.hagl04] [0] ---- sid : attrs
2019-10-24 21:58:25 [log] [ManagerDrivers] [curtain.hagl04] [0] --- genIdentify
2019-10-24 21:58:25 [log] [ManagerDrivers] [curtain.hagl04] [0] ---- cid : genIdentify
2019-10-24 21:58:25 [log] [ManagerDrivers] [curtain.hagl04] [0] ---- sid : attrs
2019-10-24 21:58:25 [log] [ManagerDrivers] [curtain.hagl04] [0] --- genTime
2019-10-24 21:58:25 [log] [ManagerDrivers] [curtain.hagl04] [0] ---- cid : genTime
2019-10-24 21:58:25 [log] [ManagerDrivers] [curtain.hagl04] [0] ---- sid : attrs
2019-10-24 21:58:25 [log] [ManagerDrivers] [curtain.hagl04] [0] --- genAnalogOutput
2019-10-24 21:58:26 [log] [ManagerDrivers] [curtain.hagl04] [0] ---- cid : genAnalogOutput
2019-10-24 21:58:26 [log] [ManagerDrivers] [curtain.hagl04] [0] ---- sid : attrs
2019-10-24 21:58:26 [log] [ManagerDrivers] [curtain.hagl04] [0] --- genMultistateOutput
2019-10-24 21:58:26 [log] [ManagerDrivers] [curtain.hagl04] [0] ---- cid : genMultistateOutput
2019-10-24 21:58:26 [log] [ManagerDrivers] [curtain.hagl04] [0] ---- sid : attrs
2019-10-24 21:58:26 [log] [ManagerDrivers] [curtain.hagl04] [0] --- closuresWindowCovering
2019-10-24 21:58:26 [log] [ManagerDrivers] [curtain.hagl04] [0] ---- cid : closuresWindowCovering
2019-10-24 21:58:26 [log] [ManagerDrivers] [curtain.hagl04] [0] ---- sid : attrs
2019-10-24 21:58:26 [log] [ManagerDrivers] [curtain.hagl04] [0] ------------------------------------------

2018-03-04 16:56:10 [log] [ManagerDrivers] [curtain] [0] lifeline report <Buffer 03 28 1e 05 21 06 00 64 20 fd 08 21 09 11 07 27 00 00 00 00 00 00 00 00 09 21 00 01>

// does require mfgCode: 0x115F in attribute write command
// clear position: genBasic, 0xff27, bool = false
// Reverse: genBasic, 0xff28, bool = true (normal), false (reverse)
// Open / close curtain manually: genBasic, 0xff29, bool = false (not manually), true (manually)
// genBasic, 0xff2A, 0

// powerSource = 1 = adapter only, 3 = battery, 4 = battery + adapter
this.node.endpoints[0].clusters.genBasic.read('powerSource')
  .then(res => {
    this.debug('Read powerSource: ', res);
  })
  .catch(err => {
    this.error('Read powerSource: ', err);
  });

*/
