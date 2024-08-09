// combine LEDstrip_audio & LEDStrip_audio_sensitivity into LEDstrip_audio (enum off, high, medium, low)

'use strict';

const { ZigBeeLightDevice, Util } = require('homey-zigbeedriver');
const {
  debug, Cluster, CLUSTER,
} = require('zigbee-clusters');

const AqaraManufacturerSpecificCluster = require('../../lib/AqaraManufacturerSpecificCluster');

class AqaraT1LEDstrip extends ZigBeeLightDevice {

  async onNodeInit({ zclNode }) {
    this.setStoreValue('colorTempMin', 153).catch(this.error); // 6500K = 153 Mired
    this.setStoreValue('colorTempMax', 370).catch(this.error); // 2700K = 370 Mired

    await super.onNodeInit({ zclNode, supportsHueAndSaturation: false, supportsColorTemperature: true });

    // enable debugging
    this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        reportParser(value) {
          this.onOnOffAttributeReport(value);
          return value;
        },
        endpoint: 1,
      });
    }

    if (this.hasCapability('dim')) {
      this.registerCapability('dim', CLUSTER.LEVEL_CONTROL, {
        endpoint: 1,
      });
    }

    // zclNode.endpoints[1].clusters[CLUSTER.BASIC.NAME]
    zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME]
      .on('attr.aqaraLEDStripMinBrightness', this.onAqaraAttributeReportLogger.bind(this, 'aqaraLEDStripMinBrightness'))
      .on('attr.aqaraLEDStripMaxBrightness', this.onAqaraAttributeReportLogger.bind(this, 'aqaraLEDStripMaxBrightness'))
      .on('attr.aqaraLEDStripLength', this.onAqaraAttributeReportLogger.bind(this, 'aqaraLEDStripLength'))
      .on('attr.aqaraLEDStripAudio', this.onAqaraAttributeReportLogger.bind(this, 'aqaraLEDStripAudio'))
      .on('attr.aqaraLEDStripAudioEffect', this.onAqaraAttributeReportLogger.bind(this, 'aqaraLEDStripAudioEffect'))
      .on('attr.aqaraLEDStripAudioSensitivity', this.onAqaraAttributeReportLogger.bind(this, 'aqaraLEDStripAudioSensitivity'))
      .on('attr.aqaraLEDStripPreset', this.onAqaraAttributeReportLogger.bind(this, 'aqaraLEDStripPreset'))
      .on('attr.aqaraLEDStripPresetSpeed', this.onAqaraAttributeReportLogger.bind(this, 'aqaraTRVAwayPresetTemperature'));

    if (this.hasCapability('LEDstrip_audio')) {
      this.registerCapabilityListener('LEDstrip_audio',
        async (value, opts) => {
          this.onSetAudio(value);
        });
    }

    if (this.hasCapability('LEDstrip_audio_effect')) {
      this.registerCapabilityListener('LEDstrip_audio_effect',
        async (value, opts) => {
          this.onSetAudioEffect(value);
        });
    }

    if (this.hasCapability('LEDstrip_preset')) {
      this.registerCapabilityListener('LEDstrip_preset',
        async (value, opts) => {
          this.onSetLEDstripPresetSpeed(value, null);
          // await this.setCapabilityValue('onoff', true).catch(this.error);
          // update onoff and dim
        });
    }

    if (this.hasCapability('LEDstrip_preset_speed')) {
      this.registerCapabilityListener('LEDstrip_preset_speed',
        async (value, opts) => {
          this.onSetLEDstripPresetSpeed(null, value);
        });
    }

    if (this.isFirstInit()) this.initCapabilities();
  }

  async initCapabilities() {
    this.log('initializing capabilities');
    try {
      const {
        aqaraLEDStripAudio, aqaraLEDStripPreset, aqaraLEDStripPresetSpeed,
      } = await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME].readAttributes(['aqaraLEDStripAudio', 'aqaraLEDStripPreset', 'aqaraLEDStripPresetSpeed']), 3).catch(this.error);
      this.onAqaraAttributeReportLogger('aqaraLEDStripAudio', aqaraLEDStripAudio);
      this.onAqaraAttributeReportLogger('aqaraLEDStripPreset', aqaraLEDStripPreset);
      this.onAqaraAttributeReportLogger('aqaraLEDStripPresetSpeed', aqaraLEDStripPresetSpeed);
    } catch (err) {
      this.log(`failed to initializing capabilities settings for the Aqara manufacturerespecific cluster. Message:${err}`);
    }
  }

  onOnOffAttributeReport(value) {
    if (value) {
      const onTransitionTime = this.getSetting('on_transition_time');
      // wait for 5 seconds before updating the dim level
      setTimeout(async () => {
        const currentLevel = this.getClusterCapabilityValue(
          'dim',
          CLUSTER.LEVEL_CONTROL,
        );
        this.setCapabilityValue('dim', currentLevel / 254);
      }, onTransitionTime * 1000);
    } else {
      this.setCapabilityValue('LEDstrip_preset', null);
      this.setCapabilityValue('dim', 0);
    }
  }

  async onAqaraAttributeReportLogger(attribute, value) {
    this.debug(`attr.${attribute} ${value}`);

    switch (attribute) {
      case 'aqaraLEDStripMinBrightness':
        this.log('handle report (cluster: AqaraManufacturerSpecificCluster, attribute: aqaraLEDStripMinBrightness, setting: LEDStrip_min_brightness), parsed payload:', value);
        this.setSettings({ LEDStrip_min_brightness: value }).catch(this.error);
        break;
      case 'aqaraLEDStripMaxBrightness':
        this.log('handle report (cluster: AqaraManufacturerSpecificCluster, attribute: aqaraLEDStripMaxBrightness, setting: LEDStrip_max_brightness), parsed payload:', value);
        this.setSettings({ LEDStrip_max_brightness: value }).catch(this.error);
        break;
      case 'aqaraLEDStripLength':
        this.log('handle report (cluster: AqaraManufacturerSpecificCluster, attribute: aqaraLEDStripLength, setting: LEDStrip_length), parsed payload:', value / 5);
        this.setSettings({ LEDStrip_length: value / 5 }).catch(this.error);
        break;
      case 'aqaraLEDStripAudio':
        this.log('handle report (cluster: AqaraManufacturerSpecificCluster, attribute: aqaraLEDStripAudio, capability: LEDstrip_audio), parsed payload:', value === 1);
        if (value !== 1) {
          if (this.hasCapability('LEDstrip_audio')) this.setCapabilityValue('LEDstrip_audio', 'off').catch(this.error);
        } else {
          const { aqaraLEDStripAudioSensitivity } = await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME].readAttributes(['aqaraLEDStripAudioSensitivity']), 3).catch(this.error);
          if (this.hasCapability('LEDstrip_audio')) this.setCapabilityValue('LEDstrip_audio', aqaraLEDStripAudioSensitivity.toString()).catch(this.error);
        }

        break;
      case 'aqaraLEDStripAudioEffect':
        this.log('handle report (cluster: AqaraManufacturerSpecificCluster, attribute: aqaraLEDStripAudioEffect, capability: LEDstrip_audio_effect), parsed payload:', value);
        if (this.hasCapability('LEDstrip_audio_effect')) this.setCapabilityValue('LEDstrip_audio_effect', value.toString()).catch(this.error);
        break;
      case 'aqaraLEDStripAudioSensitivity':
        this.log('handle report (cluster: AqaraManufacturerSpecificCluster, attribute: aqaraLEDStripAudioSensitivity, setting: LEDStrip_audio_sensitivity), parsed payload:', value);
        this.setSettings({ LEDStrip_audio_sensitivity: value.toString() }).catch(this.error);
        break;
      case 'aqaraLEDStripPreset':
        this.log('handle report (cluster: AqaraManufacturerSpecificCluster, attribute: aqaraLEDStripPreset, capability: LEDstrip_preset), parsed payload:', value);
        if (this.hasCapability('LEDstrip_preset')) this.setCapabilityValue('LEDstrip_preset', value.toString()).catch(this.error);
        break;
      case 'aqaraLEDStripPresetSpeed':
        this.log('handle report (cluster: AqaraManufacturerSpecificCluster, attribute: aqaraLEDStripPresetSpeed, capability: LEDstrip_preset_speed), parsed payload:', value / 100);
        if (this.hasCapability('LEDstrip_preset_speed')) this.setCapabilityValue('LEDstrip_preset_speed', value / 100).catch(this.error);
        break;
      default:
        break;
    }
  }

  async onSetAudio(value) {
    this.log('Setting LEDstrip_audio status to', value);
    if (value === 'off') {
      await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME].writeAttributes({ aqaraLEDStripAudio: false }), 3).catch(this.error);
    } else {
      await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME].writeAttributes({ aqaraLEDStripAudioSensitivity: value }), 3).catch(this.error);
    }
  }

  async onSetAudioEffect(value) {
    this.log('Setting LEDstrip_audio_effect status to', value);
    await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME].writeAttributes({ aqaraLEDStripAudioEffect: value }), 3).catch(this.error);
  }

  async onSetLEDstripPresetSpeed(preset, speed) {
    const attributes = {};
    if (preset) {
      if (Number(preset) > 7) {
        this.setWarning('Custom light presets are not supported yet');
        preset = await this.getCapabilityValue('LEDstrip_preset');
        attributes.aqaraLEDStripPreset = preset;
      } else {
        this.log('Setting LEDstrip_preset status to', preset);
        attributes.aqaraLEDStripPreset = preset;
      }
    }
    if (speed) {
      this.log('Setting LEDstrip_preset_speed status to', speed * 100);
      attributes.aqaraLEDStripPresetSpeed = speed * 100;
    }
    await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME].writeAttributes(attributes), 3).catch(this.error);

    // Update onoff and dim capability (not reported by the device itself)
    const { onOff } = await this.getClusterCapabilityValue(
      'onoff',
      CLUSTER.ON_OFF,
    );
    const { currentLevel } = await this.getClusterCapabilityValue(
      'dim',
      CLUSTER.LEVEL_CONTROL,
    );
    await this.setCapabilityValue('dim', currentLevel / 254).catch(this.error);
    await this.setCapabilityValue('onoff', onOff).catch(this.error);
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    const attributes = {};

    // thermostat_setpoint_away attribute
    if (changedKeys.includes('LEDStrip_length')) {
      attributes.aqaraLEDStripLength = newSettings.LEDStrip_length * 5;
      this.log('SETTINGS | Write Attribute - Aqara Manufacturer Specific Cluster - aqaraLEDStripLength', newSettings.LEDStrip_length, newSettings.LEDStrip_length * 5);
    }

    if (changedKeys.includes('LEDStrip_min_brightness')) {
      attributes.aqaraLEDStripMinBrightness = newSettings.LEDStrip_min_brightness;
      this.log('SETTINGS | Write Attribute - Aqara Manufacturer Specific Cluster - aqaraLEDStripMinBrightness', newSettings.LEDStrip_min_brightness, newSettings.LEDStrip_min_brightness);
    }

    if (changedKeys.includes('LEDStrip_max_brightness')) {
      attributes.aqaraLEDStripMaxBrightness = newSettings.LEDStrip_max_brightness;
      this.log('SETTINGS | Write Attribute - Aqara Manufacturer Specific Cluster - aqaraLEDStripMaxBrightness', newSettings.LEDStrip_max_brightness, newSettings.LEDStrip_max_brightness);
    }

    if (changedKeys.includes('LEDStrip_audio_sensitivity')) {
      attributes.aqaraLEDStripAudioSensitivity = newSettings.LEDStrip_audio_sensitivity;
      this.log('SETTINGS | Write Attribute - Aqara Manufacturer Specific Cluster - aqaraLEDStripAudioSensitivity', newSettings.LEDStrip_audio_sensitivity);
    }

    try {
      if (Object.keys(attributes).length > 0) {
        this.log('=>', attributes);
        await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[this.getClusterEndpoint(AqaraManufacturerSpecificCluster)].clusters[AqaraManufacturerSpecificCluster.NAME].writeAttributes(attributes), 3).catch(this.error);
      }
    } catch (err) {
      // reset settings values on failed update
      throw new Error(`failed to update AqaraManufacturerSpecificCluster settings. Message:${err}`);
    }

    const levelControlAttributes = {};

    if (changedKeys.includes('on_transition_time')) {
      levelControlAttributes.onTransitionTime = newSettings.on_transition_time * 10;
      this.log('SETTINGS | Write Attribute - Level Cluster - onTransitionTime', newSettings.on_transition_time * 10);
    }

    if (changedKeys.includes('off_transition_time')) {
      levelControlAttributes.offTransitionTime = newSettings.off_transition_time * 10;
      this.log('SETTINGS | Write Attribute - Level Cluster - offTransitionTime', newSettings.off_transition_time * 10);
    }

    try {
      if (Object.keys(levelControlAttributes).length > 0) {
        this.log('=>', levelControlAttributes);
        await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[this.getClusterEndpoint(CLUSTER.LEVEL_CONTROL)].clusters[CLUSTER.LEVEL_CONTROL.NAME].writeAttributes(levelControlAttributes), 3).catch(this.error);
      }
    } catch (err) {
      // reset settings values on failed update
      throw new Error(`failed to update levelControl settings. Message:${err}`);
    }
  }

}

module.exports = AqaraT1LEDstrip;
