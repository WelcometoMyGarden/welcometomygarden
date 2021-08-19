export default (timestamp) => {
  const currentDate = new Date();
  const date = new Date(timestamp);
  if (date.getFullYear() !== currentDate.getFullYear()) {
    return date.toLocaleString([], {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }); //20 Aug 2020, 09:03
  } // different years
  else if (
    new Date(currentDate.toDateString()).getTime() - new Date(date.toDateString()).getTime() >
    7 * 24 * 60 * 60 * 1000
  ) {
    return date.toLocaleString([], {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    }); //5 August, 10:08
  } // same year, not within the last week
  else if (date.getDate() !== currentDate.getDate()) {
    return date.toLocaleString([], { weekday: 'long', hour: '2-digit', minute: '2-digit' }); //Tuesday 15:00
  } // same year, same month but within the last 7 days
  else {
    return date.toLocaleString([], { hour: '2-digit', minute: '2-digit' }); //10:28
  } // same day
};
