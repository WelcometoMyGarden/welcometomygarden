const { DateTime } = require('luxon');

const oneHourSecs = 60 * 60;
const oneDaySecs = 24 * oneHourSecs;

/**
 * The round hour on which this function started (Luxon dateTime)
 */
const lxHourStart = DateTime.now().startOf('hour');

const nowSecs = () => new Date().getTime() / 1000;
const oneMonthAgoSecs = () => nowSecs() - 31 * oneDaySecs;
const oneWeekAgoSecs = () => nowSecs() - 7 * oneDaySecs;
const oneYearAgoSecs = () => nowSecs() - 365 * oneDaySecs;

module.exports = {
  nowSecs,
  oneMonthAgoSecs,
  oneWeekAgoSecs,
  oneYearAgoSecs,
  oneDaySecs,
  oneHourSecs,
  lxHourStart
};
