'use strict';

const { BasicCluster, ZCLDataTypes, ZCLDataType } = require('zigbee-clusters');

const XIAOMI_ATTRIBUTES = {
  1: { name: 'batteryVoltage' }, // type: ZCLDataTypes.uint16
  3: { name: 'cpuTemperature' }, // type: ZCLDataTypes.int8
  // 4: { name: 'unknown_4' }, // type: ZCLDataTypes.uint16
  5: { name: 'rssi' }, // type: ZCLDataTypes.uint16
  6: { name: 'txCount' }, // type: ZCLDataTypes.uint40
  // 8: { name: 'unknown_8' }, // type: ZCLDataTypes.uint16
  // 10: { name: 'unknown_10' }, // type: ZCLDataTypes.uint16
  11: { name: 'humidity' }, // type: ZCLDataTypes.uint16 // >> luminance
  100: { name: 'state' }, // type: ZCLDataTypes.uint32, this can be on/off, temperature, etc.
  101: { name: 'state1' }, // ZCLDataTypes.uint16
  102: { name: 'state2' }, // type: ZCLDataTypes.uint16

  // TODO: these are currently unknown or not used
  149: { name: 'consumption' },
  150: { name: 'voltage' },
  151: { name: 'current' },
  152: { name: 'power' },
  // 153: { name: 'unknown_153' },
  // 154: { name: 'unknown_154' },
};

/**
 * This is a custom data type used by Xiaomi to report various "attributes" in a single attribute
 * value. All possible "attributes" are listed in {@link XIAOMI_ATTRIBUTES}. The buffer is
 * parsed by looking for the "attribute" ids (first byte), data type of the "attribute" (second
 * byte), and the value (which is parsed based on the data type).
 */
const XiaomiLifelineDataRecord = new ZCLDataType(
  NaN,
  'XiaomiLifelineDataRecord',
  -3,
  () => { // to buffer
    throw new Error('Not implemented');
  },
  ((buf, i, returnLength) => { // from buffer
    i = i || 0;
    const startByte = i;
    const result = {};

    // Read the attribute id of this custom attribute-in-an-attribute (first byte)
    result.id = ZCLDataTypes.uint8.fromBuffer(buf, i);
    i += ZCLDataTypes.uint8.length;

    // Read the ZCL data type of this custom attribute-in-an-attribute (second byte)
    const dataTypeId = ZCLDataTypes.uint8.fromBuffer(buf, i);
    i += ZCLDataTypes.uint8.length;

    // Try to find an existing DataType based on the `dataTypeId`, first check the
    // `XIAOMI_ATTRIBUTES` if a type is specified, second, search the `ZCLDataTypes` for a
    // DataType with id = `dataTypeId`.
    const DataType = (XIAOMI_ATTRIBUTES[result.id] && XIAOMI_ATTRIBUTES[result.id].type) || Object.values(ZCLDataTypes).find(type => type && type.id === dataTypeId);

    // Abort if no valid data type was found
    if (!DataType) throw new TypeError(`Invalid type for attribute: ${result.id}`);

    // eslint-disable-next-line no-mixed-operators
    result.name = (XIAOMI_ATTRIBUTES[result.id] && XIAOMI_ATTRIBUTES[result.id].name) || `unknown_attr_${result.id}`;

    // Parse the value from the buffer using the DataType
    const entry = DataType.fromBuffer(buf, i, true);
    if (DataType.length > 0) {
      i += DataType.length;
      result.value = entry;
    } else {
      result.value = entry.result;
      i += entry.length;
    }
    if (returnLength) {
      return { result, length: i - startByte };
    }
    return result;
  }),
);

/**
 * This data type represents an array of {@link XiaomiLifelineDataRecord} structs.
 */
const XiaomiLifelineDataRecordArray = new ZCLDataType(
  NaN,
  'XiaomiLifelineDataRecordArray',
  -1,
  () => { // to buffer
    throw new Error('Not implemented');
  },
  ((buf, i, returnLength) => { // from buffer
    // eslint-disable-next-line prefer-const
    let { result, length } = ZCLDataTypes.buffer8.fromBuffer(buf, i, true);

    // Parse the buffer for multiple `XiaomiLifelineDataRecord`
    result = ZCLDataTypes.Array0(XiaomiLifelineDataRecord).fromBuffer(result, 0);
    result = result.reduce((r, { name, value }) => Object.assign(r, { [name]: value }), {});
    if (returnLength) {
      return { result, length };
    }
    return result;
  }),
);

/**
 * Extends {@link BasicCluster} with the Xiaomi custom, manufacturer specific, `xiaomiLifeline`
 * attribute.
 */
class XiaomiBasicCluster extends BasicCluster {

  static get ATTRIBUTES() {
    return {
      ...super.ATTRIBUTES,
      xiaomiCurtain: {
        id: 1025,
        type: ZCLDataTypes.string,
        manufacturerId: 0x115F,
      },
      xiaomiLifeline: {
        id: 65281,
        type: XiaomiLifelineDataRecordArray,
        manufacturerId: 0x115F,
      },
      xiaomiLifeline2: {
        id: 65282,
        type: ZCLDataTypes.buffer,
        manufacturerId: 0x115F,
      },
      xiaomiSensitivity: {
        id: 65293, // 0xFF0D
        type: ZCLDataTypes.unit8,
        manufacturerId: 0x115F,
      },
      xiaomiDisconnect1: {
        id: 65314, // 0xFF22
        type: ZCLDataTypes.unit8,
        manufacturerId: 0x115F,
      },
      xiaomiDisconnect2: {
        id: 65315, // 0xFF23
        type: ZCLDataTypes.unit8,
        manufacturerId: 0x115F,
      },

      xiaomiCurtainClearPosition: {
        id: 65319, // 0xFF27
        type: ZCLDataTypes.bool,
        manufacturerId: 0x115F,
      },
      xiaomiCurtainReverse: {
        id: 65320, // 0xFF28
        type: ZCLDataTypes.bool,
        manufacturerId: 0x115F,
      },
      xiaomiCurtainOpenCloseManual: {
        id: 65321, // 0xFF29
        type: ZCLDataTypes.bool,
        manufacturerId: 0x115F,
      },
      xiaomiSwitchOptions: { // 'ZNCZ02LM', 'QBCZ11LM'
        id: 65520, // 0xFFF0
        type: ZCLDataTypes.uint64,
        manufacturerId: 0x115F,
      },
    };
  }

}

module.exports = XiaomiBasicCluster;
