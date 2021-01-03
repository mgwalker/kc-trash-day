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

const getParcelID = async ({
  address = false,
  latitude = false,
  longitude = false,
} = {}) => {
  const params = ["f=JSON", "outFields=PIN"];

  if (latitude !== false && longitude !== false) {
    params.push(
      `geometry=${longitude},${latitude}`,
      "geometryType=esriGeometryPoint",
      "inSR=4326", // SRID for WGS 84
      "units=esriSRUnit_Meter",
      "distance=50" // Find all parcels within 50 meters of the location. Parcels
      // in this layer are defined as points, not as polygons, so the odds of
      // getting one exactly right are practically zero.
    );
  } else {
    params.push(`where=ADDRESS LIKE '${address}'`);
  }

  const url = `https://maps5.kcmo.org/kcgis/rest/services/DataLayers/MapServer/39/query?${params.join(
    "&"
  )}`;
  const response = await fetch(url);

  const json = await response.json();
  if (json.features.length > 0) {
    // Just grab the first one. If we're using browser geolocation, we can't
    // really know which one the user is in, and in the majority of cases, every
    // parcel within 50m of a given point should have the same trash day. Not
    // universal, of course, but... here we are. And if we're using an address
    // search, there's just one result anyway.
    return json.features[0].attributes.PIN;
  }
  return null;
};

const getTrashDayForParcelID = async (parcelID) => {
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
      return `your holiday trash pick-up day is <strong>${
        days[day + 1]
      }</strong> due to ${holiday.holiday}`;
    } else {
      return `your holiday trash pick-up day is <strong>${trashDay}</strong> because ${holiday.holiday} is later in the week`;
    }
  } else {
    return `your normal trash pick-up day is <strong>${trashDay}</strong>`;
  }
};

const setupUI = () => {
  document.getElementById("trash-day").style.display = "";
  document.getElementById("form").style.display = "none";
};

const getTrashDayWithAddress = async (e) => {
  e.preventDefault();
  setupUI();

  const address = document
    .getElementById("address")
    .value.toUpperCase()
    .replace(/#\d+/, "")
    .replace(/[^0-9A-Z\s]/g, "")
    .replace("AVENUE", "AVE")
    .replace("LANE", "LN")
    .replace("PARKWAY", "PKWAY")
    .replace("ROAD", "RD")
    .replace("STREET", "ST")
    .replace("TERRACE", "TER")
    .replace("THE PASEO", "PASEO")
    .replace(/\bKANSAS CITY\b/, "")
    .replace(/\bKC\b/, "")
    .replace(/\bMISSOURI\b/, "")
    .replace(/\bMO\b/, "")
    .replace(/APARTMENT \S+/, "")
    .replace(/APT \S+/, "")
    .replace(/UNIT \S+/, "")
    .trim();

  const parcelID = await getParcelID({ address });

  if (parcelID === null) {
    setBigText(
      "Hmm. Couldn't find that address. Try using just the street address, no apartment number and no city or state."
    );
    document.getElementById("form").style.display = "";
  } else {
    const trashDay = await getTrashDayForParcelID(parcelID);
    setBigText(
      `For ${address
        .split(" ")
        .map((word) => word.toLowerCase())
        .map((word) =>
          word.replace(
            /^(.)(.*)/,
            (_, first, rest) => `${first.toUpperCase()}${rest}`
          )
        )
        .join(" ")}, ${trashDay}.`
    );
  }
};

const getTrashDayWithLocation = async () => {
  setupUI();
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

  const parcelID = await getParcelID({ latitude, longitude });

  const trashDay = await getTrashDayForParcelID(parcelID);
  setBigText(`Based on your current location shown below, ${trashDay}.`);
  setMap(latitude, longitude);
};

document.addEventListener("DOMContentLoaded", () => {
  const locationButton = document.getElementById("useLocation");
  locationButton.addEventListener("click", getTrashDayWithLocation);

  const form = document.querySelector("form");
  form.addEventListener("submit", getTrashDayWithAddress);
});
