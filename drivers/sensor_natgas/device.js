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

class AqaraSensorNatgas extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    // add measure_gas_density capabilities if needed
    if (!this.hasCapability('measure_gas_density')) {
      this.addCapability('measure_gas_density').catch(this.error);
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
    this.setCapabilityValue('measure_gas_density', sensorDensity).catch(this.error);
  }

  /**
   * Update alarm capabilities based on the IASZoneStatusChangeNotification.
   */
  onIASZoneStatusChangeNoficiation({
    zoneStatus, extendedStatus, zoneId, delay,
  }) {
    this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
    this.setCapabilityValue('alarm_gas', zoneStatus.alarm1).catch(this.error);
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
      this.setCapabilityValue('measure_gas_density', state).catch(this.error);
    }
  }

}

module.exports = AqaraSensorNatgas;

/*
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] Node: 2d1e9eac-fdb0-4251-b2b3-07c541beae9d
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] - Battery: false
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] - Endpoints: 0
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] -- Clusters:
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] --- zapp
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] --- genBasic
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] ---- cid : genBasic
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] ---- sid : attrs
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] ---- zclVersion : 0
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] ---- appVersion : 8
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] ---- stackVersion : 2
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] ---- hwVersion : 33
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] ---- manufacturerName : LUMI
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] ---- modelId : lumi.sensor_natgas
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] ---- dateCode : 10-19-2016
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] ---- powerSource : 4
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] ---- locationDesc :
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] --- genPowerCfg
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] ---- cid : genPowerCfg
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] ---- sid : attrs
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] ---- mainsVoltage : 0
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] ---- mainsAlarmMask : 0
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] ---- batteryVoltage : 0
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] --- genDeviceTempCfg
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] ---- cid : genDeviceTempCfg
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] ---- sid : attrs
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] ---- currentTemperature : 40
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] ---- lowTempThres : 55
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] ---- highTempThres : 60
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] --- genIdentify
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] ---- cid : genIdentify
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] ---- sid : attrs
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] ---- identifyTime : 0
2017-10-29 23:57:59 [log] [ManagerDrivers] [sensor_natgas] [0] --- genGroups
2017-10-29 23:58:00 [log] [ManagerDrivers] [sensor_natgas] [0] ---- cid : genGroups
2017-10-29 23:58:00 [log] [ManagerDrivers] [sensor_natgas] [0] ---- sid : attrs
2017-10-29 23:58:00 [log] [ManagerDrivers] [sensor_natgas] [0] --- genTime
2017-10-29 23:58:00 [log] [ManagerDrivers] [sensor_natgas] [0] ---- cid : genTime
2017-10-29 23:58:00 [log] [ManagerDrivers] [sensor_natgas] [0] ---- sid : attrs
2017-10-29 23:58:00 [log] [ManagerDrivers] [sensor_natgas] [0] --- genOta
2017-10-29 23:58:00 [log] [ManagerDrivers] [sensor_natgas] [0] ---- cid : genOta
2017-10-29 23:58:00 [log] [ManagerDrivers] [sensor_natgas] [0] ---- sid : attrs
2017-10-29 23:58:00 [log] [ManagerDrivers] [sensor_natgas] [0] --- ssIasZone
2017-10-29 23:58:00 [log] [ManagerDrivers] [sensor_natgas] [0] ---- cid : ssIasZone
2017-10-29 23:58:00 [log] [ManagerDrivers] [sensor_natgas] [0] ---- sid : attrs
2017-10-29 23:58:00 [log] [ManagerDrivers] [sensor_natgas] [0] ---- zoneState : 0
2017-10-29 23:58:00 [log] [ManagerDrivers] [sensor_natgas] [0] ---- zoneType : 43
2017-10-29 23:58:00 [log] [ManagerDrivers] [sensor_natgas] [0] ---- zoneStatus : 0
2017-10-29 23:58:00 [log] [ManagerDrivers] [sensor_natgas] [0] ---- iasCieAddr : 0x0000000000000000
2017-10-29 23:58:00 [log] [ManagerDrivers] [sensor_natgas] [0] ---- zoneId : 255
2017-10-29 23:58:00 [log] [ManagerDrivers] [sensor_natgas] [0] ------------------------------------------
*/
