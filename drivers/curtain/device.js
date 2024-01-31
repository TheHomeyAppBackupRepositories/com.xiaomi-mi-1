'use strict';

const commandMap = {
  up: 'upOpen',
  idle: 'stop',
  down: 'downClose',
};

// up: = upOpen = genAnalogOutput-presentValue / closuresWindowCovering-currentPositionLiftPercentage 100
// idle: = stop = genAnalogOutput-presentValue / closuresWindowCovering-currentPositionLiftPercentage ...
// down: = downClose = genAnalogOutput-presentValue / closuresWindowCovering-currentPositionLiftPercentage 0

const Homey = require('homey');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');

const XiaomiBasicCluster = require('../../lib/XiaomiBasicCluster');

Cluster.addCluster(XiaomiBasicCluster);
// Cluster.discoverAttributes();

class AqaraCurtain extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // enable debugging
    // this.enableDebug();

    // Enables debug logging in zigbee-clusters
    // debug(true);

    // print the node's info to the console
    // this.printNode();

    // Migrate to new curtains class & remove dim capability
    if (this.getClass() === 'windowcoverings') {
      this.log('Setting device class to curtain');
      this.setClass('curtain');
    }

    if (this.hasCapability('dim')) {
      this.log('Removing capability dim');
      this.removeCapability('dim').catch(this.error);
    }

    // try {
    //  const { xiaomiCurtain } = await zclNode.endpoints[this.getClusterEndpoint(XiaomiBasicCluster)].clusters[XiaomiBasicCluster.NAME].readAttributes('xiaomiCurtain');
    //  this.log('READattributes XiaomiCurtain', xiaomiCurtain, xiaomiCurtain[1], xiaomiCurtain[3], xiaomiCurtain[5]);
    // await this.setSettings({ external_switch_type: switchType, save_state: powerOffMemory });
    // } catch (err) {
    //  this.log('could not read Attribute XiaomiBasicCluster:', err);
    // }

    // this.log('CLASS:', this.getClass(), this.getClass() === 'windowcoverings');

    // this.log('READ:', await zclNode.endpoints[1].clusters[XiaomiBasicCluster.NAME].readAttributes('XiaomiCurtain'));

    // this.log('DISCO:', BasicCluster.discoverAttributes());

    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: 1,
      });
    }

    if (this.hasCapability('windowcoverings_state')) {
      this.registerCapability('windowcoverings_state', CLUSTER.WINDOW_COVERING, {
        endpoint: 1,
      });
    }

    if (this.hasCapability('windowcoverings_set')) {
      // Set Position

      this.registerCapabilityListener('windowcoverings_set', async value => {
        this.log('go to lift percentage', (1 - value) * 100);
        await zclNode.endpoints[1].clusters[CLUSTER.WINDOW_COVERING.NAME].goToLiftPercentage({
          percentageLiftValue: (1 - value) * 100,
        }, {
          // This is a workaround for the fact that this device does not repsonds with a default
          // response even though the ZCL command `goToLiftPercentage` demands that.
          waitForResponse: false,
        });
      });

      /*
      this.registerCapability('windowcoverings_set', CLUSTER.WINDOW_COVERING, {
        get: 'currentPositionLiftPercentage',
        getOpts: {
          getOnStart: true,
        },
        set: 'goToLiftPercentage',
        setParser(value) {
          return {
            percentageLiftValue: (1 - value) * 100,
          };
        },
        report: 'currentPositionLiftPercentage',
        reportParser(value) {
          return 1 - (value / 100);
        },
        endpoint: 1,
      });
      */

      // Get Position
      zclNode.endpoints[1].clusters[CLUSTER.ANALOG_OUTPUT.NAME]
        .on('attr.presentValue', this.onCurtainPositionAttrReport.bind(this));

      // Get Position
      zclNode.endpoints[1].clusters[CLUSTER.WINDOW_COVERING.NAME]
        .on('attr.currentPositionLiftPercentage', this.onCurtainPositionAttrReport.bind(this));
    }

    // Register the AttributeReportListener - Lifeline
    zclNode.endpoints[1].clusters[XiaomiBasicCluster.NAME]
      .on('attr.xiaomiLifeline', this.onXiaomiLifelineAttributeReport.bind(this));
  }

  onCurtainPositionAttrReport(data) {
    this.log('onCurtainPositionAttrReport (curtain position):', data, 1 - (data / 100));
    clearTimeout(this.curtainTernaryTimeout);
    this.setCapabilityValue('windowcoverings_set', 1 - (data / 100)).catch(this.error);

    // update onOff capability
    if (this.getCapabilityValue('onoff') !== data > 0) {
      this.setCapabilityValue('onoff', data > 0).catch(this.error);
    }
    // update Ternary buttons
    this.curtainTernaryTimeout = setTimeout(() => {
      this.setCapabilityValue('windowcoverings_state', 'idle').catch(this.error);
    }, 3000);
  }

  /**
   * This is Xiaomi's custom lifeline attribute, it contains a lot of data, af which the most
   * interesting the battery level. The battery level divided by 1000 represents the battery
   * voltage. If the battery voltage drops below 2600 (2.6V) we assume it is almost empty, based
   * on the battery voltage curve of a CR1632.
   * @param {{batteryLevel: number}} lifeline
   */
  onXiaomiLifelineAttributeReport({
    state,
  } = {}) {
    this.log('lifeline attribute report', {
      state,
    });

    if (typeof state === 'number') {
      const parsedDim = 1 - (state / 100);
      this.log('lifeline - curtain position', parsedDim);
      this.setCapabilityValue('dim', parsedDim).catch(this.error);
      this.setCapabilityValue('onoff', parsedDim === 1).catch(this.error);
    }
  }

}

