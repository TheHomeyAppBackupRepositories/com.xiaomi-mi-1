'use strict';

const { Driver } = require('homey');

class AqaraE1TSmartRadiatorThermostatDriver extends Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.triggerThermostatModeChangedTo = this.homey.flow
      .getDeviceTriggerCard('thermostat_mode_changed_to');
    this.triggerThermostatModeChangedTo
      .registerRunListener((args, state) => Promise.resolve(args.mode === state.mode));

    this.actionThermostatChangeMode = this.homey.flow
      .getActionCard('thermostat_change_mode');
    this.actionThermostatChangeMode
      .registerRunListener(this.actionThermostatChangeModeRunListener.bind(this));
  }

  async actionThermostatChangeModeRunListener(args, state) {
    this.log('Setting new Thermostat mode to', args.mode);
    try {
      args.device.log('FlowCardAction triggered for ', args.device.getName(), 'to change Thermostat mode to', args.mode);
      await args.device.onSetPreset(args.mode).catch(this.error);
    } catch (error) {
      throw new Error('Unable to set new Thermostat mode', error);
    }
  }

}

module.exports = AqaraE1TSmartRadiatorThermostatDriver;
