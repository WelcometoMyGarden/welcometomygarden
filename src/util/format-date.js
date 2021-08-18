export default (timestamp) => {
  const currentDate = new Date();
  const date = new Date(timestamp);
  if (date.getFullYear() !== currentDate.getFullYear()) {
    return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); //20 Aug 2020, 15:03
  } // different years
  else if (currentDate.getTime() - date.getTime() > 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleString([], {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }); //20 Aug, 15:03
  } // same year, not within the last week
  else if (date.getDay() !== currentDate.getDay()) {
    return date.toLocaleString([], { weekday: 'long', hour: '2-digit', minute: '2-digit' }); //Tuesday 15:00
  } // same year, same month but within the last 7 days
  else {
    return date.toLocaleString([], { timeStyle: 'short' }); //10:28
  } // same day
};
