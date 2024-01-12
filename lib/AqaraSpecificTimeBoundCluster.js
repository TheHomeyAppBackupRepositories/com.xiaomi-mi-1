'use strict';

const { debug } = require('zigbee-clusters/lib/util');
const {
  Cluster, BoundCluster, TimeCluster, ZCLDataTypes, ZCLDataType, zclTypes,
} = require(
  'zigbee-clusters',
);

class AqaraSpecificTimeBoundCluster extends BoundCluster {

  constructor({ readAttributesClient, endpoint }) {
    super({ endpoint });
    this._onReadAttributesClient = readAttributesClient;
  }

  readAttributes() {
    if (typeof this._onReadAttributesClient === 'function') {
      this._onReadAttributesClient();
    }
  }

}

module.exports = AqaraSpecificTimeBoundCluster;
