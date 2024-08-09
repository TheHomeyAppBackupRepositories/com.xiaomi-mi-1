'use strict';

const { ZigBeeDevice, Util } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');
const moment = require('moment-timezone');

const aqaraTRVPresets = {
  manual: 0,
  auto: 1,
  away: 2,
};

const AqaraManufacturerSpecificCluster = require('../../lib/AqaraManufacturerSpecificCluster');
const AqaraSpecificTimeCluster = require('../../lib/AqaraSpecificTimeCluster');

Cluster.addCluster(AqaraManufacturerSpecificCluster);
Cluster.addCluster(AqaraSpecificTimeCluster);

class AqaraE1TSmartRadiatorThermostat extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    const node = await this.homey.zigbee.getNode(this);
    node.handleFrame = (endpointId, clusterId, frame, meta) => {
      if (endpointId === 1 && clusterId === 10) {
        // The node sent a frame to Homey from endpoint 1 and cluster 'time'
        this.debug('TIME', frame, meta, frame[1], frame.readUIntLE(3, 2), frame.readUIntLE(5, 2));

        // When readAttribeRequest received with one or more attributes
        if (frame[2] === 0 && frame.length > 5) {
          const seqNrBuf = Buffer.alloc(1);
          seqNrBuf.writeUIntLE(frame[1], 0, 1);

          let readAttributeResponseStr = `18${seqNrBuf.toString('hex')}01`;
          let readAttributeResponseDebugStr = 'Cl (TIME), Received readAttributeRequest for: ';

          // Check which attributes are requested
          for (let i = 0; i < (frame.length - 3) / 2; i++) {
            const requestedAttributeNo = frame.readUIntLE(3 + 2 * i, 2);
            this.debug('TIME received attributeReadRequest for', requestedAttributeNo);

            const { localTimeUTC, localTimeZoneUTC } = this._localTimeToUTC();

            // UTC time attribute
            if (requestedAttributeNo === 0) {
              readAttributeResponseDebugStr += ' Time (0x0000)';
              const timeUTCBuf = Buffer.alloc(4);

              timeUTCBuf.writeUIntLE(localTimeUTC, 0, 4);
              readAttributeResponseStr += `000000e2${timeUTCBuf.toString('hex')}`;
            }

            // Time Zone attribute
            if (requestedAttributeNo === 2) {
              readAttributeResponseDebugStr += ' Time Zone (0x0002)';
              const timeZoneBuf = Buffer.alloc(4);
              timeZoneBuf.writeUIntLE(localTimeZoneUTC, 0, 4); // check time zone definition
              readAttributeResponseStr += `0200002b${timeZoneBuf.toString('hex')}`;
            }
          }

          const readAttributeResponse = Buffer.from(readAttributeResponseStr, 'hex');
          node.sendFrame(
            1, // endpoint id
            10, // cluster id
            readAttributeResponse,
          ).catch(this.error);
          this.debug(readAttributeResponseDebugStr, readAttributeResponse);
        }

        this.log('TIME read attribute', frame.readUIntLE(3, 4), frame.length);
      } else {
        return zclNode.handleFrame(endpointId, clusterId, frame, meta);
      }
    };

    this._thermostatCluster = this.zclNode.endpoints[1].clusters[CLUSTER.THERMOSTAT.NAME];
    this._timeCluster = this.zclNode.endpoints[1].clusters[AqaraSpecificTimeCluster.NAME];
    this._aqaraManufacturerSpecificCluster = this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME];

    if (this.hasCapability('measure_temperature')) {
      this._thermostatCluster.on('attr.localTemperature', this.onTemperatureMeasuredAttributeReport.bind(this, 'thermostatCluster', 'localTemperature'));
    }

    if (this.hasCapability('thermostat_mode_AqaraTRV')) {
      this.registerCapabilityListener('thermostat_mode_AqaraTRV', async thermostatMode => {
        await this.onSetPreset(thermostatMode);
      });
    }

    if (this.hasCapability('target_temperature')) {
      this._thermostatCluster.on('attr.occupiedHeatingSetpoint', this.onTargetTemperatureAttributeReport.bind(this, 'thermostatCluster', 'occupiedHeatingSetpoint'));

      this.registerCapabilityListener('target_temperature',
        async (value, opts) => {
          const thermostatMode = this.getCapabilityValue('thermostat_mode_AqaraTRV');
          if (thermostatMode === 'off' || thermostatMode === 'away') {
            throw new Error(`Target temperature can't be adjusted when the thermostat is in ${thermostatMode} mode`);
          } else {
            // const { occupancy } = await this._thermostatCluster.readAttributes(['occupancy']).catch(this.error);
            const payload = { occupiedHeatingSetpoint: value * 100 };
            this.log('Setting target temperature', value, payload);
            await Util.wrapAsyncWithRetry(() => this._thermostatCluster.writeAttributes(payload), 3).catch(this.error);
          }
        });
    }

    if (this.hasCapability('child_lock')) {
      this.registerCapabilityListener('child_lock',
        async (value, opts) => {
          this.log('Setting child_lock status to', value);
          await Util.wrapAsyncWithRetry(() => zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME].writeAttributes({ aqaraTRVChildLock: value }), 3).catch(this.error);
        });
    }

    if (this.hasCapability('button.auto_calibration')) {
      this.registerCapabilityListener('button.auto_calibration', async () => {
        await this.maintenanceCalibrationStart();
      });
    }

    // zclNode.endpoints[1].clusters[CLUSTER.BASIC.NAME]
    zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME]
      .on('attr.aqaraLifeline', this.onAqaraLifelineAttributeReport.bind(this))
      .on('attr.aqaraTRVSystemMode', this.onAqaraAttributeReportLogger.bind(this, 'aqaraTRVSystemMode'))
      .on('attr.aqaraTRVPreset', this.onAqaraAttributeReportLogger.bind(this, 'aqaraTRVPreset'))
      .on('attr.aqaraTRVWindowOpenDetection', this.onAqaraAttributeReportLogger.bind(this, 'aqaraTRVWindowOpenDetection'))
      .on('attr.aqaraTRVValveDetection', this.onAqaraAttributeReportLogger.bind(this, 'aqaraTRVValueDetection'))
      .on('attr.aqaraTRVValveAlarm', this.onAqaraAttributeReportLogger.bind(this, 'aqaraTRVValveAlarm'))
      .on('attr.aqaraTRVChildLock', this.onAqaraAttributeReportLogger.bind(this, 'aqaraTRVChildLock'))
      .on('attr.aqaraTRVWindowOpen', this.onAqaraAttributeReportLogger.bind(this, 'aqaraTRVWindowOpen'))
      .on('attr.aqaraTRVAwayPresetTemperature', this.onAqaraAttributeReportLogger.bind(this, 'aqaraTRVAwayPresetTemperature'))
      .on('attr.aqaraTRVCalibrated', this.onAqaraAttributeReportLogger.bind(this, 'aqaraTRVCalibrated'))
      .on('attr.aqaraTRVSensorType', this.onAqaraAttributeReportLogger.bind(this, 'aqaraTRVSensorType'))
      .on('attr.aqaraTRVSchedule', this.onAqaraAttributeReportLogger.bind(this, 'aqaraTRVSchedule'))
      .on('attr.aqaraTRVScheduleSettings', this.onAqaraAttributeReportLogger.bind(this, 'aqaraTRVScheduleSettings'))
      .on('attr.aqaraBatteryStatus', this.onAqaraAttributeReportLogger.bind(this, 'aqaraBatteryStatus'));

    zclNode.endpoints[1].clusters[CLUSTER.TEMPERATURE_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onTemperatureMeasuredAttributeReport.bind(this));

    if (this.isFirstInit()) {
      this.initThermostatCapabilities();
      this.initAqaraCapabilities();
    }
  }

  async initAqaraCapabilities() {
    try {
      const {
        aqaraTRVPreset, aqaraTRVCalibrated, aqaraTRVChildLock, aqaraTRVValveAlarm, aqaraTRVWindowOpen, aqaraBatteryStatus,
      } = await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME].readAttributes(['aqaraTRVPreset', 'aqaraTRVCalibrated', 'aqaraTRVChildLock', 'aqaraTRVValveAlarm', 'aqaraTRVWindowOpen', 'aqaraBatteryStatus']), 3).catch(this.error);
      this.debug('initCapabilities Aqara manufacturerespecific', aqaraTRVPreset, aqaraTRVCalibrated, aqaraTRVChildLock, aqaraTRVValveAlarm, aqaraTRVWindowOpen, aqaraBatteryStatus);
      this.onAqaraAttributeReportLogger('aqaraTRVPreset', aqaraTRVPreset);
      this.onAqaraAttributeReportLogger('aqaraTRVCalibrated', aqaraTRVCalibrated);
      this.onAqaraAttributeReportLogger('aqaraTRVChildLock', aqaraTRVChildLock);
      this.onAqaraAttributeReportLogger('aqaraTRVValveAlarm', aqaraTRVValveAlarm);
      this.onAqaraAttributeReportLogger('aqaraTRVWindowOpen', aqaraTRVWindowOpen);
      this.onAqaraAttributeReportLogger('aqaraBatteryStatus', aqaraBatteryStatus);
    } catch (err) {
      this.log(`failed to initializing capabilities settings for the Aqara manufacturerespecific cluster. Message:${err}`);
    }
  }

  async initThermostatCapabilities() {
    setTimeout(async () => {
      try {
        const { occupiedHeatingSetpoint, localTemperature } = await Util.wrapAsyncWithRetry(() => this._thermostatCluster.readAttributes(['occupiedHeatingSetpoint', 'localTemperature']), 3).catch(this.error);
        this.debug('initCapabilities Thermostat Cluster', localTemperature, occupiedHeatingSetpoint);
        this.onTemperatureMeasuredAttributeReport('thermostatCluster', 'localTemperature', localTemperature);
        this.onTargetTemperatureAttributeReport('thermostatCluster', 'occupiedHeatingSetpoint', occupiedHeatingSetpoint);
      } catch (err) {
        this.log(`failed to initializing capabilities settings for Thermostat Cluster. Message:${err}`);
      }
    }, 5000);
  }

  async onTargetTemperatureAttributeReport(reportingClusterName, reportingAttribute, value) {
    // this.log(`attr.${reportingAttribute} ${value}`);
    const parsedValue = Math.round((value / 100) * 10) / 10;
    // this.log(`attr.${reportingAttribute} ${value} parsed to ${parsedValue}`);
    this.log(`handle report (cluster: ${reportingClusterName}, attribute: ${reportingAttribute}, capability: target_temperature), payload: ${value}, parsed payload:`, parsedValue);
    await this.setCapabilityValue('target_temperature',
      parsedValue).catch(this.error);
  }

  onAqaraAttributeReportLogger(attribute, value) {
    this.debug(`attr.${attribute} ${value}`);

    switch (attribute) {
      case 'aqaraTRVPreset':
        this.onPresetAttributeReport('AqaraManufacturerSpecificCluster', 'aqaraTRVPreset', value);
        break;
      case 'aqaraTRVSystemMode': {
        const systemMode = value === 1 ? 'heating' : 'off';
        this.debug('aqaraTRVSystemMode', value, systemMode);
        break;
      }
      case 'aqaraTRVCalibrated':
        this.log('handle report (cluster: AqaraManufacturerSpecificCluster, attribute: aqaraTRVCalibrated, capability: calibration_state), parsed payload:', value === 1);
        if (this.hasCapability('calibration_state')) this.setCapabilityValue('calibration_state', value === 1).catch(this.error);
        break;
      case 'aqaraTRVChildLock':
        this.log('handle report (cluster: AqaraManufacturerSpecificCluster, attribute: aqaraTRVChildLock, capability: child_lock), parsed payload:', value === 1);
        if (this.hasCapability('child_lock')) this.setCapabilityValue('child_lock', value === 1).catch(this.error);
        break;
      case 'aqaraTRVValveAlarm':
        this.log('handle report (cluster: AqaraManufacturerSpecificCluster, attribute: aqaraTRVValveAlarm, capability: alarm_thermostat), parsed payload:', value === 1);
        if (this.hasCapability('alarm_thermostat')) this.setCapabilityValue('alarm_thermostat', value === 1).catch(this.error);
        break;
      case 'aqaraTRVWindowOpen':
        this.log('handle report (cluster: AqaraManufacturerSpecificCluster, attribute: aqaraTRVWindowOpen, capability: alarm_window), parsed payload:', value === 1);
        if (this.hasCapability('alarm_window')) this.setCapabilityValue('alarm_window', value === 1).catch(this.error);
        break;
        /* case 'aqaraTRVValveDetection':
        this.log('aqaraTRVValveDetection', value === 1);
        if (this.hasCapability('valve_state')) this.setCapabilityValue('valve_state', value === 1).catch(this.error);
        break;
      */
        /*
      case 'aqaraTRVSchedule':
        this.log('aqaraTRVSchedule', value === 1);
        // if (this.hasCapability('valve_state')) this.setCapabilityValue('valve_state', value === 1).catch(this.error);
        break;

      case 'aqaraTRVScheduleSettings': {
        const parsedSchedule = decodeSchedule(value);
        const scheduleSettings = stringifySchedule(parsedSchedule);
        this.log('aqaraTRVScheduleSettings', value, parsedSchedule, scheduleSettings);
        this.setSettings({ thermostat_auto_schedule: scheduleSettings });
        break;
      }
      */

      case 'aqaraBatteryStatus':
        this.onBatteryPercentageAttributeReport('AqaraManufacturerSpecificCluster', 'aqaraBatteryStatus', value);
        break;
      default:
        break;
    }
  }

  onPresetAttributeReport(reportingClusterName, reportingAttribute, value) {
    const preset = {
      3: 'setup', 2: 'away', 1: 'auto', 0: 'manual',
    }[value];
    this.log(`handle report (cluster: ${reportingClusterName}, attribute: ${reportingAttribute}, capability: thermostat_mode_AqaraTRV), parsed payload:`, preset);
    if (preset !== 'setup' && preset !== 'auto') {
      if (this.hasCapability('thermostat_mode_AqaraTRV')) this.setCapabilityValue('thermostat_mode_AqaraTRV', preset).catch(this.error);

      this.driver.triggerThermostatModeChangedTo.trigger(this, null, { mode: preset });
    } else {
      this.log('aqaraTRVPreset: device in setup or auto mode');
    }
  }

  async onSetPreset(thermostatMode) {
    const currentThermostatMode = await this.getCapabilityValue('thermostat_mode_AqaraTRV');
    if (thermostatMode !== currentThermostatMode) {
      this.log('Set Thermostat mode from ', currentThermostatMode, 'to:', thermostatMode);

      // When the current thermostat state changes: thermostatMode === 'off' || currentThemostatMode === 'off'
      if ((thermostatMode === 'off') || (thermostatMode !== 'off' && currentThermostatMode === 'off')) {
        await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
          .writeAttributes({ aqaraTRVSystemMode: thermostatMode !== 'off' }), 3)
          .then(async () => {
            if (thermostatMode !== 'off') {
              await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
                .writeAttributes({ aqaraTRVPreset: aqaraTRVPresets[thermostatMode] }), 3);
            }
            if (thermostatMode === 'off') this.setCapabilityValue('target_temperature', null);
            await this.driver.triggerThermostatModeChangedTo.trigger(this, null, { mode: thermostatMode });
          });
      }

      if ((thermostatMode !== 'off' && currentThermostatMode !== 'off')) {
        await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
          .writeAttributes({ aqaraTRVPreset: aqaraTRVPresets[thermostatMode] }), 3)
          .then(async () => {
            await this.driver.triggerThermostatModeChangedTo.trigger(this, null, { mode: thermostatMode });
          });
      }
    }
  }

  /**
   * Set `measure_temperature` when a `measureValue` attribute report is received on the
   * temperature measurement cluster.
   * @param {number} measuredValue
   */
  onTemperatureMeasuredAttributeReport(reportingClusterName, reportingAttribute, measuredValue) {
    // if (measuredValue !== -100) {
    const temperatureOffset = this.getSetting('temperature_offset') || 0;
    const parsedValue = this.getSetting('temperature_decimals') === '2' ? Math.round((measuredValue / 100) * 100) / 100 : Math.round((measuredValue / 100) * 10) / 10;
    if (parsedValue >= -65 && parsedValue <= 65) {
      this.log(`handle report (cluster: ${reportingClusterName}, attribute: ${reportingAttribute}, capability: measure_temperature), parsed payload:`, parsedValue, '+ temperature offset', temperatureOffset);
      this.setCapabilityValue('measure_temperature', parsedValue + temperatureOffset).catch(this.error);
    }
  }

  onBatteryPercentageAttributeReport(reportingClusterName, reportingAttribute, batteryPercentage) {
    if (typeof batteryPercentage === 'number') {
      const parsedBatPct = batteryPercentage;//  / 100;
      if (this.hasCapability('measure_battery')) {
        this.log(`handle report (cluster: ${reportingClusterName}, attribute: ${reportingAttribute}, capability: measure_battery), parsed payload:`, parsedBatPct);
        this.setCapabilityValue('measure_battery', parsedBatPct).catch(this.error);
      }
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    const attributes = {};

    // thermostat_setpoint_away attribute
    if (changedKeys.includes('thermostat_setpoint_away')) {
      attributes.aqaraTRVAwayPresetTemperature = newSettings.thermostat_setpoint_away * 100;
      this.log('SETTINGS | Write Attribute - Aqara Manufacturer Specific Cluster - aqaraTRVAwayPresetTemperature', newSettings.thermostat_setpoint_away);
    }

    // open_window_detection attribute
    if (changedKeys.includes('open_window_detection')) {
      attributes.aqaraTRVWindowOpenDetection = newSettings.open_window_detection;
      this.log('SETTINGS | Write Attribute - Aqara Manufacturer Specific Cluster - aqaraTRVWindowOpenDetection', newSettings.open_window_detection);
      if (!newSettings.open_window_detection) await this.setCapabilityValue('alarm_window', false).catch(this.error);
    }

    // thermostat_control_fault_detection attribute
    if (changedKeys.includes('thermostat_control_fault_detection')) {
      attributes.aqaraTRVValveDetection = newSettings.thermostat_control_fault_detection;
      this.log('SETTINGS | Write Attribute - Aqara Manufacturer Specific Cluster - aqaraTRVValveDetection', newSettings.thermostat_control_fault_detection);
      if (!newSettings.thermostat_control_fault_detection) await this.setCapabilityValue('alarm_thermostat', false).catch(this.error);
    }

    try {
      if (Object.keys(attributes).length > 0) {
        this.log('=>', attributes);
        await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME].writeAttributes(attributes), 3).catch(this.error);
      }
    } catch (err) {
      // reset settings values on failed update
      throw new Error(`failed to update settings. Message:${err}`);
    }
  }

  async maintenanceCalibrationStart() {
    this.log('MaintenanceAction | Auto calibration - start');

    await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
      .writeAttributes({ aqaraTRVCalibrate: 1 }), 3)
      .then(() => this.log('MaintenanceAction | Auto calibration - completed'))
      .catch(this.error);
  }

  /**
   * This is Aqara's custom lifeline attribute, it contains a lot of data, af which the most
   * interesting the battery level. The battery level divided by 1000 represents the battery
   * voltage.
   * @param {{batteryLevel: number}} lifeline
   */
  onAqaraLifelineAttributeReport({
    state1, state2, state3, state4, state5, state6,
  } = {}) {
    this.debug('onAqaraLifelineAttributeReport', state1, state2, state3, state4, state5, state6);
    // 101: Preset
    if (typeof state1 === 'number') this.onPresetAttributeReport('AqaraLifeline', 'aqaraTRVPreset', state1);

    // 102: local temperature
    if (typeof state2 === 'number') this.onTemperatureMeasuredAttributeReport('AqaraLifeline', 'state2', state2);

    // 103: heating setpoint
    if (typeof state3 === 'number') this.onTargetTemperatureAttributeReport('AqaraLifeline', 'state3', state3);

    // 104: alarm_thermostat
    if (typeof state4 === 'number') this.onAqaraAttributeReportLogger('aqaraTRVValveAlarm', state4);
    // 105: battery
    if (typeof state5 === 'number') this.onBatteryPercentageAttributeReport('AqaraLifeline', 'batteryPercentage', state5);

    // 106: unknown
    if (typeof state6 === 'number') {
      this.debug('onAqaraLifelineAttributeReport | state6', state6);
    }
  }

  async _externalTemperature(value) {
    const lumiHeader = (counter, params, action) => {
      const header = [0xaa, 0x71, params.length + 3, 0x44, counter];
      const integrity = 512 - header.reduce((sum, elem) => sum + elem, 0);
      return [...header, integrity, action, 0x41, params.length];
    };
    const sensor = Buffer.from('00158d00019d1b98', 'hex');

    const temperatureBuf = Buffer.alloc(4);
    const number = value; // toNumber(value);
    temperatureBuf.writeFloatBE(Math.round(number * 100));

    const params = [...sensor, 0x00, 0x01, 0x00, 0x55, ...temperatureBuf];
    const data = [...(lumiHeader(0x12, params, 0x05)), ...params];

    this.log('EXTERNAL temperature write', value, data);

    await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
      .writeAttributes({ aqaraTRVSensorType: 0 }), 3);

    await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME]
      .writeAttributes({ aqaraUnknown0xfff2: data }), 3);
    // await entity.write('manuSpecificLumi', {0xfff2: {value: data, type: 0x41}}, {manufacturerCode: manufacturerCode});
  }

  _localTimeToUTC() {
    // Zigbee2MQTT: 15:40:13 2d808433 =                 763396813

    // Homey: 2024-03-10T14:46:01.000Z Europe/Amsterdam 763397161 3600 = 2D808429

    const timeDiffSeconds = 946684800;
    const timezone = this.homey.clock.getTimezone();
    // const date1970Milliseconds = Date.now(); // + moment.tz(timezone).utcOffset()* 60 * 1000
    const date2000Seconds = Math.floor(
      Date.now() / 1000 - timeDiffSeconds,
    );
    const date = new Date((date2000Seconds + timeDiffSeconds) * 1000);

    const localTimeUTC = date2000Seconds;
    const localTimeZoneUTC = moment.tz(timezone).utcOffset() * 60; // in seconds)
    this.log('will set time ', date, timezone, localTimeUTC, localTimeZoneUTC);
    return { localTimeUTC, localTimeZoneUTC };
  }

  _timeCluster() {
    return this.zclNode.endpoints[1].clusters.time;
  }

  async _setTimeUTC() {
    const { localTimeUTC, localTimeZoneUTC } = this._localTimeToUTC();
    this.log('Updating time to', localTimeUTC, localTimeZoneUTC);
    await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[1].clusters[AqaraSpecificTimeCluster.NAME].writeAttributes({
      time: localTimeUTC,
      timeZone: localTimeZoneUTC,
    }), 3).then(() => {
      this.log('Time updated successfully');
      // this._setDateTimeByDate(date);
    }).catch(err => {
      this.log('Time did NOT update successfully; error ', err);
    });
  }

}

module.exports = AqaraE1TSmartRadiatorThermostat;
