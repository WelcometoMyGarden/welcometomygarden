const oneHourSecs = () => 60 * 60;
const oneDaySecs = () => 24 * oneHourSecs();

const nowSecs = () => new Date().getTime() / 1000;
const oneMonthAgoSecs = () => nowSecs() - 31 * oneDaySecs();
const oneWeekAgoSecs = () => nowSecs() - 7 * oneDaySecs();
const oneYearAgoSecs = () => nowSecs() - 365 * oneDaySecs();

module.exports = {
  nowSecs,
  oneMonthAgoSecs,
  oneWeekAgoSecs,
  oneYearAgoSecs,
  oneDaySecs,
  oneHourSecs
};
