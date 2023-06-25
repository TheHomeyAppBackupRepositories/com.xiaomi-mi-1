// SDK3 updated & validated: DONE
// TODO: Check Cube Rotate flow card trigger

'use strict';

// 			+---+
// 			| 1 |
// 	+---+---+---+
// 	| 5 | 6 | 2 |
// 	+---+---+---+
// 			| 4 |
// 			+---+
// 			| 3 |
// 			+---+
// where side 6 holds the MI logo and side 4 has the battery door.

const motionArray = {
  0: 'Shake',
  1: 'Flip90',
  2: 'Flip180',
  4: 'Slide',
  8: 'DoubleTap',
  16: 'Rotate',
  32: 'Catch',
};

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');

const util = require('../../lib/util');
const XiaomiBasicCluster = require('../../lib/XiaomiBasicCluster');

Cluster.addCluster(XiaomiBasicCluster);

class AqaraCubeSensor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // print the node's info to the console
    // this.printNode();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    zclNode.endpoints[2].clusters[CLUSTER.MULTI_STATE_INPUT.NAME]
      .on('attr.presentValue', this.motionAttribReport.bind(this));

    zclNode.endpoints[3].clusters[CLUSTER.ANALOG_INPUT.NAME]
      .on('attr.presentValue', this.rotatedAttribReport.bind(this));

    zclNode.endpoints[1].clusters[XiaomiBasicCluster.NAME]
      .on('attr.xiaomiLifeline', this.onXiaomiLifelineAttributeReport.bind(this));

    // Cube is shaked
    this.cubeShakeTriggerDevice = this.homey.flow
      .getDeviceTriggerCard('cube_Shake');
    this.cubeShakeTriggerDevice
      .registerRunListener((args, state) => {
        this.debug('cubeShake (args, state):', args, state);
        return Promise.resolve(args.targetFace === state.targetFace || args.targetFace === '0');
      });

    // Cube is flipped 90 degrees
    this.cubeFlip90TriggerDevice = this.homey.flow
      .getDeviceTriggerCard('cube_Flip90');
    this.cubeFlip90TriggerDevice
      .registerRunListener((args, state) => {
        this.debug('cubeFlip90 (args, state):', args, state);
        return Promise.resolve(
          (args.sourceFace === '0' && args.targetFace === state.targetFace) // any side to target side
					|| (args.sourceFace === state.sourceFace && args.targetFace === '0') // source side to any side
					|| (args.sourceFace === state.sourceFace && args.targetFace === state.targetFace) // source side to target side
					|| (args.sourceFace === '0' && args.targetFace === '0'),
        ); // any side to any side
      });

    // Cube is flipped 180 degrees
    this.cubeFlip180TriggerDevice = this.homey.flow
      .getDeviceTriggerCard('cube_Flip180');
    this.cubeFlip180TriggerDevice
      .registerRunListener((args, state) => {
        this.debug('cubeFlip180 (args, state):', args, state);
        return Promise.resolve(args.targetFace === state.targetFace || args.targetFace === '0');
      });

    // cube is slided
    this.cubeSlideTriggerDevice = this.homey.flow
      .getDeviceTriggerCard('cube_Slide');
    this.cubeSlideTriggerDevice
      .registerRunListener((args, state) => {
        this.debug('cubeSlide (args, state):', args, state);
        return Promise.resolve(args.targetFace === state.targetFace || args.targetFace === '0');
      });

    // cube is double tapped
    this.cubeDoubleTapTriggerDevice = this.homey.flow
      .getDeviceTriggerCard('cube_DoubleTap');
    this.cubeDoubleTapTriggerDevice
      .registerRunListener((args, state) => {
        this.debug('cubeDoubleTap (args, state):', args, state);
        return Promise.resolve(args.targetFace === state.targetFace || args.targetFace === '0');
      });

    // cube is turned
    this.cubeRotateTriggerDevice = this.homey.flow
      .getDeviceTriggerCard('cube_Rotate');
    this.cubeRotateTriggerDevice
      .registerRunListener((args, state) => {
        this.debug('cubeRotate (args, state):', args, state);
        return Promise.resolve(args.targetFace === state.targetFace || args.targetFace === '0');
      });

    // cube motion report
    this.cubeMotionTriggerDevice = this.homey.flow
      .getDeviceTriggerCard('cube_Motion');

    /*
		// cube is catched
		this.catchCubeTriggerDevice = new this.homey.FlowCardTriggerDevice('cube_catched');
		this.catchCubeTriggerDevice.register();
		*/
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
      const parsedBatPct = util.calculateBatteryPercentage(batteryVoltage, '3V_2850_3000');
      this.log('lifeline attribute report', {
        batteryVoltage,
      }, 'parsedBatteryPct', parsedBatPct);
      this.setCapabilityValue('measure_battery', parsedBatPct).catch(this.error);
      this.setCapabilityValue('alarm_battery', parsedBatPct < 20).catch(this.error);
    }
  }

  motionAttribReport(data) {
    // data in binary first 4 bits indicate type of motion, following group of 3 bits indicate the face of the cube
    const motionType = (data >> 6) & 0b1111; // 0 (shake), 1 (flip 90), 2 (flip 180), 4 (slide), 8 (double tap)
    const sourceFace = ((data >> 3) & 0b111) + 1; // sourceFace (1-6)
    // in case of Shake event retrieve last known cube_state_face
    const targetFace = motionArray[motionType] !== 'Shake' ? (data & 0b111) + 1 : (this.getCapabilityValue('cube_state_face') || 6); // targetFace (1-6)

    this.log('genMultistateInput - presentValue (motion): ', data, 'motionType', motionArray[motionType], 'sourceFace', sourceFace, 'targetFace', targetFace);

    const cubeAction = {
      motion: motionArray[motionType],
      sourceFace: sourceFace.toString(),
      targetFace: targetFace.toString(),
    };

    // set corresponding capability values
    this.setCapabilityValue('cube_state_motion', cubeAction.motion).catch(this.error);
    this.setCapabilityValue('cube_state_face', cubeAction.targetFace).catch(this.error);

    // Trigger the corresponding triggerdevice matching to the motion
    if (cubeAction.motion) {
      this.triggerFlow({
        id: `cube_${cubeAction.motion}`,
        tokens: null,
        state: cubeAction,
      })
        .then(() => this.debug(`Triggered cube${cubeAction.motion}TriggerDevice, cubeAction:`, cubeAction))
        .catch(err => this.error(`Error triggering cube${cubeAction.motion}TriggerDevice`, err));
    }

    // Trigger generic motion token trigger card
    // Trigger the trigger card with tokens
    this.triggerFlow({
      id: 'cube_Motion',
      tokens: {
        motion: cubeAction.motion,
        sourceFace,
        targetFace,
      },
      state: null,
    })
      .then(() => this.debug('Triggered cubeMotionTriggerDevice'))
      .catch(err => this.error('Error triggering cubeMotionTriggerDevice', err));
  }

  turnedAttribReport(data) {
    this.log('turned', data);
    const cubeAction = {
      motion: 'Rotate',
      sourceFace: null,
      targetFace: (this.getCapabilityValue('cube_state_face') || '6'),
    };

    // set corresponding capability values
    this.setCapabilityValue('cube_state_motion', cubeAction.motion).catch(this.error);

    // Trigger the corresponding triggerdevice matching to the motion
    if (cubeAction.motion) {
      this.triggerFlow({
        id: `cube_${cubeAction.motion}`,
        tokens: null,
        state: cubeAction,
      })
        .then(() => this.debug(`Triggered cube${cubeAction.motion}TriggerDevice, cubeAction:`, cubeAction))
        .catch(err => this.error(`Error triggering cube${cubeAction.motion}TriggerDevice`, err));
    }

    // Trigger generic motion token trigger card
    this.cubeMotionTriggerDevice.trigger(this, {
      motion: cubeAction.motion,
      sourceFace: 0,
      targetFace: parseInt(cubeAction.targetFace),
    })
      .then(() => this.debug('Triggered cubeMotionTriggerDevice'))
      .catch(err => this.error('Error triggering cubeMotionTriggerDevice', err));
  }

  rotatedAttribReport(data) {
    this.log('genAnalogInput - presentValue (rotate)', data);

    const cubeAction = {
      motion: 'Rotate',
      sourceFace: null,
      targetFace: (this.getCapabilityValue('cube_state_face') || '6'),
      rotationAngle: Math.round(data * 100) / 100,
      relativeRotationAngle: Math.round((data > 0 ? Math.min((data / (this.getSetting('cube_relative_angles') || 180)), 1) : Math.max((data / (this.getSetting('cube_relative_angles') || 180)), -1)) * 100) / 100,
    };

    // set corresponding capability values
    this.setCapabilityValue('cube_state_motion', cubeAction.motion).catch(this.error);
    this.setCapabilityValue('cube_measure_rotation', cubeAction.rotationAngle).catch(this.error);

    // Trigger the corresponding triggerdevice matching to the motion
    if (cubeAction.motion) {
      this.triggerFlow({
        id: `cube_${cubeAction.motion}`,
        tokens: cubeAction,
        state: cubeAction,
      })
        .then(() => this.debug(`Triggered cube${cubeAction.motion}TriggerDevice, cubeAction:`, cubeAction))
        .catch(err => this.error(`Error triggering cube${cubeAction.motion}TriggerDevice`, err));
    }

    // Trigger generic motion token trigger card
    this.triggerFlow({
      id: 'cube_Motion',
      tokens: {
        motion: cubeAction.motion,
        sourceFace: 0,
        targetFace: parseInt(cubeAction.targetFace),
      },
      state: null,
    })
    // this.cubeMotionTriggerDevice.trigger(this, {
    //  motion: cubeAction.motion,
    //  sourceFace: 0,
    //  targetFace: parseInt(cubeAction.targetFace),
    // })
      .then(() => this.debug('Triggered cubeMotionTriggerDevice'))
      .catch(err => this.error('Error triggering cubeMotionTriggerDevice', err));
  }

}

