'use strict';

let { debug } = require('zigbee-clusters/lib/util');
const { BoundCluster } = require('zigbee-clusters');
const {
  ZCLStandardHeader,
  ZCLMfgSpecificHeader,
  ZCLAttributeDataRecord,
} = require('zigbee-clusters/lib/zclFrames');
const { ZCLStruct, ZCLDataTypes } = require('zigbee-clusters/lib/zclTypes');

debug = debug.extend('ServerCluster');

class ServerCluster extends BoundCluster {

  get cluster() {
    return this._cluster;
  }

  set cluster(value) {
    this._cluster = value;
    if (this._cluster != null) {
      this._addPrototypeMethods();
    }
  }

  constructor({ endpoint }) {
    super();

    this._nextTrxSeqNr = 0;
    this._trxHandlers = {};
    this._endpoint = endpoint;
  }

  async clientReadAttributes(...attributeNames) {
    if (!attributeNames.length) {
      attributeNames = Object.keys(this.cluster.clientAttributes);
    }
    const mismatch = attributeNames.find(n => !this.cluster.clientAttributes[n]);
    if (mismatch) {
      throw new TypeError(`${mismatch} is not a valid attribute of ${this.name}`);
    }

    const idToName = {};
    const attrIds = new Set(attributeNames.map(a => {
      idToName[this.cluster.clientAttributes[a].id] = a;
      return this.cluster.clientAttributes[a].id;
    }));

    const resultObj = {};
    while (attrIds.size) {
      // Check if command should get manufacturerSpecific flag
      const manufacturerId = this._checkForManufacturerSpecificAttributes(Array.from(attrIds));
      debug(this.logId, 'read attributes', [...attrIds], manufacturerId ? `manufacturer specific id ${manufacturerId}` : '');

      const { attributes } = await super.clientReadAttributes({
        attributes: [...attrIds],
        manufacturerId,
      });

      debug(this.logId, 'read attributes result', { attributes });
      const result = this.cluster.clientAttributeArrayStatusDataType.fromBuffer(attributes, 0);
      if (!result.length) break;

      result.forEach(a => {
        attrIds.delete(a.id);
        if (a.status === 'SUCCESS') {
          resultObj[idToName[a.id]] = a.value;
        }
      });
    }

    return resultObj;
  }

  async clientWriteAttributes(attributes = {}) {
    const arr = Object.keys(attributes).map(n => {
      const attr = this.cluster.clientAttributes[n];
      if (!attr) {
        throw new TypeError(`${n} is not a valid attribute of ${this.name}`);
      }
      return {
        id: attr.id,
        value: attributes[n],
      };
    });

    // Check if command should get manufacturerSpecific flag
    const manufacturerId = this._checkForManufacturerSpecificAttributes(
      Object.keys(attributes).map(n => this.cluster.clientAttributes[n].id),
    );

    let data = Buffer.alloc(1024);
    data = data.slice(0, this.cluster.clientAttributeArrayDataType.toBuffer(data, arr, 0));

    debug(this.logId, 'write attributes', attributes, manufacturerId ? `manufacturer specific id ${manufacturerId}` : '');

    return super.clientWriteAttributes({ attributes: data, manufacturerId });
  }

  async sendFrame(data) {
    data = {
      frameControl: ['clusterSpecific', 'directionToClient'],
      data: Buffer.alloc(0),
      ...data,
    };

    if (!data.frameControl.includes('manufacturerSpecific')) {
      data = new ZCLStandardHeader(data);
    } else {
      data = new ZCLMfgSpecificHeader(data);
    }
    debug(this.logId, 'send frame', data);
    return this._endpoint.sendFrame(this.cluster.ID, data.toBuffer());
  }

  async handleFrame(frame, meta, rawFrame) {
    debug('handleFrame', { frame, meta, rawFrame });

    const commands = this.cluster.commandsById[frame.cmdId] || [];

    const command = commands
      .filter(cmd => frame.frameControl.clusterSpecific === !cmd.global
        && (cmd.global || frame.frameControl.manufacturerSpecific === !!cmd.manufacturerId)
        && (cmd.global || !frame.frameControl.manufacturerSpecific
          || frame.manufacturerId === cmd.manufacturerId))
      .sort((a, b) => (a.isResponse ? 0 : 1) - (b.isResponse ? 0 : 1))
      .pop();
    const handler = this._trxHandlers[frame.trxSequenceNumber];

    if (command != null && handler != null) {
      const args = command.args
        ? command.args.fromBuffer(frame.data, 0)
        : undefined;

      const response = await handler.call(this, args, meta, frame, rawFrame);
      if (command.response && command.response.args) {
        // eslint-disable-next-line new-cap
        return [command.response.id, new command.response.args(response)];
      }
      // eslint-disable-next-line consistent-return
      return;
    }

    return super.handleFrame(frame, meta, rawFrame);
  }

