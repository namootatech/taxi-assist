enum TripStatus {
  requested,
  enRoutePickup,
  arrivedPickup,
  inProgress,
  completed,
  cancelled,
  noShow,
  unknown,
}

TripStatus parseTripStatus(String? raw) {
  switch ((raw ?? '').toUpperCase()) {
    case 'REQUESTED':
      return TripStatus.requested;
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
      return TripStatus.unknown;
  }
}

String tripStatusLabel(TripStatus status) {
  return switch (status) {
    TripStatus.requested => 'Finding driver',
    TripStatus.enRoutePickup => 'Driver en route',
    TripStatus.arrivedPickup => 'Driver arrived',
    TripStatus.inProgress => 'Trip in progress',
    TripStatus.completed => 'Completed',
    TripStatus.cancelled => 'Cancelled',
    TripStatus.noShow => 'No show',
    TripStatus.unknown => 'Unknown',
  };
}
