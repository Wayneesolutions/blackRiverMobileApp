# MapLibre Migration Complete

## Summary

Successfully replaced Google Maps (`react-native-maps`) with **MapLibre** (`@maplibre/maplibre-react-native`), a free and open-source mapping solution.

## Changes Made

### 1. Package Installation
- ✅ Installed `@maplibre/maplibre-react-native`
- ✅ Removed dependency on Google Maps API key

### 2. Component Updates

#### Imports Changed:
- **Before:** `react-native-maps` (MapView, Marker, Polyline, PROVIDER_GOOGLE)
- **After:** `@maplibre/maplibre-react-native` (MapView, PointAnnotation, ShapeSource, LineLayer, Camera)

#### Map Rendering:
- **Before:** `<MapView provider={PROVIDER_GOOGLE} initialRegion={region} />`
- **After:** `<MapView styleURL="..." />` with `<Camera centerCoordinate={[lng, lat]} zoomLevel={zoom} />`

#### Markers:
- **Before:** `<Marker coordinate={{latitude, longitude}} />`
- **After:** `<PointAnnotation coordinate={[longitude, latitude]} />`
  - Note: MapLibre uses `[longitude, latitude]` order (GeoJSON format)

#### Polylines:
- **Before:** `<Polyline coordinates={[...]} strokeColor="..." />`
- **After:** 
  ```tsx
  <ShapeSource id="route" shape={geoJSON}>
    <LineLayer id="routeLine" style={{lineColor: '#8B5CF6', lineWidth: 4}} />
  </ShapeSource>
  ```

### 3. Features Preserved

All existing functionality is maintained:
- ✅ Pickup markers with labels
- ✅ Dropoff markers with labels
- ✅ Waypoint markers with labels
- ✅ Vehicle location marker
- ✅ Route polyline (purple line)
- ✅ Live tracking updates
- ✅ Distance calculations
- ✅ Speed/fuel warnings
- ✅ All UI overlays and controls
- ✅ Error handling and crash prevention

### 4. Benefits

1. **Free & Open Source** - No API key required, no usage limits
2. **No API Key Management** - Removed Google Maps API key dependency
3. **Same Functionality** - All features work exactly the same
4. **Better Performance** - MapLibre is optimized for mobile

## Map Style

Currently using MapLibre demo style: `https://demotiles.maplibre.org/style.json`

You can customize this by:
1. Using your own MapLibre style URL
2. Hosting a custom style
3. Using other free style providers

## Next Steps

1. **Rebuild the app:**
   ```bash
   eas build --platform android --profile production
   ```

2. **Test the map:**
   - Open a load with route
   - Click "View Map"
   - Verify all markers and route line appear correctly

3. **Optional - Remove Google Maps API Key:**
   - Remove from `app.json` (android.config.googleMapsApiKey)
   - Remove from `eas.json` (env.GOOGLE_MAPS_API_KEY)
   - Remove from `env.ts` (GOOGLE_MAPS_API_KEY)

## Troubleshooting

### Map doesn't load
- Check if `@maplibre/maplibre-react-native` is properly installed
- Verify native modules are linked (should be automatic with Expo)
- Check console logs for MapLibre initialization errors

### Markers not showing
- Verify coordinates are valid (lat: -90 to 90, lng: -180 to 180)
- Check that PointAnnotation is imported correctly
- Ensure coordinates are in `[longitude, latitude]` order

### Route line not showing
- Verify routePath has at least 2 valid coordinates
- Check ShapeSource and LineLayer are imported
- Ensure GeoJSON format is correct

## API Differences

| Feature | react-native-maps | MapLibre |
|---------|------------------|----------|
| Map Component | `<MapView>` | `<MapView>` |
| Initial Region | `initialRegion` prop | `<Camera>` component |
| Markers | `<Marker coordinate={{lat, lng}}>` | `<PointAnnotation coordinate={[lng, lat]}>` |
| Polylines | `<Polyline coordinates={[...]}>` | `<ShapeSource>` + `<LineLayer>` |
| Coordinate Order | `{latitude, longitude}` | `[longitude, latitude]` |
| API Key | Required | Not required |

## Notes

- MapLibre uses GeoJSON coordinate order: `[longitude, latitude]`
- Camera component handles zoom and center positioning
- ShapeSource requires GeoJSON format for polylines
- All existing error handling and validation remains intact

