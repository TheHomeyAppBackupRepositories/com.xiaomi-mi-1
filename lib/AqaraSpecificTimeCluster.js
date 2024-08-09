'use strict';

const {
  Cluster, TimeCluster, ZCLDataTypes, ZCLDataType, zclTypes,
} = require(
  'zigbee-clusters',
);

function intToBuf(buf, v, i) {
  return buf.writeIntLE(v, i, this.length) - i;
}

function intFromBuf(buf, i) {
  if (buf.length - i < this.length) return 0;
  return buf.readIntLE(i, this.length);
}

const utcDataType = new ZCLDataType(226, 'UTC', 4, intToBuf, intFromBuf);

class AqaraSpecificTimeCluster extends TimeCluster {

  static get ATTRIBUTES() {
    return {
      ...super.ATTRIBUTES,
      time: {
        id: 0x0000,
        type: utcDataType,
      },
      timeStatus: {
        id: 0x0001,
        type: ZCLDataTypes.map8('master', 'synchronized', 'masterZoneDst',
          'superseding'),
      },
      timeZone: {
        id: 0x0002,
        type: ZCLDataTypes.int32,
      },
      localTime: { id: 0x0007, type: ZCLDataTypes.uint32 },
      lastSetTime: { id: 0x0008, type: ZCLDataTypes.uint32 },
      privateTime: { id: 0x1000, type: ZCLDataTypes.uint32 },
    };
  }

  static get CLIENT_ATTRIBUTES() {
    return {
      time: { id: 0x0000, type: utcDataType },
      timezone: { id: 0x0002, type: ZCLDataTypes.int32 },
    };
  }

  static get COMMANDS() {
    return {
      ...super.COMMANDS,
      /*
      readAttributes: {
        id: 0x00,
        direction: Cluster.DIRECTION_SERVER_TO_CLIENT,
        args: {
          attributes: ZCLDataTypes.Array0(ZCLDataTypes.uint16),
        },
        response: {
          id: 0x01,
          args: {
            attributes: ZCLDataTypes.buffer,
          },
        },
      },
      readAttributesClient: {
        id: 0x00,
        // Add direction property as "zoneEnrollResponse" has same command id.
        direction: Cluster.DIRECTION_CLIENT_TO_SERVER,
        args: {
          attributes: ZCLDataTypes.Array0(ZCLDataTypes.uint16),
        },
        response: {
          id: 0x01,
          args: {
            attributes: ZCLDataTypes.buffer,
          },
        },
      }, */
    };
  }

}

module.exports = AqaraSpecificTimeCluster;
