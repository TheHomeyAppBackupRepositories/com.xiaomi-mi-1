// TODO add settings + Add genMultistateOutput options (single / double tripple press)

'use strict';

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const {
  debug, Cluster, CLUSTER,
} = require('zigbee-clusters');

const AqaraManufacturerSpecificCluster = require('../../lib/AqaraManufacturerSpecificCluster');

Cluster.addCluster(AqaraManufacturerSpecificCluster);

class AqaraH1WallSwitchDoubleL extends ZigBeeDevice {

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

    const node = await this.homey.zigbee.getNode(this);

    this._nextTrxSeqNr = 0;

    const subDeviceId = this.isSubDevice() ? this.getData().subDeviceId : 'leftSwitch';
    this.log('Initializing', subDeviceId, 'at endpoint', this.endpointIds[subDeviceId]);

    if (this.isFirstInit()) {
      try {
        await zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME].writeAttributes({ mode: 1 }); // , aqaraRemoteMode: 2
      } catch (err) {
        this.error('failed to write mode attributes', err);
      }
    }

    /*
    if (!subDeviceId && this.isFirstInit()) {
      try {
        await zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME].writeAttributes({ aqaraSwitchOperationMode: 1 }); // , aqaraRemoteMode: 2
      } catch (err) {
        this.error('failed to write aqaraSwitchOperationMode attribute', err);
      }
      try {
        await zclNode.endpoints[2].clusters[AqaraManufacturerSpecificCluster.NAME].writeAttributes({ aqaraSwitchOperationMode: 1 }); // , aqaraRemoteMode: 2
      } catch (err) {
        this.error('failed to write aqaraSwitchOperationMode attribute', err);
      }
    }
    */

    // Register capabilities and reportListeners for Left or Right switch
    if (this.hasCapability('onoff')) {
      this.debug('Register OnOff capabilityListener for', subDeviceId, 'at endpoint', this.endpointIds[subDeviceId]);
      // this.registerCapability('onoff', CLUSTER.ON_OFF, {
      //  endpoint: this.endpointIds[subDeviceId],
      // });

      this.registerCapabilityListener('onoff', async value => {
        // this.log('OnOff capability', value);
        // Send a frame to endpoint 1, cluster 6 ('onOff') which turns the node on
        try {
          await node.sendFrame(
            this.endpointIds[subDeviceId], // endpoint id
            6, // cluster id
            Buffer.from([
              1, // frame control
              this.nextSeqNr(), // transaction sequence number
              value ? 1 : 0, // command id ('on')
            ]),
          );
        } catch (err) {
          this.error(`failed to write onoff command ${value} to endpoint ${this.endpointIds[subDeviceId]}`, err);
        } finally {
          this.log(`set onoff → ${value} (cluster: onOff, endpoint: ${this.endpointIds[subDeviceId]})`);
          // await this.setCapabilityValue('onoff', value).catch(this.error);
        }
      });

      // Register the AttributeReportListener - onoff capability
      zclNode.endpoints[this.endpointIds[subDeviceId]].clusters[CLUSTER.ON_OFF.NAME]
        .on('attr.onOff', this.onOnOffAttributeReport.bind(this, CLUSTER.ON_OFF.NAME, 'onOff'));
    }

    // Register measure_power and meter_power capabilities and reportListeners only for main device
    if (!this.isSubDevice()) {
      // Register the AttributeReportListener - Lifeline
      zclNode.endpoints[41].clusters[CLUSTER.MULTI_STATE_INPUT.NAME]
        .on('attr.presentValue', this.onPresentValueAttributeReport.bind(this, CLUSTER.MULTI_STATE_INPUT.NAME, 'presentValue', 'left'));
      zclNode.endpoints[42].clusters[CLUSTER.MULTI_STATE_INPUT.NAME]
        .on('attr.presentValue', this.onPresentValueAttributeReport.bind(this, CLUSTER.MULTI_STATE_INPUT.NAME, 'presentValue', 'right'));
      zclNode.endpoints[51].clusters[CLUSTER.MULTI_STATE_INPUT.NAME]
        .on('attr.presentValue', this.onPresentValueAttributeReport.bind(this, CLUSTER.MULTI_STATE_INPUT.NAME, 'presentValue', 'both'));
    }

    // Register the AttributeReportListener - Lifeline
    zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
      .on('attr.aqaraLifeline', this.onAqaraLifelineAttributeReport.bind(this));
  }

  onPresentValueAttributeReport(reportingClusterName, reportingAttribute, button, presentValue) {
    this.debug(`handle report (cluster: ${reportingClusterName}, attribute: ${reportingAttribute}, capability: NA), parsed payload: `, { presentValue, button });
  }

  onOnOffAttributeReport(reportingClusterName, reportingAttribute, onOff) {
    this.log(`handle report (cluster: ${reportingClusterName}, attribute: ${reportingAttribute}, capability: onoff), parsed payload: ${onOff}`);
    this.setCapabilityValue('onoff', onOff).catch(this.error);
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
    this.debug('handle lifeline attribute report', {
      state, state1,
    });

    const subDeviceId = this.isSubDevice() ? this.getData().subDeviceId : 'leftSwitch';
    if (subDeviceId === 'leftSwitch') {
      if (typeof state === 'boolean') {
        this.onOnOffAttributeReport('AqaraLifeline', 'state', state === 1);
        // this.log('handle report (cluster: aqaraLifeline, capability: onoff), parsed payload:', state === 1);
        // this.setCapabilityValue('onoff', state === 1).catch(this.error);
      }
    }
    if (subDeviceId === 'rightSwitch') {
      if (this.hasCapability('onoff') && typeof state1 === 'boolean') {
        this.onOnOffAttributeReport('AqaraLifeline', 'state', state1 === 1);
        // this.log('handle report (cluster: aqaraLifeline, capability: onoff), parsed payload:', state1 === 1);
        // this.setCapabilityValue('onoff', state1 === 1).catch(this.error);
      }
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

}

module.exports = AqaraH1WallSwitchDoubleL;

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
