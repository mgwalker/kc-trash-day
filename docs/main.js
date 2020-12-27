const bounds = {
  north: 39.37,
  south: 38.82,
  east: -94.37,
  west: -94.77,
};

const setBigText = (text) => {
  document.getElementById("trash-day").innerHTML = text;
};

const setMap = (latitude, longitude) => {
  const map = document.getElementById("map");
  // map size is 0.001 e/w by 0.00075 n/s
  const e = longitude + 0.0005;
  const w = longitude - 0.0005;
  const n = latitude + 0.000375;
  const s = latitude - 0.000375;

  map.setAttribute(
    "src",
    `https://www.openstreetmap.org/export/embed.html?bbox=${w}%2C${s}%2C${e}%2C${n}&layer=mapnik&marker=${latitude},${longitude}`
  );
  map.style.display = "";
};

const geocode = async (latitude, longitude) => {
  const url = `https://app.geocodeapi.io/api/v1/reverse?point.lat=${latitude}&point.lon=${longitude}&apikey=${GEOCODE_API_KEY}`;
  const response = await fetch(url);

  const data = await response.json();
  if (data.features.length > 0) {
    return data.features[0].properties.name;
  }
  return null;
};

const getHolidayForThisWeek = () => {
  const oneDay = 24 * 60 * 60 * 1000;
  const holidays = new Map();

  const dateStr = (date) =>
    `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

  const getNthDayOf = (n, day, month, year) => {
    const firstOfMonth = new Date(Date.parse(`${month}/1/${year}`));

    let dayOffset = firstOfMonth.getDay() - day;
    if (dayOffset > 0) {
      dayOffset = 7 - dayOffset;
    } else {
      dayOffset = -dayOffset;
    }
    const initialDay = firstOfMonth.getDate() + dayOffset;

    const finalDay = initialDay + 7 * (n - 1);
    return dateStr(new Date(Date.parse(`${month}/${finalDay}/${year}`)));
  };

  const getLaborDay = (year) => {
    const lastOfMay = new Date(new Date(year, 5, 1).getTime() - oneDay);

    const day = lastOfMay.getDay();
    console.log(day);

    if (day === 1) {
      return dateStr(lastOfMay);
    } else if (day > 1) {
      return dateStr(new Date(lastOfMay.getTime() - oneDay * (day - 1)));
    } else {
      return dateStr(new Date(lastOfMay.getTime() - oneDay * (7 + day - 1)));
    }
  };

  const getHolidayFromSunday = (sunday) => {
    const days = [0, 1, 2, 3, 4, 5, 6].map((day) =>
      dateStr(new Date(sunday.getTime() + day * oneDay))
    );
    const index = days.findIndex((date) => holidays.has(date));

    if (index >= 0) {
      return {
        date: days[index],
        day: index,
        holiday: holidays.get(days[index]),
      };
    }

    return false;
  };

  const now = new Date();
  const thisYear = now.getFullYear();

  [thisYear, thisYear + 1].forEach((year) => {
    holidays.set(`${year}-1-1`, "New Year's Day");

    // Martin Luther King, Jr. Day: 3rd Monday of January
    holidays.set(getNthDayOf(3, 1, 1, year), "Martin Luther King, Jr. Day");

    // Presidents Day (also Washington's Birthday): 3rd Monday of February
    holidays.set(getNthDayOf(3, 1, 2, year), "Presidents Day");

    // Memorial Day: Last Monday of May
    holidays.set(getLaborDay(year), "Memorial Day");

    holidays.set(`${year}-7-4`, "Independence Day");

    // Labor Day: First Monday of September
    holidays.set(getNthDayOf(1, 1, 9, year), "Labor Day");

    holidays.set(`${year}-11-11`, "Veterans Day");

    // Thanksgiving Day: Fourth Thursday of November
    holidays.set(getNthDayOf(4, 4, 11, year), "Thanksgiving Day");

    holidays.set(`${year}-12-25`, "Christmas");
  });

  const sunday = new Date(now.getTime() - now.getDay() * oneDay);
  console.log(holidays);

  return getHolidayFromSunday(sunday);
};

const getLocation = async () =>
  new Promise((resolve) => {
    const g = navigator.geolocation;

    g.getCurrentPosition(async ({ coords: { latitude, longitude } }) => {
      resolve({ latitude, longitude });
    });
  });

const getParcelData = async (parcelID) => {
  const url = `https://maps5.kcmo.org/kcgis/rest/services/ParcelGeocodes/MapServer/1/query?f=JSON&outFields=TRASHDAY&where=KIVA_PIN='${parcelID}'`;
  const response = await fetch(url);

  const json = await response.json();
  if (json.features.length > 0) {
    return { trashDay: json.features[0].attributes.TRASHDAY };
  }
  return null;
};

const getParcelID = async (address) => {
  const url = `http://maps5.kcmo.org/kcgis/rest/services/DataLayers/MapServer/39/query?f=JSON&outFields=PIN&where=ADDRESS LIKE '${address.toUpperCase()}'`;
  const response = await fetch(url);

  const json = await response.json();
  if (json.features.length > 0) {
    return json.features[0].attributes.PIN;
  }
  return null;
};

const getTrashDay = async () => {
  const { latitude, longitude } = await getLocation();

  if (
    latitude > bounds.north ||
    latitude < bounds.south ||
    longitude > bounds.east ||
    longitude < bounds.west
  ) {
    setBigText("Your location is not in Kansas City");
    return;
  }
  const address = await geocode(latitude, longitude);

  if (!address) {
    setBigText("Could not find your address");
    return;
  }

  const parcelID = await getParcelID(address);

  const { trashDay } = await getParcelData(parcelID);
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const day = days.findIndex((d) => d === trashDay);

  const holiday = getHolidayForThisWeek();
  if (holiday) {
    if (holiday.day <= day) {
      setBigText(
        `Based on your current location shown below, your holiday trash pick-up day is <strong>${
          days[day + 1]
        }</strong> due to ${holiday.holiday}.`
      );
    } else {
      setBigText(
        `Based on your current location shown below, your holiday trash pick-up day is <strong>${trashDay}</strong> because ${holiday.holiday} is later in the week.`
      );
    }
  } else {
    setBigText(
      `Based on your current location shown below, your normal trash pick-up day is <strong>${trashDay}</strong>.`
    );
  }
  setMap(latitude, longitude);
};

document.addEventListener("DOMContentLoaded", () => {
  if (window.GEOCODE_API_KEY) {
    getTrashDay();
  } else {
    setBigText("This site is misconfigured. 😢");
  }
});
