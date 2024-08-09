'use strict';

const moment = require('moment-timezone');

const timeDiffSeconds = 946684800;

function localTimeToUTC(dateNow, homey) {
  const timezone = homey.clock.getTimezone();
  const date1970Milliseconds = dateNow + moment.tz(timezone).utcOffset()
    * 60 * 1000;
  const UTCTime = Math.floor(
    date1970Milliseconds / 1000 - timeDiffSeconds,
  );
  // console.log('will set time ', date, date2000Seconds, timezone, moment.tz(timezone).utcOffset());
  return UTCTime;
}

function setTime() {
  const timezone = this.homey.clock.getTimezone();
  const date1970Milliseconds = Date.now() + moment.tz(timezone).utcOffset()
    * 60 * 1000;
  const date2000Seconds = Math.floor(
    date1970Milliseconds / 1000 - timeDiffSeconds,
  );

  const date = new Date((date2000Seconds + timeDiffSeconds) * 1000);
  // const date2000Seconds2 = Math.floor(
  //  Date.now() / 1000 - timeDiffSeconds,
  // );
  // const date2 = new Date((date2000Seconds2 + timeDiffSeconds) * 1000);
  this.log('will set time ', date, date2000Seconds, timezone, moment.tz(timezone).utcOffset());
  /*
  await Util.wrapAsyncWithRetry(() => this.zclNode.endpoints[1].bindings[AqaraSpecificTimeCluster.NAME].clientWriteAttributes({

    time: 754005328,

  }), 3).then(() => {
    this.log('set time success');
    // this._setDateTimeByDate(date);
  }).catch(err => {
    this.log('set time error ', err);
  });
  */
  /*
  this._timeCluster.writeAttributes({

    time: date2000Seconds,

  }).then(() => {
    this.log('set time success');
    // this._setDateTimeByDate(date);
  }).catch(err => {
    this.log('set time error ', err);
  }); */
}

module.exports = {
  localTimeToUTC, setTime,
};
