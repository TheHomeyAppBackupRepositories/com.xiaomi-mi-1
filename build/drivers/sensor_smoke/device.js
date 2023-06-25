// TODO: add smoke sensor sensitivity & self test (IAS cluster)
// IASZone, 0xFFF1, type 0x23, 'low': 0x04010000, 'medium': 0x04020000, 'high': 0x04030000
// IASZone, 0xFFF1, type 0x23, 'selftest' 0x03010000

'use strict';

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');

const util = require('../../lib/util');
const XiaomiBasicCluster = require('../../lib/XiaomiBasicCluster');
const XiaomiSpecificIASZoneCluster = require('../../lib/XiaomiSpecificIASZoneCluster');

Cluster.addCluster(XiaomiBasicCluster);
Cluster.addCluster(XiaomiSpecificIASZoneCluster);

class AqaraSensorSmoke extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    // add measure_smoke_density capabilities if needed
    if (!this.hasCapability('measure_smoke_density')) {
      this.addCapability('measure_smoke_density').catch(this.error);
    }

    // Capture the zoneStatusChangeNotification
    zclNode.endpoints[1].clusters[XiaomiSpecificIASZoneCluster.NAME]
      .onZoneStatusChangeNotification = payload => {
        this.onIASZoneStatusChangeNoficiation(payload);
      };

    // Register the AttributeReportListener - Lifeline
    zclNode.endpoints[1].clusters[XiaomiSpecificIASZoneCluster.NAME]
      .on('attr.xiaomiSensorDensity', this.onXiaomiSensorDensityAttributeReport.bind(this));

    // Register the AttributeReportListener - Lifeline
    zclNode.endpoints[1].clusters[XiaomiBasicCluster.NAME]
      .on('attr.xiaomiLifeline', this.onXiaomiLifelineAttributeReport.bind(this));
  }

  /**
   * Update alarm capabilities based on the IASZoneStatusChangeNotification.
   */
  onXiaomiSensorDensityAttributeReport({
    sensorDensity,
  }) {
    this.log('IASZoneSensorDensity report received:', sensorDensity);
    this.setCapabilityValue('measure_smoke_density', sensorDensity).catch(this.error);
  }

  /**
   * Update alarm capabilities based on the IASZoneStatusChangeNotification.
   */
  onIASZoneStatusChangeNoficiation({
    zoneStatus, extendedStatus, zoneId, delay,
  }) {
    this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
    this.setCapabilityValue('alarm_smoke', zoneStatus.alarm1).catch(this.error);
    this.setCapabilityValue('alarm_battery', zoneStatus.battery).catch(this.error);
  }

  /**
		 * This is Xiaomi's custom lifeline attribute, it contains a lot of data, af which the most
		 * interesting the battery level. The battery level divided by 1000 represents the battery
		 * voltage. If the battery voltage drops below 2600 (2.6V) we assume it is almost empty, based
		 * on the battery voltage curve of a CR1632.
		 * @param {{batteryLevel: number}} lifeline
		 */
  onXiaomiLifelineAttributeReport({
    batteryVoltage, state,
  } = {}) {
    if (typeof batteryVoltage === 'number') {
      const parsedBatPct = util.calculateBatteryPercentage(batteryVoltage, '3V_2100');
      this.log('lifeline attribute report', batteryVoltage, 'parsedBatteryPct', parsedBatPct);
      this.setCapabilityValue('measure_battery', parsedBatPct).catch(this.error);
      this.setCapabilityValue('alarm_battery', parsedBatPct < 20).catch(this.error);
    }

    if (typeof state === 'number') {
      this.log('lifeline attribute report', state, 'parsedState', state === 1);
      this.setCapabilityValue('measure_smoke_density', state).catch(this.error);
    }
  }

}

module.exports = AqaraSensorSmoke;
