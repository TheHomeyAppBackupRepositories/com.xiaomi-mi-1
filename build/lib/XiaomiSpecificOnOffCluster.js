'use strict';

const { OnOffCluster, ZCLDataTypes } = require('zigbee-clusters');

class XiaomiSpecificOnOffCluster extends OnOffCluster {

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
      xiaomiOnOffScene: {
        id: 0x8000,
        type: ZCLDataTypes.uint8,
        manufacturerId: 0x115F,
      },
      ...super.ATTRIBUTES,
    };
  }

}

module.exports = XiaomiSpecificOnOffCluster;
