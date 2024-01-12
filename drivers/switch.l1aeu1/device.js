// TODO add settings + Add genMultistateOutput options (single / double tripple press)
// this.log(`handle report (cluster: ${cluster.NAME}, capability: ${capabilityId}), parsed payload:`, parsedPayload);

'use strict';

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const {
  debug, Cluster, CLUSTER,
} = require('zigbee-clusters');

const AqaraManufacturerSpecificCluster = require('../../lib/AqaraManufacturerSpecificCluster');

Cluster.addCluster(AqaraManufacturerSpecificCluster);

class AqaraH1WallSwitchSingleL extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    const node = await this.homey.zigbee.getNode(this);

    this._nextTrxSeqNr = 0;

    this.initAqaraMode();

    // Register capabilities and reportListeners for Left or Right switch
    if (this.hasCapability('onoff')) {
      this.debug('Register OnOff capability at endpoint 1');

      /* This switch reports as being a battery powered device, so regular registerCapability results in confirmation errors
      Hence Zigbee API is used for sending the command (sendFrame) and attributeReportListener is defined
      */

      this.registerCapabilityListener('onoff', async value => {
        // Send a frame to endpoint 1, cluster 6 ('onOff') which turns the node on
        // this.log('transaction sequence number:', this.nextSeqNr());
        try {
          await node.sendFrame(
            1, // endpoint id
            6, // cluster id
            Buffer.from([
              1, // frame control
              this.nextSeqNr(), // transaction sequence number
              value ? 1 : 0, // command id ('on')
            ]),
          );
        } catch (err) {
          this.error(`failed to write onoff command ${value} to endpoint 1`, err);
        } finally {
          this.log(`set onoff → ${value} (cluster: onOff, endpoint: 1)`);
          // await this.setCapabilityValue('onoff', value).catch(this.error);
        }
      });

      // Register the AttributeReportListener - onoff capability
      zclNode.endpoints[1].clusters[CLUSTER.ON_OFF.NAME]
        .on('attr.onOff', this.onOnOffAttributeReport.bind(this, CLUSTER.ON_OFF.NAME, 'onOff'));
    }

    // Register the AttributeReportListener - Lifeline
    zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
      .on('attr.aqaraLifeline', this.onAqaraLifelineAttributeReport.bind(this));

    zclNode.endpoints[41].clusters[CLUSTER.MULTI_STATE_INPUT.NAME]
      .on('attr.presentValue', this.onPresentValueAttributeReport.bind(this, CLUSTER.MULTI_STATE_INPUT.NAME, 'presentValue'));
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

  onOnOffAttributeReport(reportingClusterName, reportingAttribute, onOff) {
    this.log(`handle report (cluster: ${reportingClusterName}, attribute: ${reportingAttribute}, capability: onoff), parsed payload: ${onOff}`);
    this.setCapabilityValue('onoff', onOff).catch(this.error);
  }

  onPresentValueAttributeReport(reportingClusterName, reportingAttribute, presentValue) {
    this.debug(`handle report (cluster: ${reportingClusterName}, attribute: ${reportingAttribute}, capability: NA), parsed payload: ${presentValue}`);
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
    this.debug('lifeline attribute report', {
      state,
    });

    if (typeof state === 'boolean') {
      this.onOnOffAttributeReport('AqaraLifeline', 'state', state);
    }
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

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    // aqaraPowerOutageMemory attribute
    if (changedKeys.includes('save_state')) {
      const result = await this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
        .writeAttributes({ aqaraPowerOutageMemory: newSettings.save_state });
      this.log('SETTINGS | Write Attribute - Aqara Manufacturer Specific Cluster - aqaraPowerOutageMemory', newSettings.save_state, 'result:', result);
    }
  }

}

module.exports = AqaraH1WallSwitchSingleL;

/*
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

*/
