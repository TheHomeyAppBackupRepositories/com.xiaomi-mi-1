'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AqaraE1RollerShadeCompanionDriver extends ZigBeeDriver {

  onInit() {
    super.onInit();
    this.curtainOperatingSpeedAction = this.homey.flow.getActionCard('curtain_operating_speed')
      .registerRunListener((args, state) => {
        return args.device.setCurtainOperatingSpeedRunListener(args, state);
      });
  }

}

module.exports = AqaraE1RollerShadeCompanionDriver;