module.exports = AqaraCubeSensor;

/*
//	[ManagerDrivers] [cube] [0] ZigBeeDevice has been inited
// [ManagerDrivers] [cube] [0] ------------------------------------------
// [ManagerDrivers] [cube] [0] Node: b8b6da9e-7086-489b-b643-60282088ed6c
// [ManagerDrivers] [cube] [0] - Battery: false
// [ManagerDrivers] [cube] [0] - Endpoints: 0
// [ManagerDrivers] [cube] [0] -- Clusters:
// [ManagerDrivers] [cube] [0] --- zapp
// [ManagerDrivers] [cube] [0] --- genBasic
// [ManagerDrivers] [cube] [0] ---- cid : genBasic
// [ManagerDrivers] [cube] [0] ---- sid : attrs
// [ManagerDrivers] [cube] [0] ---- modelId : lumi.sensor_cube
// [ManagerDrivers] [cube] [0] --- genIdentify
// [ManagerDrivers] [cube] [0] ---- cid : genIdentify
// [ManagerDrivers] [cube] [0] ---- sid : attrs
// [ManagerDrivers] [cube] [0] --- genGroups
// [ManagerDrivers] [cube] [0] ---- cid : genGroups
// [ManagerDrivers] [cube] [0] ---- sid : attrs
// [ManagerDrivers] [cube] [0] --- genScenes
// [ManagerDrivers] [cube] [0] ---- cid : genScenes
// [ManagerDrivers] [cube] [0] ---- sid : attrs
// [ManagerDrivers] [cube] [0] --- genMultistateInput
// [ManagerDrivers] [cube] [0] ---- cid : genMultistateInput
// [ManagerDrivers] [cube] [0] ---- sid : attrs
// [ManagerDrivers] [cube] [0] --- genOta
// [ManagerDrivers] [cube] [0] ---- cid : genOta
// [ManagerDrivers] [cube] [0] ---- sid : attrs
// [ManagerDrivers] [cube] [0] - Endpoints: 1
// [ManagerDrivers] [cube] [0] -- Clusters:
// [ManagerDrivers] [cube] [0] --- zapp
// [ManagerDrivers] [cube] [0] --- genIdentify
// [ManagerDrivers] [cube] [0] ---- cid : genIdentify
// [ManagerDrivers] [cube] [0] ---- sid : attrs
// [ManagerDrivers] [cube] [0] --- genGroups
// [ManagerDrivers] [cube] [0] ---- cid : genGroups
// [ManagerDrivers] [cube] [0] ---- sid : attrs
// [ManagerDrivers] [cube] [0] --- genScenes
// [ManagerDrivers] [cube] [0] ---- cid : genScenes
// [ManagerDrivers] [cube] [0] ---- sid : attrs
// [ManagerDrivers] [cube] [0] --- genMultistateInput
// [ManagerDrivers] [cube] [0] ---- cid : genMultistateInput
// [ManagerDrivers] [cube] [0] ---- sid : attrs
// [ManagerDrivers] [cube] [0] - Endpoints: 2
// [ManagerDrivers] [cube] [0] -- Clusters:
// [ManagerDrivers] [cube] [0] --- zapp
// [ManagerDrivers] [cube] [0] --- genIdentify
// [ManagerDrivers] [cube] [0] ---- cid : genIdentify
// [ManagerDrivers] [cube] [0] ---- sid : attrs
// [ManagerDrivers] [cube] [0] --- genGroups
// [ManagerDrivers] [cube] [0] ---- cid : genGroups
// [ManagerDrivers] [cube] [0] ---- sid : attrs
// [ManagerDrivers] [cube] [0] --- genScenes
// [ManagerDrivers] [cube] [0] ---- cid : genScenes
// [ManagerDrivers] [cube] [0] ---- sid : attrs
// [ManagerDrivers] [cube] [0] --- genAnalogInput
// [ManagerDrivers] [cube] [0] ---- cid : genAnalogInput
// [ManagerDrivers] [cube] [0] ---- sid : attrs
// [ManagerDrivers] [cube] [0] ------------------------------------------
// [ManagerDrivers] [cube] [0] --- genBasic
// [ManagerDrivers] [cube] [0] ---- 65281 : !O (!�!�$!e�!�!.�!(�!
// [ManagerDrivers] [cube] [0] --- genAnalogInput
// [ManagerDrivers] [cube] [0] ---- 65285 : 500
// [ManagerDrivers] [cube] [0] ---- cid : genAnalogInput
// [ManagerDrivers] [cube] [0] ---- sid : attrs
// [ManagerDrivers] [cube] [0] ---- presentValue : 12.789998054504395
// [ManagerDrivers] [cube] [0] ------------------------------------------

{ '1': 3069,	=	battery
  '3': 20,
  '4': 17405,
  '5': 253,
  '6': 3,
  '10': 0,
  '253': 3 		= face side up
}
*/
