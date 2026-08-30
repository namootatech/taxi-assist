/// Mirrors business-logic.md §2.1 (subset for future models).
enum DriverProfileStatus {
  pending,
  rejected,
  approved,
  suspended,
  deactivated,
}

enum DriverOnlineStatus { offline, online }

/// Parses DB/Supabase UPPER_SNAKE values; unknown → [fallback].
DriverProfileStatus parseProfileStatus(String? raw, {DriverProfileStatus fallback = DriverProfileStatus.pending}) {
  if (raw == null || raw.isEmpty) return fallback;
  switch (raw.toUpperCase()) {
    case 'PENDING':
      return DriverProfileStatus.pending;
    case 'REJECTED':
      return DriverProfileStatus.rejected;
    case 'APPROVED':
      return DriverProfileStatus.approved;
    case 'SUSPENDED':
      return DriverProfileStatus.suspended;
    case 'DEACTIVATED':
      return DriverProfileStatus.deactivated;
    default:
      return fallback;
  }
}

String profileStatusToApi(DriverProfileStatus s) => switch (s) {
      DriverProfileStatus.pending => 'PENDING',
      DriverProfileStatus.rejected => 'REJECTED',
      DriverProfileStatus.approved => 'APPROVED',
      DriverProfileStatus.suspended => 'SUSPENDED',
      DriverProfileStatus.deactivated => 'DEACTIVATED',
    };

DriverOnlineStatus parseOnlineStatus(String? raw, {DriverOnlineStatus fallback = DriverOnlineStatus.offline}) {
  if (raw == null || raw.isEmpty) return fallback;
  switch (raw.toUpperCase()) {
    case 'ONLINE':
      return DriverOnlineStatus.online;
    case 'OFFLINE':
      return DriverOnlineStatus.offline;
    default:
      return fallback;
  }
}

String onlineStatusToApi(DriverOnlineStatus s) =>
    s == DriverOnlineStatus.online ? 'ONLINE' : 'OFFLINE';

/// Vehicle category (PRD / business-logic §2.2).
enum VehicleCategory { hatchback, tuktuk, sedan, luxury, van }

String vehicleCategoryToApi(VehicleCategory c) => switch (c) {
      VehicleCategory.hatchback => 'HATCHBACK',
      VehicleCategory.tuktuk => 'TUKTUK',
      VehicleCategory.sedan => 'SEDAN',
      VehicleCategory.luxury => 'LUXURY',
      VehicleCategory.van => 'VAN',
    };

String vehicleCategoryLabel(VehicleCategory c) => switch (c) {
      VehicleCategory.hatchback => 'Hatchback',
      VehicleCategory.tuktuk => 'Tuk-tuk',
      VehicleCategory.sedan => 'Sedan',
      VehicleCategory.luxury => 'Premium',
      VehicleCategory.van => 'Van',
    };

VehicleCategory parseVehicleCategory(String? raw,
    {VehicleCategory fallback = VehicleCategory.sedan}) {
  if (raw == null || raw.isEmpty) return fallback;
  switch (raw.toUpperCase()) {
    case 'HATCHBACK':
      return VehicleCategory.hatchback;
    case 'TUKTUK':
      return VehicleCategory.tuktuk;
    case 'SEDAN':
      return VehicleCategory.sedan;
    case 'LUXURY':
      return VehicleCategory.luxury;
    case 'VAN':
      return VehicleCategory.van;
    default:
      return fallback;
  }
}
