# <img alt="" src="docs/wait.png" height="50"> Kansas City trash pick-up day

A simple site using vanilla JS to fetch a user's location from the browser,
convert that into an address with [Geocodeapi](https://geocodeapi.io/), then use
Kansas City's open data APIs to fetch a parcel ID and, finally, use the parcel
ID to look up their property's trash pick-up day. It then checks for any
holidays in the current week and adjust the pick-up day accordingly (i.e., if
there is a holiday this week and it occurs _before_ their normal pick-up day,
their pick-up day gets shifted one day later). The user's location data is only
used for those API calls and is not stored or sent anywhere else.
