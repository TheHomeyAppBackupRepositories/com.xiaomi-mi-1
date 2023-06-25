'use strict';

const Homey = require('homey');

class XiaomiZigbee extends Homey.App {

  onInit() {
    this.log('Xiaomi Zigbee app is running...');

    this.triggerButton1_button = this.homey.flow
      .getDeviceTriggerCard('button1_button');

    this.triggerButton2_button = this.homey.flow
      .getDeviceTriggerCard('button2_button');

    this.triggerButton1_scene = this.homey.flow
      .getDeviceTriggerCard('trigger_button1_scene');
    this.triggerButton1_scene
      .registerRunListener((args, state) => Promise.resolve(args.scene.id === state.scene))
      .getArgument('scene')
      .registerAutocompleteListener((query, args, callback) => args.device.onSceneAutocomplete(query, args, callback));

    this.triggerButton2_scene = this.homey.flow
      .getDeviceTriggerCard('trigger_button2_scene');
    this.triggerButton2_scene
      .registerRunListener((args, state) => Promise.resolve(args.button.id === state.button && args.scene.id === state.scene));

    this.triggerButton2_scene
      .getArgument('scene')
      .registerAutocompleteListener((query, args, callback) => args.device.onSceneAutocomplete(query, args, callback));
    this.triggerButton2_scene
      .getArgument('button')
      .registerAutocompleteListener((query, args, callback) => args.device.onButtonAutocomplete(query, args, callback));

    // Register triggers for flows
    this._triggerSwitchTwoTurnedOn = this.homey.flow
      .getDeviceTriggerCard('trigger_switch2_turned_on');
    this._triggerSwitchTwoTurnedOff = this.homey.flow
      .getDeviceTriggerCard('trigger_switch2_turned_off');

    // Register conditions for flows
    this._conditionSwitchTwoIsOn = this.homey.flow
      .getConditionCard('condition_switch2_is_on')
      .registerRunListener((args, state) => {
        this.log('FlowCardCondition evalutated for', args.device.getName(), ', device state: ', args.device.getCapabilityValue('onoff.1'));
        return args.device.getCapabilityValue('onoff.1');
      });

    // Register actions for flows
    this._actionSwitchTwoTurnOff = this.homey.flow
      .getActionCard('action_turn_on_switch2')
      .registerRunListener((args, state) => {
        this.log('FlowCardAction triggered for ', args.device.getName(), 'to switch on');
        return args.device.triggerCapabilityListener('onoff.1', true, {});
      });

    this._actionSwitchTwoTurnOff = this.homey.flow
      .getActionCard('action_turn_off_switch2')
      .registerRunListener((args, state) => {
        this.log('FlowCardAction triggered for ', args.device.getName(), 'to switch off');
        return args.device.triggerCapabilityListener('onoff.1', false, {});
      });
  }

}

module.exports = XiaomiZigbee;
