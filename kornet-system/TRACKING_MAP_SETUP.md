# Logistics map setup

The internal map is available at **Operations → Live Logistics Map** (`/logistics/map`). It is separate from the customer tracking portal.

## Map layers and locations

- Light/dark vector basemaps use OpenFreeMap styles through MapLibre GL JS. The terrain switch overlays public Terrarium elevation tiles from AWS Open Data; attribution is displayed in the map.
- Airport reference points are selected from OurAirports’ public-domain airport CSV. OurAirports provides no accuracy warranty, so validate important facilities before operational use.
- The initial seaport markers are approximate port-area points from `tayljordan/ports`, derived from the 2019 NGA World Port Index. Their coordinates are rounded to 0.01 degrees, so they are not berth-level. The data license is included in `server/src/data/PORTS_DATA_LICENSE.txt`. Administrators/managers can save verified company-port coordinates from the map; these override the approximate reference.

## Live tracking

- Aircraft use the public ADSB.lol API. No API key is required by the current API documentation. Its API declares ODbL 1.0; retain source attribution and review ODbL obligations before redistribution. The screen describes aircraft only: position data does not establish cargo type or shipment association.
- Vessel positions use the OpenSeaFeed AIS WebSocket. Its current site describes free, key-optional live access within the free-tier area and a key for expanded access/history. A key is optional for the current live view. The service is **disabled by default**; enable only after reviewing the current service/data terms and confirming acceptable Philippine coverage:

  ```env
  OPENSEAFEED_ENABLED=true
  OPENSEAFEED_TERMS_APPROVED=true
  OPENSEAFEED_API_KEY=
  ```

- Live tracks are short, process-memory histories built only from positions actually received since the API process started; the map does not persist raw provider tracks. Feed availability and geographic coverage are not guaranteed.
- “Demo simulation” is a distinct mode. Its assets and paths are illustrative and are never substituted for failed live feeds.
- Shipment linking is an authorized, explicit user confirmation, not an inference from a route or a matching name.

## Customer location and financial layers

- Customer pins and financial values are restricted by the API to accounting, manager, administrator, or superadmin roles. The customer portal does not expose this data.
- The map groups posted invoices by bill-to party using the same current dashboard calculation (`totalAmount - vatAmount`). Collections count posted receipt applications; EWT is presented separately and is not counted as cash.
- Customer addresses are not sent to a third party by default. Geocoding is disabled unless an administrator reviews the provider’s privacy/data-processing and commercial terms and configures:

  ```env
  GEOAPIFY_TERMS_APPROVED=true
  GEOAPIFY_API_KEY=<server-side key>
  ```

  An authorized user must explicitly request a one-customer preview and accept the resulting point; preview candidates expire after five minutes. Never expose this key to the browser.
- When provider approval/key is absent, authorized users can maintain customer coordinates manually. Unmapped customers are listed without sending their address anywhere.

## Development and verification

After updating the Prisma schema, generate the client and apply additive schema changes to the target database using the project’s usual Prisma setup process. Then run:

```powershell
npm run build
npm run build:server
```

Do not run the database push against production without following the repository’s normal backup/release process. Live-provider errors are shown as source health; they do not trigger simulated success data.
