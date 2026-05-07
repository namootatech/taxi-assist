/// Matches `trips.status` CHECK + business-logic §3.2.
enum TripStatus {
  requested,
  accepted,
  enRoutePickup,
  arrivedPickup,
  inProgress,
  completed,
  cancelled,
  noShow,
}

TripStatus parseTripStatus(String? raw) {
  if (raw == null || raw.isEmpty) return TripStatus.requested;
  switch (raw.toUpperCase()) {
    case 'REQUESTED':
      return TripStatus.requested;
    case 'ACCEPTED':
      return TripStatus.accepted;
    case 'EN_ROUTE_PICKUP':
      return TripStatus.enRoutePickup;
    case 'ARRIVED_PICKUP':
      return TripStatus.arrivedPickup;
    case 'IN_PROGRESS':
      return TripStatus.inProgress;
    case 'COMPLETED':
      return TripStatus.completed;
    case 'CANCELLED':
      return TripStatus.cancelled;
    case 'NO_SHOW':
      return TripStatus.noShow;
    default:
      return TripStatus.requested;
  }
}

String tripStatusToApi(TripStatus s) => switch (s) {
      TripStatus.requested => 'REQUESTED',
      TripStatus.accepted => 'ACCEPTED',
      TripStatus.enRoutePickup => 'EN_ROUTE_PICKUP',
      TripStatus.arrivedPickup => 'ARRIVED_PICKUP',
      TripStatus.inProgress => 'IN_PROGRESS',
      TripStatus.completed => 'COMPLETED',
      TripStatus.cancelled => 'CANCELLED',
      TripStatus.noShow => 'NO_SHOW',
    };

bool isTerminalTripStatus(TripStatus s) =>
    s == TripStatus.completed || s == TripStatus.cancelled || s == TripStatus.noShow;

bool isActiveTripStatus(TripStatus s) => !isTerminalTripStatus(s);
