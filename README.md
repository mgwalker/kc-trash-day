# <img alt="" src="docs/wait.png" height="50"> Kansas City trash pick-up day

A simple site using vanilla JS to fetch a user's location from the browser,
convert that into an address with [Geocodeapi](https://geocodeapi.io/), then use
Kansas City's open data APIs to fetch a parcel ID and, finally, use the parcel
ID to look up their property's trash pick-up day. It then checks for any
holidays in the current week and adjust the pick-up day accordingly (i.e., if
there is a holiday this week and it occurs _before_ their normal pick-up day,
their pick-up day gets shifted one day later). The user's location data is only
used for those API calls and is not stored or sent anywhere else.

In order to run, the website needs a Geocodeapi API key defined at
`window.GEOCODE_API_KEY`. For convenience, the site attempts to load `env.js`
which is a good place to put your API key since it is git-ignored from the repo.
Your `env.js` might look something like this:

```javascript
window.GEOCODE_API_KEY = "YOUR GEOCODE API KEY HERE";
```

If `window.GEOCODE_API_KEY` is undefiend or otherwise falsey, the site will show
a frowny-faced message saying that it is misconfigured. That seemed like a
reasonable message to me, since there's only one thing to configure.

Since the whole thing runs browser-side, there isn't really a safe place to
store the API key, so there's not a live version of this site anywhere. 🤷🏼‍♂️
