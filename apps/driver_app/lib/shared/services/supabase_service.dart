import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/supabase_client.dart';
import '../models/driver_profile.dart';

/// Facade for Supabase calls (RLS assumed on backend).
///
/// **Table `profiles`:** expected columns mirror [DriverProfile] JSON keys
/// (`id` UUID PK = `auth.users.id`, `full_name`, `id_number`, `dob`, `age`,
/// `sex`, `residential_address`, `license_*`, `pdp_*`, `cellphone`, `email`,
/// `bank_details` JSONB optional, `selfie_url`, `status` text, timestamps,
/// `online_status`, `current_vehicle_id`, `training_completed`, optional
/// `driver_id`, `registration_submitted` bool default false). Create this table +
/// policies in Supabase; see tech-spec.md.
///
/// **`vehicles` (operators):** `vehicle_id` uuid PK default `gen_random_uuid()`,
/// `owner_type`, `registration_number`, `colour`, `make`, `model`, `category`,
/// `vin`, `speedometer_reading`, `owner_details` / `company_details` jsonb,
/// `status` default `PENDING`, `linked_driver_id` uuid nullable FK to `profiles.id`.
///
/// **`documents`:** `document_id` uuid PK, `entity_type`, `entity_id`, `document_type`,
/// `file_path`, `status`, `uploaded_by`, optional `expiry_date`.
class SupabaseService {
  SupabaseClient get client => supabaseClient;

  GoTrueClient get auth => client.auth;

  static const _profilesTable = 'profiles';

  /// Allowed keys for [updateProfile] (snake_case server columns).
  static const _profileUpdateWhitelist = {
    'full_name',
    'id_number',
    'dob',
    'age',
    'sex',
    'residential_address',
    'license_number',
    'license_code',
    'pdp_number',
    'pdp_expiry',
    'cellphone',
    'email',
    'bank_details',
    'selfie_url',
    'training_completed',
    'registration_submitted',
    'status',
    'online_status',
    'current_vehicle_id',
  };

  static const vehiclesTable = 'vehicles';
  static const documentsTable = 'documents';
  static const supportTicketsTable = 'support_tickets';
  static const payoutsTable = 'payouts';

