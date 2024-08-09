'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AqaraT1LEDstripDriver extends ZigBeeDriver {

  onInit() {
    super.onInit();

    this.LEDstripAudioOffAction = this.homey.flow.getActionCard('LEDStrip_audio_off')
      .registerRunListener(async (args, state) => {
        // await Util.wrapAsyncWithRetry(() => zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME].writeAttributes({ aqaraLEDStripAudio: false }), 3).catch(this.error);
        return args.device.onSetAudio('off');
      });

    this.LEDstripAudioSetAction = this.homey.flow.getActionCard('LEDStrip_audio_set')
      .registerRunListener(async (args, state) => {
        // await Util.wrapAsyncWithRetry(() => zclNode.endpoints[1].clusters[AqaraManufacturerSpecificCluster.NAME].writeAttributes({ aqaraLEDStripAudioSensitivity: value }), 3).catch(this.error);
        return args.device.onSetAudio(args.audio_sensitivity);
      });

    this.LEDstripAudioEffectSetAction = this.homey.flow.getActionCard('LEDStrip_audio_effect_set')
      .registerRunListener(async (args, state) => {
        return args.device.onSetAudioEffect(args.audio_effect);
      });

    this.LEDstripPresetSetAction = this.homey.flow.getActionCard('LEDStrip_preset_set')
      .registerRunListener(async (args, state) => {
        if (Number(args.preset) > 7) throw new Error('Custom light presets are not supported yet');
        return args.device.onSetLEDstripPresetSpeed(args.preset, args.preset_speed);
      });
  }

}

module.exports = AqaraT1LEDstripDriver;
