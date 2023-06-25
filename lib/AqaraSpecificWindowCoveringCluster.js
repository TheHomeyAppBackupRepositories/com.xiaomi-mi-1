'use strict';

const { Cluster, WindowCoveringCluster, ZCLDataTypes } = require('zigbee-clusters');

class AqaraSpecificWindowCoveringCluster extends WindowCoveringCluster {

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
      mode: {
        id: 23,
        // type: ZCLDataTypes.map8('LEDDisplayFeedback', 'motorMaintenanceMode', 'motorCalibrationMode', 'motorDirectionReversed'),
        type: ZCLDataTypes.map8('motorDirectionReversed', 'motorCalibrationMode', 'motorMaintenanceMode', 'LEDDisplayFeedback'),
      },
      ...super.ATTRIBUTES,
    };
  }

}

Cluster.addCluster(AqaraSpecificWindowCoveringCluster);

module.exports = AqaraSpecificWindowCoveringCluster;