  /// Storage bucket names (tech-spec §2.4).
  static const bucketDriverDocuments = 'driver-documents';
  static const bucketVehiclePhotos = 'vehicle-photos';

  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) {
    return auth.signInWithPassword(email: email.trim(), password: password);
  }

  /// Registers auth user and inserts a minimal `profiles` row (client path).
  ///
  /// [profileData] should use snake_case keys: `full_name`, `cellphone`,
  /// `id_number`, `dob` (ISO date string), etc.
  Future<AuthResponse> signUp({
    required String email,
    required String password,
    Map<String, dynamic>? profileData,
  }) async {
    final response = await auth.signUp(
      email: email.trim(),
      password: password,
    );
    final user = response.user;
    if (user == null) {
      return response;
    }

    final row = <String, dynamic>{
      'id': user.id,
      'email': email.trim(),
      'status': 'PENDING',
      'online_status': 'OFFLINE',
      'training_completed': false,
      'registration_submitted': false,
      if (profileData != null) ...profileData,
    };

    await client.from(_profilesTable).upsert(row, onConflict: 'id');

    return response;
  }

  Future<void> signOut() => auth.signOut();

  Future<void> resetPasswordForEmail(String email) {
    return auth.resetPasswordForEmail(email.trim());
  }

  /// Returns null if no row (e.g. trigger-only projects still provisioning).
  Future<DriverProfile?> getCurrentDriverProfile() async {
    final userId = auth.currentUser?.id;
    if (userId == null) return null;

    final row = await client.from(_profilesTable).select().eq('id', userId).maybeSingle();

    if (row == null) return null;
    return DriverProfile.fromJson(Map<String, dynamic>.from(row));
  }

  Future<void> updateProfile(Map<String, dynamic> patch) async {
    final userId = auth.currentUser?.id;
    if (userId == null) {
      throw StateError('Not signed in');
    }
    final filtered = <String, dynamic>{};
    for (final e in patch.entries) {
      if (_profileUpdateWhitelist.contains(e.key)) {
        filtered[e.key] = e.value;
      }
    }
    if (filtered.isEmpty) return;

    await client.from(_profilesTable).update(filtered).eq('id', userId);
  }

  /// Inserts a vehicle row; returns the row including `vehicle_id` (PK).
  ///
  /// Expected columns include: `owner_type`, `registration_number`, `colour`,
  /// `make`, `model`, `category`, `vin`, `speedometer_reading`,
  /// `owner_details` or `company_details` JSONB, `status` = PENDING,
  /// optional `linked_driver_id`.
  Future<Map<String, dynamic>> insertVehicle(Map<String, dynamic> row) async {
    final inserted =
        await client.from(vehiclesTable).insert(row).select().single();
    return Map<String, dynamic>.from(inserted);
  }

  /// Go-online gate (Prompt 4): `{ ok: bool, reasons: List<String> }`.
  Future<Map<String, dynamic>> driverPrecheckGoOnline() async {
    final raw = await client.rpc('driver_precheck_go_online');
    return Map<String, dynamic>.from(raw as Map);
  }

  /// Completed trips today (UTC calendar day) for dashboard earnings strip.
  Future<TodayTripStats> fetchTodayTripStats() async {
    final userId = auth.currentUser?.id;
    if (userId == null) {
      return const TodayTripStats(completedCount: 0, totalFare: 0);
    }
    final now = DateTime.now().toUtc();
    final startUtc = DateTime.utc(now.year, now.month, now.day);
    final rows = await client
        .from('trips')
        .select('final_fare')
        .eq('driver_id', userId)
        .eq('status', 'COMPLETED')
        .gte('completed_at', startUtc.toIso8601String());
    final list = rows as List<dynamic>;
    var sum = 0.0;
    for (final r in list) {
      final m = Map<String, dynamic>.from(r as Map);
      final fare = m['final_fare'];
      if (fare is num) sum += fare.toDouble();
    }
    return TodayTripStats(completedCount: list.length, totalFare: sum);
  }

  /// Lists documents uploaded by current user (for waiting screen / summary).
  Future<List<Map<String, dynamic>>> listMyDocuments() async {
    final uid = auth.currentUser?.id;
    if (uid == null) return [];
    final rows =
        await client.from(documentsTable).select().eq('uploaded_by', uid);
    final list = rows as List<dynamic>;
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  /// Linked vehicle for profile (RLS: `linked_driver_id = auth.uid()`).
  Future<Map<String, dynamic>?> fetchVehicleById(String? vehicleId) async {
    if (vehicleId == null || vehicleId.isEmpty) return null;
    final row = await client
        .from(vehiclesTable)
        .select(
          'vehicle_id, make, model, registration_number, category, status, colour',
        )
        .eq('vehicle_id', vehicleId)
        .maybeSingle();
    if (row == null) return null;
    return Map<String, dynamic>.from(row);
  }

  /// Vehicle captured during onboarding (the one linked to this driver profile).
  ///
  /// Used to self-heal cases where the backend approved the profile but
  /// `profiles.current_vehicle_id` is missing.
  Future<Map<String, dynamic>?> fetchMyLinkedVehicle() async {
    final uid = auth.currentUser?.id;
    if (uid == null) return null;
    final row = await client
        .from(vehiclesTable)
        .select(
          'vehicle_id, make, model, registration_number, category, status, colour',
        )
        .eq('linked_driver_id', uid)
        .order('created_at', ascending: false)
        .maybeSingle();
    if (row == null) return null;
    return Map<String, dynamic>.from(row);
  }

  /// Completed trips for earnings (newest first). [driver_rating] is the rider’s star rating of the driver.
  Future<List<Map<String, dynamic>>> fetchCompletedTripsForDriver({
    int limit = 200,
  }) async {
    final uid = auth.currentUser?.id;
    if (uid == null) return [];
    final rows = await client
        .from('trips')
        .select(
          'trip_id, completed_at, final_fare, driver_rating, rider_display_name',
        )
        .eq('driver_id', uid)
        .eq('status', 'COMPLETED')
        .order('completed_at', ascending: false)
        .limit(limit);
    final list = rows as List<dynamic>;
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<List<Map<String, dynamic>>> fetchPayouts({int limit = 50}) async {
    final uid = auth.currentUser?.id;
    if (uid == null) return [];
    final rows = await client
        .from(payoutsTable)
        .select()
        .eq('driver_id', uid)
        .order('created_at', ascending: false)
        .limit(limit);
    final list = rows as List<dynamic>;
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<void> insertSupportTicket({
    required String subject,
    required String body,
  }) async {
    final uid = auth.currentUser?.id;
    if (uid == null) {
      throw StateError('Not signed in');
    }
    await client.from(supportTicketsTable).insert({
      'driver_id': uid,
      'subject': subject.trim(),
      'body': body.trim(),
    });
  }
}

class TodayTripStats {
  const TodayTripStats({
    required this.completedCount,
    required this.totalFare,
  });

  final int completedCount;
  final double totalFare;
}
