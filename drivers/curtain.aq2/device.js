// Definitions: Open = on = 100% (end state of up), Closed = off = 0% (end state of down)

'use strict';

const Homey = require('homey');

const { ZigBeeDevice, Util } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');
const XiaomiBasicCluster = require('../../lib/XiaomiBasicCluster');
const AqaraSpecificWindowCoveringCluster = require('../../lib/AqaraSpecificWindowCoveringCluster');

class AqaraRollerShadeMotor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    // Define windowcoverings_set capability (1.0 = open, 0.0 = closed)
    if (this.hasCapability('windowcoverings_set')) {
      this.registerCapabilityListener('windowcoverings_set', async value => {
        this.log('windowcoverings_set - go to lift percentage', value, (value) * 100);
        await zclNode.endpoints[1].clusters[CLUSTER.ANALOG_OUTPUT.NAME].writeAttributes({ presentValue: (value) * 100 }).catch(this.error);
      });

      // Get Position
      zclNode.endpoints[1].clusters[XiaomiBasicCluster.NAME]
        .on('attr.aqaraCurtainMotorState', this.onCurtainStateAttrReport.bind(this));
    }

    // Get Position
    zclNode.endpoints[1].clusters[CLUSTER.MULTI_STATE_OUTPUT.NAME]
      .on('attr.presentValue', this.onCurtainStateAttrReport.bind(this));

    // Register the AttributeReportListener - Lifeline
    // zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME]
    //  .on('attr.aqaraLifeline', this.onAqaraLifelineAttributeReport.bind(this));
  }

  onEndDeviceAnnounce() {
    this.log('device came online!');
    this.setAvailable().catch(this.error);
  }

  async onCurtainStateAttrReport(data) {
    const lookup = {
      0: 'paused',
      1: 'opening',
      2: 'closing',
    };
    if (this.hasCapability('alarm_motor')) {
      this.log('handle report (cluster: MultiStateOutput, attribute: presentValue, capability: alarm_motor), parsed payload:', data === 4);
      this.setCapabilityValue('alarm_motor', data === 4).catch(this.error);
    }
    // when
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
    if (data === 0) {
      const { presentValue } = await this.zclNode.endpoints[1].clusters[CLUSTER.ANALOG_OUTPUT.NAME].readAttributes(['presentValue']).catch(this.error);
      this.onCurtainPositionAttrReport(presentValue);
    }
  }

  async onCurtainPositionAttrReport(data) {
    if (this.hasCapability('windowcoverings_set')) {
      this.log('handle report (cluster: AnalogOutput, attribute: presentValue, capability: windowcoverings_set), parsed payload:', data / 100);
      this.setCapabilityValue('windowcoverings_set', (data / 100)).catch(this.error);
    }
  }

}

module.exports = AqaraRollerShadeMotor;
