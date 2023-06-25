'use strict';

const { DoorLockCluster, ZCLDataTypes } = require('zigbee-clusters');

class XiaomiSpecificDoorLockCluster extends DoorLockCluster {

  // Here we override the `COMMANDS` getter from the `ScenesClusters` by
  // extending it with the custom command we'd like to implement `ikeaSceneMove`.
  static get COMMANDS() {
    return {
      ...super.COMMANDS,
    };
  }

  // It is also possible to implement manufacturer specific attributes, but beware, do not mix
  // these with regular attributes in one command (e.g. `Cluster#readAttributes` should be
  // called with only manufacturer specific attributes or only with regular attributes).
  static get ATTRIBUTES() {
    return {
      aqaraVibrationEventType: {
        id: 0x55,
        type: ZCLDataTypes.uint16,
        // manufacturerId: 0x1234,
      },
      aqaraVibrationTiltAngle: {
        id: 0x0503,
        type: ZCLDataTypes.uint16,
        // manufacturerId: 0x1234,
      },
      aqaraVibrationStrength: {
        id: 0x0505,
        type: ZCLDataTypes.uint32,
        // manufacturerId: 0x1234,
      },
      aqaraVibrationOrientation: {
        id: 0x0508,
        type: ZCLDataTypes.buffer,
        // manufacturerId: 0x1234,
      },
    };
  }

}

module.exports = XiaomiSpecificDoorLockCluster;
