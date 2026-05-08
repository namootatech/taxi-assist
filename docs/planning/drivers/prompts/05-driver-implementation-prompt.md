Build the complete Trip Lifecycle and Live Map module for the Taxi Assist Driver App (the most critical part).

Create features/trip/ with:

1. Models: Trip, TripStatus enum, LocationPoint

2. TripService with methods:
   - listenForRideRequests(driverId) → Realtime subscription
   - acceptTrip(tripId)
   - arrivedAtPickup(tripId)
   - startTrip(tripId)
   - endTrip(tripId, finalDistance, finalFare)
   - updateDriverLocation(tripId, lat, lng, speed)

3. Screens:
   - RideRequestScreen: Shows pickup, dropoff, fare, rider info + Accept/Decline buttons + Live mini-map
   - ActiveTripScreen: Main screen during trip with:
     - GoogleMap widget showing driver location (moving marker), route polyline, pickup/dropoff pins
     - Live ETA
     - Big action buttons: Arrived / Start Trip / End Trip (state-dependent)
     - Destination update alert banner
   - Use Geolocator for continuous location updates (foreground service on Android)
   - Deep link to Google Maps navigation on demand

4. Riverpod notifiers:
   - currentTripProvider
   - tripMapControllerProvider
   - locationStreamProvider

Implement strict state machine guards (prevent invalid transitions).
Location updates every 4 seconds when IN_PROGRESS.
Handle network drops gracefully (queue updates).

This prompt must produce production-ready, battery-aware live tracking.
