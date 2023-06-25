// SDK3 updated & validated : DONE

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');

const util = require('../../lib/util');
const XiaomiBasicCluster = require('../../lib/XiaomiBasicCluster');

Cluster.addCluster(XiaomiBasicCluster);

class XiaomiTempSensor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    // add battery capabilities if needed
    if (!this.hasCapability('measure_battery')) {
      this.addCapability('measure_battery').catch(this.error);
    }
    if (!this.hasCapability('alarm_battery')) {
      this.addCapability('alarm_battery').catch(this.error);
    }

    /*
    // Remove unused capabilities
    if (this.hasCapability('alarm_battery')) {
      await this.removeCapability('alarm_battery').catch(this.error);
    }

    if (this.hasCapability('measure_battery')) {
      await this.removeCapability('measure_battery').catch(this.error);
    }
    */

    zclNode.endpoints[1].clusters[CLUSTER.TEMPERATURE_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onTemperatureMeasuredAttributeReport.bind(this));

    zclNode.endpoints[1].clusters[CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onRelativeHumidityMeasuredAttributeReport.bind(this));

    // Lifeline
    zclNode.endpoints[1].clusters[XiaomiBasicCluster.NAME]
      .on('attr.xiaomiLifeline', this.onXiaomiLifelineAttributeReport.bind(this));
  }

  /**
   * Set `measure_temperature` when a `measureValue` attribute report is received on the
   * temperature measurement cluster.
   * @param {number} measuredValue
   */
  onTemperatureMeasuredAttributeReport(measuredValue) {
    const temperatureOffset = this.getSetting('temperature_offset') || 0;
    const parsedValue = this.getSetting('temperature_decimals') === '2' ? Math.round((measuredValue / 100) * 100) / 100 : Math.round((measuredValue / 100) * 10) / 10;
    if (parsedValue >= -65 && parsedValue <= 65) {
      this.log('measure_temperature | msTemperatureMeasurement - measuredValue (temperature):', parsedValue, '+ temperature offset', temperatureOffset);
      this.setCapabilityValue('measure_temperature', parsedValue + temperatureOffset).catch(this.error);
    }
  }

  /**
   * Set `measure_humidity` when a `measureValue` attribute report is received on the relative
   * humidity measurement cluster.
   * @param {number} measuredValue
   */
  onRelativeHumidityMeasuredAttributeReport(measuredValue) {
    const humidityOffset = this.getSetting('humidity_offset') || 0;
    const parsedValue = this.getSetting('humidity_decimals') === '2' ? Math.round((measuredValue / 100) * 100) / 100 : Math.round((measuredValue / 100) * 10) / 10;
    if (parsedValue >= 0 && parsedValue <= 100) {
      this.log('measure_humidity | msRelativeHumidity - measuredValue (humidity):', parsedValue, '+ humidity offset', humidityOffset);
      this.setCapabilityValue('measure_humidity', parsedValue + humidityOffset).catch(this.error);
    }
  }

  onBatteryVoltageAttributeReport(reportingClusterName, reportingAttribute, batteryVoltage) {
    if (typeof batteryVoltage === 'number') {
      const parsedBatPct = util.calculateBatteryPercentage(batteryVoltage * 100, '3V_2850_3000');
      if (this.hasCapability('measure_battery')) {
        this.log(`handle report (cluster: ${reportingClusterName}, attribute: ${reportingAttribute}, capability: measure_battery), parsed payload:`, parsedBatPct);
        this.setCapabilityValue('measure_battery', parsedBatPct).catch(this.error);
      }

      if (this.hasCapability('alarm_battery')) {
        this.log(`handle report (cluster: ${reportingClusterName}, attribute: ${reportingAttribute}, capability: alarm_battery), parsed payload:`, parsedBatPct < 20);
        this.setCapabilityValue('alarm_battery', parsedBatPct < 20).catch(this.error);
      }
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
      this.onBatteryVoltageAttributeReport('AqaraLifeline', 'batteryVoltage', batteryVoltage / 100);
    }
  }

}

module.exports = XiaomiTempSensor;

// WSDCGQ01LM_sens
/*
Node overview:
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ------------------------------------------
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] Node: 78db4c1a-5cde-4f65-b68c-42ba2832ca3e
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] - Battery: false
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] - Endpoints: 0
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] -- Clusters:
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] --- zapp
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] --- genBasic
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- 65281 : !�
                                                                     !�!>$d)�e!�
!
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- cid : genBasic
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- sid : attrs
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- modelId : lumi.sensor_ht
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] --- genIdentify
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- cid : genIdentify
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- sid : attrs
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] --- genGroups
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- cid : genGroups
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- sid : attrs
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] --- genScenes
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- cid : genScenes
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- sid : attrs
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] --- genMultistateInput
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- cid : genMultistateInput
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- sid : attrs
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] --- genOta
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- cid : genOta
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- sid : attrs
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] --- manuSpecificCluster
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- cid : manuSpecificCluster
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- sid : attrs
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] - Endpoints: 1
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] -- Clusters:
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] --- zapp
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] --- genIdentify
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- cid : genIdentify
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- sid : attrs
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] --- genGroups
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- cid : genGroups
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- sid : attrs
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] --- genScenes
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- cid : genScenes
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- sid : attrs
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] --- genMultistateInput
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- cid : genMultistateInput
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- sid : attrs
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] - Endpoints: 2
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] -- Clusters:
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] --- zapp
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] --- genIdentify
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- cid : genIdentify
2018-03-03 16:56:10 [log] [ManagerDrivers] [sens] [0] ---- sid : attrs
2018-03-03 16:56:11 [log] [ManagerDrivers] [sens] [0] --- genGroups
2018-03-03 16:56:11 [log] [ManagerDrivers] [sens] [0] ---- cid : genGroups
2018-03-03 16:56:11 [log] [ManagerDrivers] [sens] [0] ---- sid : attrs
2018-03-03 16:56:11 [log] [ManagerDrivers] [sens] [0] --- genScenes
2018-03-03 16:56:11 [log] [ManagerDrivers] [sens] [0] ---- cid : genScenes
2018-03-03 16:56:11 [log] [ManagerDrivers] [sens] [0] ---- sid : attrs
2018-03-03 16:56:11 [log] [ManagerDrivers] [sens] [0] --- genAnalogInput
2018-03-03 16:56:11 [log] [ManagerDrivers] [sens] [0] ---- cid : genAnalogInput
2018-03-03 16:56:11 [log] [ManagerDrivers] [sens] [0] ---- sid : attrs
2018-03-03 16:56:11 [log] [ManagerDrivers] [sens] [0] ------------------------------------------

*/
