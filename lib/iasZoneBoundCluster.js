'use strict';

const {
  Cluster, BoundCluster, IASZoneCluster, ZCLDataTypes,
} = require('zigbee-clusters');

const ZONE_STATUS_DATA_TYPE = ZCLDataTypes.map16('alarm1', 'alarm2', 'tamper', 'battery', 'supervisionReports', 'restoreReports', 'trouble', 'acMains', 'test', 'batteryDefect');
const ZONE_TYPE = ZCLDataTypes.enum16({
  standardCIE: 0,
  motionSensor: 13,
  contactSwitch: 21,
  fireSensor: 40,
  waterSensor: 42,
  cabonMonoxideSensor: 43,
  personalEmergencyDevice: 44,
  vibrationMovementSensor: 45,
  remoteControl: 271,
  keyfob: 277,
  keypad: 541,
  standardWarningDevice: 549,
  glassBreakSensor: 550,
  securityRepeater: 553,
  invalidZoneType: 65535,
});

const COMMANDS = {
  zoneStatusChangeNotification: {
    id: 0,
    args: {
      zoneStatus: ZONE_STATUS_DATA_TYPE,
      extendedStatus: ZCLDataTypes.uint8,
      zoneId: ZCLDataTypes.uint8,
      delay: ZCLDataTypes.uint16,
    },
  },
  zoneEnrollRequest: {
    id: 1,
    args: {
      zoneType: ZONE_TYPE,
      manufacturerCode: ZCLDataTypes.uint16,
    },
  },
};

class IASZoneBoundCluster extends BoundCluster {

  static get COMMANDS() {
    // return only bound cluster (received) commands
    return COMMANDS;
    // return IASZoneCluster.COMMANDS_BOUND;
  }

  constructor({
    onZoneStatusChangeNotification,
    onZoneEnrollRequest,
  }) {
    super();
    this._onZoneStatusChangeNotification = onZoneStatusChangeNotification;
    this._onZoneEnrollRequest = onZoneEnrollRequest;
  }

  zoneStatusChangeNotification(payload) {
    if (typeof this._onZoneStatusChangeNotification === 'function') {
      this._onZoneStatusChangeNotification(payload);
    }
  }

  zoneEnrollRequest(payload) {
    if (typeof this._onZoneEnrollRequest === 'function') {
      this._onZoneEnrollRequest(payload);
    }
  }

}

// Cluster.addCluster(IASZoneBoundCluster);

module.exports = IASZoneBoundCluster;
