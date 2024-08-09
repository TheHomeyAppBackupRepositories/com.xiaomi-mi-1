'use strict';

let { debug } = require('zigbee-clusters/lib/util');
const {
  Cluster, TimeCluster, ZCLDataTypes, ZCLDataType, zclTypes,
} = require(
  'zigbee-clusters',
);
const ServerCluster = require('./ServerCluster');

const utcDataType = new ZCLDataType(226, 'UTC', 4, intToBuf, intFromBuf);

function intToBuf(buf, v, i) {
  return buf.writeIntLE(v, i, this.length) - i;
}

function intFromBuf(buf, i) {
  if (buf.length - i < this.length) return 0;
  return buf.readIntLE(i, this.length);
}

debug = debug.extend('AqaraSpecificTimeBoundCluster');

class AqaraSpecificTimeBoundCluster extends ServerCluster {

  constructor({ readAttributes, endpoint }) {
    super({ endpoint });
    this._onReadAttributes = readAttributes;
  }

  readAttributes() {
    if (typeof this._onReadAttributes === 'function') {
      this._onReadAttributes();
    }
  }

}

module.exports = AqaraSpecificTimeBoundCluster;
