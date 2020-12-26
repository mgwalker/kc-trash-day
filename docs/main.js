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
  setBigText(
    `Based on your current location shown below, your normal trash pick-up day is <strong>${trashDay}</strong>`
  );
  setMap(latitude, longitude);
};

document.addEventListener("DOMContentLoaded", () => {
  if (window.GEOCODE_API_KEY) {
    getTrashDay();
  } else {
    setBigText("This site is misconfigured. 😢");
  }
});