  nextSeqNr() {
    this._nextTrxSeqNr = (this._nextTrxSeqNr + 1) % 256;
    return this._nextTrxSeqNr;
  }

  async _awaitPacket(trxSequenceNumber, timeout = 25000) {
    if (this._trxHandlers[trxSequenceNumber]) {
      throw new TypeError(`already waiting for this trx: ${trxSequenceNumber}`);
    }
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        delete this._trxHandlers[trxSequenceNumber];
        reject(new Error('timeout'));
      }, timeout);
      this._trxHandlers[trxSequenceNumber] = async frame => {
        delete this._trxHandlers[trxSequenceNumber];
        resolve(frame);
        clearTimeout(t);
      };
    });
  }

  _checkForManufacturerSpecificAttributes(attributeIds) {
    // Convert to set
    const attrIdsSet = new Set(attributeIds);

    // Filter attributeIds for manufacturer specific attributes
    const manufacturerIds = [];
    for (const attribute of Object.values(this.cluster.clientAttributes)) {
      if (attrIdsSet.has(attribute.id) && typeof attribute.manufacturerId === 'number') {
        manufacturerIds.push(attribute.manufacturerId);
      }
    }

    // Do not allow different manufacturer ids in one command
    if (new Set(manufacturerIds).size > 1) {
      throw new Error('Error: detected multiple manufacturer ids, can only read from one at a time');
    }

    // Show warning if a manufacturer specific attribute was found amongst non-manufacturer
    // specific attributes
    if (manufacturerIds.length > 0 && attrIdsSet.size !== manufacturerIds.length) {
      debug(this.logId, 'WARNING expected only manufacturer specific attributes got:', manufacturerIds);
    }

    // Return the manufacturerId that was found in the attributes
    if (attrIdsSet.size === manufacturerIds.length) return manufacturerIds[0];
    return null;
  }

  _addPrototypeMethods() {
    const firstProto = Object.getPrototypeOf(ServerCluster.prototype);
    const proto = Object.create(firstProto);
    Object.setPrototypeOf(ServerCluster.prototype, proto);
    const { commands } = this.cluster;

    this.cluster.clientAttributes = {
      ...this.cluster.CLIENT_ATTRIBUTES,
    };

    this.cluster.clientAttributesById = Object.entries(this.cluster.clientAttributes).reduce((r, [name, a]) => {
      r[a.id] = { ...a, name };
      return r;
    }, {});
    this.cluster.clientAttributeArrayStatusDataType = ZCLDataTypes.Array0(
      ZCLAttributeDataRecord(true, this.cluster.clientAttributesById),
    );
    this.cluster.clientAttributeArrayDataType = ZCLDataTypes.Array0(
      ZCLAttributeDataRecord(false, this.cluster.clientAttributesById),
    );

    for (const cmdName in commands) {
      const mName = `client${cmdName[0].toUpperCase()}${cmdName.slice(1)}`;
      Object.defineProperty(proto, mName, {
        value: {
          async [mName](args, opts = {}) {
            const cmd = commands[cmdName];
            const payload = {
              cmdId: cmd.id,
              trxSequenceNumber: this.nextSeqNr(),
            };

            if (cmd.global) {
              payload.frameControl = [];

              // Some global commands can also be manufacturerSpecific (e.g. read/write manuf
              // specific attributes), in that case the manuf id needs to be parsed from the
              // args as it is a dynamic property which can not be defined on the command.
              if (args.manufacturerId !== undefined) {
                if (typeof args.manufacturerId === 'number') {
                  payload.frameControl.push('manufacturerSpecific');
                  payload.manufacturerId = args.manufacturerId;
                }
                // Always delete it as it is not part of the command args
                delete args.manufacturerId;
              }
            }

            if (cmd.manufacturerId) {
              payload.frameControl = ['clusterSpecific', 'manufacturerSpecific'];
              payload.manufacturerId = cmd.manufacturerId;
            }

            if (cmd.frameControl) {
              payload.frameControl = cmd.frameControl;
            }

            if (!payload.frameControl.includes('directionToClient')) {
              payload.frameControl.push('directionToClient');
            }

            if (cmd.args) {
              const CommandArgs = ZCLStruct(`${this.cluster.name}.${mName}`, cmd.args);
              payload.data = new CommandArgs(args);
            }

            if (payload.frameControl && payload.frameControl.includes('disableDefaultResponse')) {
              return this.sendFrame(payload);
            }

            if (opts.waitForResponse === false) {
              return this.sendFrame(payload);
            }

            const [response] = await Promise.all([
              this._awaitPacket(payload.trxSequenceNumber),
              this.sendFrame(payload),
            ]);

            if (response instanceof this.cluster.defaultResponseArgsType) {
              if (response.status !== 'SUCCESS') {
                throw new Error(response.status);
              }
              // eslint-disable-next-line consistent-return
              return;
            }

            return response;
          },
        }[mName],
      });
    }
  }

}

module.exports = ServerCluster;
