import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/observability/app_sentry.dart';
import '../../core/supabase_client.dart';
import '../models/rider_profile.dart';

/// Facade for Supabase calls (RLS assumed on backend).
class SupabaseService {
  SupabaseClient get client => supabaseClient;

  GoTrueClient get auth => client.auth;

  static const _profilesTable = 'profiles';
  static const supportTicketsTable = 'support_tickets';
  static const documentsTable = 'documents';
  static const emergencyContactsTable = 'emergency_contacts';
  static const walletsTable = 'wallets';
  static const adViewsTable = 'ad_views';
  static const tripsTable = 'trips';

  static const bucketRiderDocuments = 'driver-documents';

  static const _profileUpdateWhitelist = {
    'full_name',
    'cellphone',
    'email',
    'residential_address',
    'address_type',
    'unit_number',
    'complex_name',
    'referral_code',
    'selfie_url',
    'registration_submitted',
    'status',
  };

  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    final emailDomain = email.contains('@')
        ? email.trim().toLowerCase().split('@').last
        : 'invalid';
    AppSentry.action('supabase.auth.sign_in.started',
        data: {'emailDomain': emailDomain});
    try {
      final res = await auth.signInWithPassword(
        email: email.trim(),
        password: password,
      );
      AppSentry.action('supabase.auth.sign_in.completed');
      return res;
    } catch (e, st) {
      AppSentry.action(
        'supabase.auth.sign_in.failed',
        data: {'errorType': e.runtimeType.toString()},
      );
      await AppSentry.captureException(
        e,
        stackTrace: st,
        hint: 'supabase.auth.sign_in',
        context: {'emailDomain': emailDomain},
      );
      rethrow;
    }
  }

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
    if (user == null) return response;

    final row = <String, dynamic>{
      'id': user.id,
      'email': email.trim(),
      'profile_type': 'RIDER',
      'status': 'PENDING',
      'registration_submitted': false,
      if (profileData != null) ...profileData,
    };

    await client.from(_profilesTable).upsert(row, onConflict: 'id');
    return response;
  }

  Future<void> signOut() async {
    AppSentry.action('supabase.auth.sign_out.started');
    try {
      await auth.signOut();
      AppSentry.action('supabase.auth.sign_out.completed');
    } catch (e, st) {
      await AppSentry.captureException(e,
          stackTrace: st, hint: 'supabase.auth.sign_out');
      rethrow;
    }
  }

  Future<void> resetPasswordForEmail(String email) {
    return auth.resetPasswordForEmail(email.trim());
  }

  Future<RiderProfile?> getCurrentRiderProfile() async {
    final userId = auth.currentUser?.id;
    if (userId == null) return null;

    final row = await client
        .from(_profilesTable)
        .select()
        .eq('id', userId)
        .maybeSingle();

    if (row == null) return null;
    return RiderProfile.fromJson(Map<String, dynamic>.from(row));
  }

  Future<void> updateProfile(Map<String, dynamic> patch) async {
    final userId = auth.currentUser?.id;
    if (userId == null) throw StateError('Not signed in');

    final filtered = <String, dynamic>{};
    for (final e in patch.entries) {
      if (_profileUpdateWhitelist.contains(e.key)) {
        filtered[e.key] = e.value;
      }
    }
    if (filtered.isEmpty) return;

    await client.from(_profilesTable).update(filtered).eq('id', userId);
  }

  Future<List<Map<String, dynamic>>> listMyDocuments() async {
    final uid = auth.currentUser?.id;
    if (uid == null) return [];
    final rows =
        await client.from(documentsTable).select().eq('uploaded_by', uid);
    return (rows as List<dynamic>)
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
  }

  Future<void> insertDocument({
    required String documentType,
    required String filePath,
  }) async {
    final uid = auth.currentUser?.id;
    if (uid == null) throw StateError('Not signed in');
    await client.from(documentsTable).insert({
      'entity_type': 'RIDER',
      'entity_id': uid,
      'document_type': documentType,
      'file_path': filePath,
      'status': 'PENDING',
      'uploaded_by': uid,
    });
  }

  Future<Map<String, dynamic>?> fetchRiderWallet() async {
    final uid = auth.currentUser?.id;
    if (uid == null) return null;
    final row = await client
        .from(walletsTable)
        .select()
        .eq('profile_id', uid)
        .eq('wallet_type', 'RIDER')
        .maybeSingle();
    if (row == null) return null;
    return Map<String, dynamic>.from(row);
  }

  Future<List<Map<String, dynamic>>> fetchAdViews({int limit = 50}) async {
    final uid = auth.currentUser?.id;
    if (uid == null) return [];
    final rows = await client
        .from(adViewsTable)
        .select()
        .eq('rider_id', uid)
        .order('created_at', ascending: false)
        .limit(limit);
    return (rows as List<dynamic>)
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
  }

  Future<List<Map<String, dynamic>>> fetchEmergencyContacts() async {
    final uid = auth.currentUser?.id;
    if (uid == null) return [];
    final rows = await client
        .from(emergencyContactsTable)
        .select()
        .eq('rider_id', uid)
        .order('created_at');
    return (rows as List<dynamic>)
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
  }

  Future<void> upsertEmergencyContact(Map<String, dynamic> patch) async {
    final uid = auth.currentUser?.id;
    if (uid == null) throw StateError('Not signed in');
    final row = <String, dynamic>{
      'rider_id': uid,
      ...patch,
    };
    final contactId = patch['contact_id'];
    if (contactId != null) {
      await client
          .from(emergencyContactsTable)
          .update(row)
          .eq('contact_id', contactId);
    } else {
      await client.from(emergencyContactsTable).insert(row);
    }
  }

  Future<void> deleteEmergencyContact(String contactId) async {
    final uid = auth.currentUser?.id;
    if (uid == null) throw StateError('Not signed in');
    await client
        .from(emergencyContactsTable)
        .delete()
        .eq('contact_id', contactId)
        .eq('rider_id', uid);
  }

  Future<List<Map<String, dynamic>>> fetchTripHistory({int limit = 100}) async {
    final uid = auth.currentUser?.id;
    if (uid == null) return [];
    final rows = await client
        .from(tripsTable)
        .select()
        .eq('rider_id', uid)
        .order('created_at', ascending: false)
        .limit(limit);
    return (rows as List<dynamic>)
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
  }

  Future<List<Map<String, dynamic>>> fetchSupportTickets({int limit = 50}) async {
    final uid = auth.currentUser?.id;
    if (uid == null) return [];
    final rows = await client
        .from(supportTicketsTable)
        .select()
        .eq('rider_id', uid)
        .order('created_at', ascending: false)
        .limit(limit);
    return (rows as List<dynamic>)
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
  }

  Future<void> insertSupportTicket({
    required String subject,
    required String body,
  }) async {
    final uid = auth.currentUser?.id;
    if (uid == null) throw StateError('Not signed in');
    await client.from(supportTicketsTable).insert({
      'rider_id': uid,
      'subject': subject.trim(),
      'body': body.trim(),
    });
  }
}
