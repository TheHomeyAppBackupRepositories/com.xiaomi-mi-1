// SDK3 updated & validated: DONE

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');

const util = require('../../lib/util');
const XiaomiBasicCluster = require('../../lib/XiaomiBasicCluster');

Cluster.addCluster(XiaomiBasicCluster);

class XiaomiLightSensor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    if (this.isFirstInit()) {
      try {
        await this.configureAttributeReporting([{
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryVoltage',
          minInterval: 30,
          maxInterval: 43200,
          minChange: 1,
        }]);
      } catch (err) {
        this.error('failed to read  attributes', err);
      }
    }

    zclNode.endpoints[1].clusters[CLUSTER.BASIC.NAME]
      .on('attr.xiaomiLifeline', this.onXiaomiLifelineAttributeReport.bind(this));

    // if (this.hasCapability('measure_battery')) {
    zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
      .on('attr.batteryVoltage', this.onBatteryVoltageAttributeReport.bind(this));
    // }

    // if (this.hasCapability('measure_luminance')) {
    zclNode.endpoints[1].clusters[CLUSTER.ILLUMINANCE_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onIlluminanceMeasuredAttributeReport.bind(this));
    // }
  }

  /**
   * Set `measure_temperature` when a `measureValue` attribute report is received on the
   * temperature measurement cluster.
   * @param {number} measuredValue
   */
  onIlluminanceMeasuredAttributeReport(measuredValue) {
    const parsedPayload = 10 ** ((measuredValue - 1) / 10000); // Lux = 10^((data-1)/10000)
    this.log('measure_luminance | msIlluminanceMeasurement - measuredValue', parsedPayload);
    return this.setCapabilityValue('measure_luminance', parsedPayload).catch(this.error);
  }

  onBatteryVoltageAttributeReport(batteryVoltage) {
    if (typeof batteryVoltage === 'number') {
      const parsedBatPct = util.calculateBatteryPercentage(batteryVoltage * 100, '3V_2500');
      this.log('onBatteryVoltageAttributeReport', batteryVoltage, 'parsedBatteryPct', parsedBatPct);
      this.setCapabilityValue('measure_battery', parsedBatPct).catch(this.error);
      this.setCapabilityValue('alarm_battery', parsedBatPct < 20).catch(this.error);
    }
  }

  /**
   * This is Xiaomi's custom lifeline attribute, it contains a lot of data, af which the most
   * interesting the battery level. The battery level divided by 1000 represents the battery
   * voltage. If the battery voltage drops below 2600 (2.6V) we assume it is almost empty, based
   * on the battery voltage curve of a CR1632.
   * @param {{batteryLevel: number}} lifeline
   */
  onXiaomiLifelineAttributeReport({
    batteryVoltage,
  } = {}) {
    if (typeof batteryVoltage === 'number') {
      const parsedBatPct = util.calculateBatteryPercentage(batteryVoltage, '3V_2100');
      this.log('lifeline attribute report', {
        batteryVoltage,
      }, 'parsedBatteryPct', parsedBatPct);
      this.setCapabilityValue('measure_battery', parsedBatPct).catch(this.error);
      this.setCapabilityValue('alarm_battery', parsedBatPct < 20).catch(this.error);
    }
  }

}

module.exports = XiaomiLightSensor;

// RTCGQ11LM_sensor_motion

/*
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ------------------------------------------
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] Node: 555d5398-ab91-457a-a930-51b9576da411
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] - Battery: true
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] - Endpoints: 0
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] -- Clusters:
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] --- zapp
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] --- genBasic
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- 9 : 227
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- 10 : bwl
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- 11 : www.aqara.com
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- 65533 : 1
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- cid : genBasic
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- sid : attrs
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- zclVersion : 3
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- appVersion : 21
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- stackVersion : 2
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- hwVersion : 1
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- manufacturerName : LUMI
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- modelId : lumi.sen_ill.mgl01
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- dateCode : 20191118
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- powerSource : 3
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- appProfileVersion : 255
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- swBuildId : 2019www.
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] --- genPowerCfg
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- 65533 : 1
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- cid : genPowerCfg
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- sid : attrs
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- batteryVoltage : 32
2020-02-25 13:23:47 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- batterySize : 7
2020-02-25 13:23:48 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- batteryQuantity : 1
2020-02-25 13:23:48 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- batteryRatedVoltage : 30
2020-02-25 13:23:48 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- batteryAlarmMask : 1
2020-02-25 13:23:48 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- batteryVoltMinThres : 27
2020-02-25 13:23:48 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- batteryAlarmState : 0
2020-02-25 13:23:48 [log] [ManagerDrivers] [sen_ill.mgl01] [0] --- genIdentify
2020-02-25 13:23:48 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- 65533 : 1
2020-02-25 13:23:48 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- cid : genIdentify
2020-02-25 13:23:48 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- sid : attrs
2020-02-25 13:23:48 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- identifyTime : 0
2020-02-25 13:23:48 [log] [ManagerDrivers] [sen_ill.mgl01] [0] --- msIlluminanceMeasurement
2020-02-25 13:23:48 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- 65533 : 1
2020-02-25 13:23:48 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- cid : msIlluminanceMeasurement
2020-02-25 13:23:48 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- sid : attrs
2020-02-25 13:23:48 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- measuredValue : 15564
2020-02-25 13:23:48 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- minMeasuredValue : 1
2020-02-25 13:23:48 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- maxMeasuredValue : 50000
2020-02-25 13:23:48 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- tolerance : 0
2020-02-25 13:23:48 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ---- lightSensorType : 1
2020-02-25 13:23:48 [log] [ManagerDrivers] [sen_ill.mgl01] [0] ------------------------------------------

*/
