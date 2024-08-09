// SDK3 updated & validated: DONE

'use strict';

const { ZigBeeDevice, Util } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');

const util = require('../../lib/util');
const AqaraManufacturerSpecificCluster = require('../../lib/AqaraManufacturerSpecificCluster');

Cluster.addCluster(AqaraManufacturerSpecificCluster);

class AqaraT1DoorWindowSensor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    // remove alarm_battery capability (on request of Athom)
    if (this.hasCapability('alarm_battery')) await this.removeCapability('alarm_battery').catch(this.error);

    /*
    zclNode.endpoints[1].clusters.iasZone.onZoneEnrollRequest = () => {
      this.log('Received Zone EnrollRequest');
      zclNode.endpoints[1].clusters.iasZone.zoneEnrollResponse({
        enrollResponseCode: 0, // Success
        zoneId: 10, // Choose a zone id
      });
    };
    */

    zclNode.endpoints[1].clusters.iasZone.onZoneStatusChangeNotification = this.onZoneStatusChangeNotification.bind(this);

    zclNode.endpoints[1].clusters[CLUSTER.ON_OFF.NAME]
      .on('attr.onOff', this.onContactReport.bind(this, CLUSTER.ON_OFF.NAME, 'onOff'));

    zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME]
      .on('attr.aqaraLifeline', this.onAqaraLifelineAttributeReport.bind(this));
  }

  /**
   * This attribute is reported when the contact alarm of the door and window sensor changes.
   * @param {boolean} onOff
   */

  onContactReport(reportingClusterName, reportingAttribute, data) {
    const reverseAlarmLogic = this.getSetting('reverse_contact_alarm') || false;
    const parsedData = !reverseAlarmLogic ? data === true : data === false;
    this.log(`handle report (cluster: ${reportingClusterName}, attribute: ${reportingAttribute}, capability: alarm_contact), parsed payload: ${parsedData}`);
    this.setCapabilityValue('alarm_contact', parsedData).catch(this.error);
  }

  onBatteryVoltageAttributeReport(reportingClusterName, reportingAttribute, batteryVoltage) {
    if (typeof batteryVoltage === 'number') {
      const parsedBatPct = util.calculateBatteryPercentage(batteryVoltage * 100, '3V_2850_3000');
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

  async onZoneStatusChangeNotification({
    zoneStatus, extendedStatus, zoneId, delay,
  }) {
    await super.onZoneStatusChangeNotification({
      zoneStatus, extendedStatus, zoneId, delay,
    });

    const capabilitiesArray = ['alarm_contact'];

    Object.keys(capabilitiesArray).forEach(capabilityID => {
      if (this.hasCapability(capabilitiesArray[capabilityID])) {
        this.log(capabilitiesArray[capabilityID], '| IASZoneStatusChangeNotification:', zoneStatus.alarm1);
        this.setCapabilityValue(capabilitiesArray[capabilityID], zoneStatus.alarm1).catch(this.error);
      }
    });
    if (this.hasCapability('alarm_panic')) this.setCapabilityValue('alarm_panic', zoneStatus.alarm2).catch(this.error);
    if (this.hasCapability('alarm_tamper')) this.setCapabilityValue('alarm_tamper', zoneStatus.tamper).catch(this.error);
    if (this.hasCapability('alarm_battery') && this.getClusterEndpoint(CLUSTER.POWER_CONFIGURATION) == null) this.setCapabilityValue('alarm_battery', zoneStatus.battery).catch(this.error);
    if (this.hasCapability('alarm_ac')) this.setCapabilityValue('alarm_ac', zoneStatus.acMains).catch(this.error);
  }

  /**
   * This is Aqara's custom lifeline attribute, it contains a lot of data, af which the most
   * interesting the battery level. The battery level divided by 1000 represents the battery
   * voltage.
   * @param {{batteryLevel: number}} lifeline
   */
  onAqaraLifelineAttributeReport({
    state1, batteryVoltage,
  } = {}) {
    // Illumination
    if (typeof state1 === 'number') {
      if (state1 < 65000) {
        this.log('handle report (cluster: AqaraManufacturerSpecificCluster, attribute: state1, capability: alarm_contact), parsed payload:', state1);
        this.setCapabilityValue('alarm_contact', state1).catch(this.error);
      }
    }
    // Battery
    if (typeof batteryVoltage === 'number') {
      this.onBatteryVoltageAttributeReport('AqaraLifeline', 'batteryVoltage', batteryVoltage / 100);
    }
  }

}

module.exports = AqaraT1DoorWindowSensor;