module.exports = AqaraCurtain;

/*
Product type no: ZNCLDJ11LM)
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ------------------------------------------
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] Node: 9cff46eb-2a17-4b37-942a-f3550817e42f
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] - Battery: false
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] - Endpoints: 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] -- Clusters:
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] --- zapp
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] --- genBasic
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- 65281 : (!
                                                                        d !	'	!
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- cid : genBasic
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- sid : attrs
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- zclVersion : 1
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- appVersion : 9
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- stackVersion : 2
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- hwVersion : 17
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- manufacturerName : LUMI
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- modelId : lumi.curtain
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- dateCode : 04-13-2017
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- powerSource : 1
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] --- genPowerCfg
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- cid : genPowerCfg
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- sid : attrs
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- mainsVoltage : 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- mainsAlarmMask : 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] --- genIdentify
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- cid : genIdentify
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- sid : attrs
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- identifyTime : 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] --- genGroups
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- cid : genGroups
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- sid : attrs
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- nameSupport : 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] --- genScenes
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- cid : genScenes
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- sid : attrs
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- count : 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- currentScene : 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- currentGroup : 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- sceneValid : 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- nameSupport : 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- lastCfgBy : 0xffffffffffffffff
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] --- genOnOff
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- cid : genOnOff
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- sid : attrs
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- onOff : 1
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] --- genTime
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- cid : genTime
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- sid : attrs
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] --- genAnalogOutput
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- 61440 : 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- cid : genAnalogOutput
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- sid : attrs
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- maxPresentValue : 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- minPresentValue : 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- outOfService : 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- presentValue : 100
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- statusFlags : 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] --- genMultistateOutput
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- cid : genMultistateOutput
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- sid : attrs
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- numberOfStates : 6
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- outOfService : 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- presentValue : 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- statusFlags : 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] --- genOta
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- cid : genOta
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- sid : attrs
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] --- closuresWindowCovering
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- 19 : 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- cid : closuresWindowCovering
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- sid : attrs
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- windowCoveringType : 4
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- configStatus : 123
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- currentPositionLiftPercentage : 255
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- installedOpenLimitLiftCm : 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- installedClosedLimitLiftCm : 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- installedOpenLimitTiltDdegree : 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- windowCoveringMode : 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] --- msOccupancySensing
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- cid : msOccupancySensing
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- sid : attrs
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- occupancy : 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ---- occupancySensorType : 0
2018-05-21 11:25:46 [log] [ManagerDrivers] [curtain] [0] ------------------------------------------

2018-03-04 16:56:10 [log] [ManagerDrivers] [curtain] [0] lifeline report <Buffer 03 28 1e 05 21 06 00 64 20 fd 08 21 09 11 07 27 00 00 00 00 00 00 00 00 09 21 00 01>

Changing settings of Curtain controller
Cluster: 	genBasic (0x0000)
Attribute: Unknown (0x0401)
Values
	Manual open/close	Direction	Operation			HEX stream
A	Enabled						Positive	Clear Stroke	0001 0000 0000 00
B	Disabled					Positive	Clear Stroke	0001 0000 0001 00
C	Enabled						Reverse		Clear Stroke	0001 0001 0000 00
D	Disabled					Reverse		Clear Stroke	0001 0001 0001 00
E	Enabled						Positive	Normal				0008 0000 0000 00
F	Disabled					Positive	Normal				0008 0000 0001 00
G	Enabled						Reverse		Normal				0008 0001 0000 00
H	Disabled					Reverse		Normal				0008 0001 0001 00

07 00 01 00 00 00 00 00
07 00 08 00 00 00 01 00
07 00 08 00 00 00 01 00
07 00 01 00 00 00 01 00
07 00 01 00 00 00 01 00
07 00 08 00 00 00 00 00
07 00 02 00 01 00 00 00

*/
