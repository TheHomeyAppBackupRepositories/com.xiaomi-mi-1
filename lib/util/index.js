'use strict';

function parseData(rawData) {
  const data = {};
  let index = 0;
  while (index < rawData.length - 2) {
    const type = rawData.readUInt8(index + 1);
    const byteLength = (type & 0x7) + 1;
    const isSigned = Boolean((type >> 3) & 1);
    try {
      data[rawData.readUInt8(index)] = rawData[isSigned ? 'readIntLE' : 'readUIntLE'](index + 2, byteLength);
    } catch (err) {
      this.error('Could not parse the LifelineReport for index:', index, 'with error:', err);
      break;
    }
    index += byteLength + 2;
  }
  return data;
}

function toPercentage(value, min, max) {
  if (value > max) {
    value = max;
  } else if (value < min) {
    value = min;
  }

  const normalised = (value - min) / (max - min);
  return Math.round(normalised * 100);
}

function calculateBatteryPercentage(voltage, option) {
  let percentage = null;
  if (option === '3V_2100') {
    if (voltage < 2100) {
      percentage = 0;
    } else if (voltage < 2440) {
      percentage = 6 - ((2440 - voltage) * 6) / 340;
    } else if (voltage < 2740) {
      percentage = 18 - ((2740 - voltage) * 12) / 300;
    } else if (voltage < 2900) {
      percentage = 42 - ((2900 - voltage) * 24) / 160;
    } else if (voltage < 3000) {
      percentage = 100 - ((3000 - voltage) * 58) / 100;
    } else if (voltage >= 3000) {
      percentage = 100;
    }
    percentage = Math.round(percentage);
  } else if (option === '3V_2500') {
    percentage = toPercentage(voltage, 2500, 3000);
  } else if (option === '3V_2500_3200') {
    percentage = toPercentage(voltage, 2500, 3200);
  } else if (option === '3V_1500_2800') {
    percentage = 235 - 370000 / (voltage + 1);
    if (percentage > 100) {
      percentage = 100;
    } else if (percentage < 0) {
      percentage = 0;
    }
    percentage = Math.round(percentage);
  } else if (option === '3V_2850_3000') {
    percentage = toPercentage(voltage, 2850, 3000);
  } else if (option === '4LR6AA1_5v') {
    percentage = toPercentage(voltage, 3000, 4200);
  } else if (option === '3V_add 1V') {
    voltage += 1000;
    percentage = toPercentage(voltage, 3200, 4200);
  } else if (option === 'Add_1V_42V_CSM300z2v2') {
    voltage += 1000;
    percentage = toPercentage(voltage, 2900, 4100);
  } else {
    throw new Error(`Not batteryVoltageToPercentage type supported: ${option}`);
  }

  return percentage;
}

module.exports = {
  parseData, calculateBatteryPercentage,
};
