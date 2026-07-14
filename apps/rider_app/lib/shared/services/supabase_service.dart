import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/observability/app_sentry.dart';
import '../../core/utils/app_log.dart';
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

  String _emailDomain(String email) {
    final trimmed = email.trim().toLowerCase();
    if (!trimmed.contains('@')) return 'invalid';
    return trimmed.split('@').last;
  }

  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    final emailDomain = _emailDomain(email);
    AppLog.i('auth.signIn', 'started', {'emailDomain': emailDomain});
    AppSentry.action('supabase.auth.sign_in.started',
        data: {'emailDomain': emailDomain});
    try {
      final res = await auth.signInWithPassword(
        email: email.trim(),
        password: password,
      );
      AppLog.i('auth.signIn', 'completed', {
        'hasSession': res.session != null,
        'userId': res.user?.id,
      });
      AppSentry.action('supabase.auth.sign_in.completed');
      return res;
    } catch (e, st) {
      AppLog.e('auth.signIn', 'failed',
          error: e, stackTrace: st, data: {'emailDomain': emailDomain});
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
    final emailDomain = _emailDomain(email);
    final meta = <String, dynamic>{
      'profile_type': 'RIDER',
      if (profileData != null) ...profileData,
    };
    AppLog.i('auth.signUp', 'started', {
      'emailDomain': emailDomain,
      'metaKeys': meta.keys.toList(),
    });
    AppSentry.action('supabase.auth.sign_up.started',
        data: {'emailDomain': emailDomain});

    try {
      final response = await auth.signUp(
        email: email.trim(),
        password: password,
        data: meta,
      );
      final user = response.user;
      AppLog.i('auth.signUp', 'auth_ok', {
        'userId': user?.id,
        'hasSession': response.session != null,
        'identities': user?.identities?.length,
        'emailConfirmedAt': user?.emailConfirmedAt,
      });

      if (user == null) {
        AppLog.w('auth.signUp', 'no_user_returned');
        return response;
      }

      // Soft-fail: empty identities usually means the email is already registered
      // when confirmations are enabled.
      if (user.identities != null && user.identities!.isEmpty) {
        AppLog.w('auth.signUp', 'empty_identities');
        throw const AuthException(
          'User already registered',
          code: 'user_already_exists',
        );
      }

      final session = response.session ?? auth.currentSession;
      if (session == null) {
        // Auth user created but no session (email confirmation required).
        // Skip client upsert — RLS needs auth.uid(). Profile is created after
        // first confirmed sign-in or via a DB trigger if present.
        AppLog.w('auth.signUp', 'no_session_after_signup', {
          'userId': user.id,
        });
        AppSentry.action('supabase.auth.sign_up.completed', data: {
          'hasSession': false,
          'hasProfileData': profileData != null,
        });
        return response;
      }

      final row = <String, dynamic>{
        'id': user.id,
        'email': email.trim(),
        'profile_type': 'RIDER',
        'status': 'PENDING',
        'registration_submitted': false,
        if (profileData != null) ...profileData,
      };

      AppLog.i('auth.signUp', 'profile_upsert_started', {
        'userId': user.id,
        'keys': row.keys.toList(),
      });
      try {
        await client.from(_profilesTable).upsert(row, onConflict: 'id');
        AppLog.i('auth.signUp', 'profile_upsert_ok', {'userId': user.id});
      } catch (e, st) {
        AppLog.e(
          'auth.signUp',
          'profile_upsert_failed',
          error: e,
          stackTrace: st,
          data: {'userId': user.id},
        );
        rethrow;
      }

      AppSentry.action('supabase.auth.sign_up.completed', data: {
        'hasSession': true,
        'hasProfileData': profileData != null,
      });
      AppLog.i('auth.signUp', 'completed', {'userId': user.id});
      return response;
    } catch (e, st) {
      AppLog.e('auth.signUp', 'failed',
          error: e, stackTrace: st, data: {'emailDomain': emailDomain});
      AppSentry.action('supabase.auth.sign_up.failed', data: {
        'errorType': e.runtimeType.toString(),
      });
      await AppSentry.captureException(
        e,
        stackTrace: st,
        hint: 'supabase.auth.sign_up',
        context: {'emailDomain': emailDomain},
      );
      rethrow;
    }
  }

  Future<void> signOut() async {
    AppLog.i('auth.signOut', 'started');
    AppSentry.action('supabase.auth.sign_out.started');
    try {
      await auth.signOut();
      AppLog.i('auth.signOut', 'completed');
      AppSentry.action('supabase.auth.sign_out.completed');
    } catch (e, st) {
      AppLog.e('auth.signOut', 'failed', error: e, stackTrace: st);
      await AppSentry.captureException(e,
          stackTrace: st, hint: 'supabase.auth.sign_out');
      rethrow;
    }
  }

  Future<void> resetPasswordForEmail(String email) async {
    final emailDomain = _emailDomain(email);
    AppLog.i('auth.resetPassword', 'started', {'emailDomain': emailDomain});
    try {
      await auth.resetPasswordForEmail(email.trim());
      AppLog.i('auth.resetPassword', 'completed', {'emailDomain': emailDomain});
    } catch (e, st) {
      AppLog.e('auth.resetPassword', 'failed',
          error: e, stackTrace: st, data: {'emailDomain': emailDomain});
      rethrow;
    }
  }

  Future<RiderProfile?> getCurrentRiderProfile() async {
    final userId = auth.currentUser?.id;
    AppLog.d('profile.getCurrent', 'started', {'userId': userId});
    if (userId == null) {
      AppLog.d('profile.getCurrent', 'no_session');
      return null;
    }

    try {
      final row = await client
          .from(_profilesTable)
          .select()
          .eq('id', userId)
          .maybeSingle();

      if (row == null) {
        AppLog.w('profile.getCurrent', 'missing_row', {'userId': userId});
        return null;
      }
      final profile = RiderProfile.fromJson(Map<String, dynamic>.from(row));
      AppLog.d('profile.getCurrent', 'ok', {
        'userId': userId,
        'status': profile.status.name,
        'profileType': profile.profileType,
      });
      return profile;
    } catch (e, st) {
      AppLog.e('profile.getCurrent', 'failed',
          error: e, stackTrace: st, data: {'userId': userId});
      rethrow;
    }
  }

  Future<void> updateProfile(Map<String, dynamic> patch) async {
    final userId = auth.currentUser?.id;
    AppLog.i('profile.update', 'started', {
      'userId': userId,
      'keys': patch.keys.toList(),
    });
    if (userId == null) throw StateError('Not signed in');

    final filtered = <String, dynamic>{};
    for (final e in patch.entries) {
      if (_profileUpdateWhitelist.contains(e.key)) {
        filtered[e.key] = e.value;
      }
    }
    if (filtered.isEmpty) {
      AppLog.w('profile.update', 'empty_after_whitelist');
      return;
    }

    try {
      await client.from(_profilesTable).update(filtered).eq('id', userId);
      AppLog.i('profile.update', 'completed', {
        'userId': userId,
        'keys': filtered.keys.toList(),
      });
    } catch (e, st) {
      AppLog.e('profile.update', 'failed',
          error: e, stackTrace: st, data: {'userId': userId});
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> listMyDocuments() async {
    final uid = auth.currentUser?.id;
    AppLog.d('documents.list', 'started', {'userId': uid});
    if (uid == null) return [];
    try {
      final rows =
          await client.from(documentsTable).select().eq('uploaded_by', uid);
      final list = (rows as List<dynamic>)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
      AppLog.d('documents.list', 'ok', {'count': list.length});
      return list;
    } catch (e, st) {
      AppLog.e('documents.list', 'failed', error: e, stackTrace: st);
      rethrow;
    }
  }

  Future<void> insertDocument({
    required String documentType,
    required String filePath,
  }) async {
    final uid = auth.currentUser?.id;
    AppLog.i('documents.insert', 'started', {
      'userId': uid,
      'documentType': documentType,
    });
    if (uid == null) throw StateError('Not signed in');
    try {
      await client.from(documentsTable).insert({
        'entity_type': 'RIDER',
        'entity_id': uid,
        'document_type': documentType,
        'file_path': filePath,
        'status': 'PENDING',
        'uploaded_by': uid,
      });
      AppLog.i('documents.insert', 'completed', {'documentType': documentType});
    } catch (e, st) {
      AppLog.e('documents.insert', 'failed', error: e, stackTrace: st);
      rethrow;
    }
  }

  Future<Map<String, dynamic>?> fetchRiderWallet() async {
    final uid = auth.currentUser?.id;
    AppLog.d('wallet.fetch', 'started', {'userId': uid});
    if (uid == null) return null;
    try {
      final row = await client
          .from(walletsTable)
          .select()
          .eq('profile_id', uid)
          .eq('wallet_type', 'RIDER')
          .maybeSingle();
      AppLog.d('wallet.fetch', 'ok', {'found': row != null});
      if (row == null) return null;
      return Map<String, dynamic>.from(row);
    } catch (e, st) {
      AppLog.e('wallet.fetch', 'failed', error: e, stackTrace: st);
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> fetchAdViews({int limit = 50}) async {
    final uid = auth.currentUser?.id;
    AppLog.d('adViews.fetch', 'started', {'userId': uid, 'limit': limit});
    if (uid == null) return [];
    try {
      final rows = await client
          .from(adViewsTable)
          .select()
          .eq('rider_id', uid)
          .order('created_at', ascending: false)
          .limit(limit);
      final list = (rows as List<dynamic>)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
      AppLog.d('adViews.fetch', 'ok', {'count': list.length});
      return list;
    } catch (e, st) {
      AppLog.e('adViews.fetch', 'failed', error: e, stackTrace: st);
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> fetchEmergencyContacts() async {
    final uid = auth.currentUser?.id;
    AppLog.d('emergency.fetch', 'started', {'userId': uid});
    if (uid == null) return [];
    try {
      final rows = await client
          .from(emergencyContactsTable)
          .select()
          .eq('rider_id', uid)
          .order('created_at');
      final list = (rows as List<dynamic>)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
      AppLog.d('emergency.fetch', 'ok', {'count': list.length});
      return list;
    } catch (e, st) {
      AppLog.e('emergency.fetch', 'failed', error: e, stackTrace: st);
      rethrow;
    }
  }

  Future<void> upsertEmergencyContact(Map<String, dynamic> patch) async {
    final uid = auth.currentUser?.id;
    AppLog.i('emergency.upsert', 'started', {
      'userId': uid,
      'keys': patch.keys.toList(),
    });
    if (uid == null) throw StateError('Not signed in');
    final row = <String, dynamic>{
      'rider_id': uid,
      ...patch,
    };
    try {
      final contactId = patch['contact_id'];
      if (contactId != null) {
        await client
            .from(emergencyContactsTable)
            .update(row)
            .eq('contact_id', contactId);
      } else {
        await client.from(emergencyContactsTable).insert(row);
      }
      AppLog.i('emergency.upsert', 'completed');
    } catch (e, st) {
      AppLog.e('emergency.upsert', 'failed', error: e, stackTrace: st);
      rethrow;
    }
  }

  Future<void> deleteEmergencyContact(String contactId) async {
    final uid = auth.currentUser?.id;
    AppLog.i('emergency.delete', 'started', {
      'userId': uid,
      'contactId': contactId,
    });
    if (uid == null) throw StateError('Not signed in');
    try {
      await client
          .from(emergencyContactsTable)
          .delete()
          .eq('contact_id', contactId)
          .eq('rider_id', uid);
      AppLog.i('emergency.delete', 'completed');
    } catch (e, st) {
      AppLog.e('emergency.delete', 'failed', error: e, stackTrace: st);
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> fetchTripHistory({int limit = 100}) async {
    final uid = auth.currentUser?.id;
    AppLog.d('trips.history', 'started', {'userId': uid, 'limit': limit});
    if (uid == null) return [];
    try {
      final rows = await client
          .from(tripsTable)
          .select()
          .eq('rider_id', uid)
          .order('created_at', ascending: false)
          .limit(limit);
      final list = (rows as List<dynamic>)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
      AppLog.d('trips.history', 'ok', {'count': list.length});
      return list;
    } catch (e, st) {
      AppLog.e('trips.history', 'failed', error: e, stackTrace: st);
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> fetchSupportTickets({int limit = 50}) async {
    final uid = auth.currentUser?.id;
    AppLog.d('support.list', 'started', {'userId': uid, 'limit': limit});
    if (uid == null) return [];
    try {
      final rows = await client
          .from(supportTicketsTable)
          .select()
          .eq('rider_id', uid)
          .order('created_at', ascending: false)
          .limit(limit);
      final list = (rows as List<dynamic>)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
      AppLog.d('support.list', 'ok', {'count': list.length});
      return list;
    } catch (e, st) {
      AppLog.e('support.list', 'failed', error: e, stackTrace: st);
      rethrow;
    }
  }

  Future<void> insertSupportTicket({
    required String subject,
    required String body,
  }) async {
    final uid = auth.currentUser?.id;
    AppLog.i('support.insert', 'started', {'userId': uid});
    if (uid == null) throw StateError('Not signed in');
    try {
      await client.from(supportTicketsTable).insert({
        'rider_id': uid,
        'subject': subject.trim(),
        'body': body.trim(),
      });
      AppLog.i('support.insert', 'completed');
    } catch (e, st) {
      AppLog.e('support.insert', 'failed', error: e, stackTrace: st);
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> fetchWalletTransactions({
    int limit = 50,
  }) async {
    final wallet = await fetchRiderWallet();
    final walletId = wallet?['wallet_id'] as String?;
    AppLog.d('wallet.tx', 'started', {'walletId': walletId});
    if (walletId == null) return [];
    try {
      final rows = await client
          .from('wallet_transactions')
          .select()
          .eq('wallet_id', walletId)
          .order('created_at', ascending: false)
          .limit(limit);
      final list = (rows as List<dynamic>)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
      AppLog.d('wallet.tx', 'ok', {'count': list.length});
      return list;
    } catch (e, st) {
      AppLog.e('wallet.tx', 'failed', error: e, stackTrace: st);
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> getNextAdsForTrip(String tripId) async {
    AppLog.i('ads.next', 'started', {'tripId': tripId});
    try {
      final raw = await client.rpc(
        'get_next_ads_for_trip',
        params: {'p_trip_id': tripId},
      );
      final res = Map<String, dynamic>.from(raw as Map);
      if (res['ok'] != true) {
        AppLog.w('ads.next', 'rpc_rejected', {'error': '${res['error']}'});
        return [];
      }
      final ads = (res['ads'] as List<dynamic>? ?? [])
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
      AppLog.i('ads.next', 'ok', {'count': ads.length});
      return ads;
    } catch (e, st) {
      AppLog.e('ads.next', 'failed', error: e, stackTrace: st);
      rethrow;
    }
  }

  Future<void> recordAdViewEvent({
    required String tripId,
    required String campaignId,
    required String event,
    required int watchedSeconds,
    int? rating,
    String? comment,
  }) async {
    final uid = auth.currentUser?.id;
    if (uid == null) throw StateError('Not signed in');
    AppLog.i('ads.event', event, {
      'tripId': tripId,
      'campaignId': campaignId,
      'watchedSeconds': watchedSeconds,
    });
    await client.rpc(
      'record_ad_view_event',
      params: {
        'p_trip_id': tripId,
        'p_rider_id': uid,
        'p_campaign_id': campaignId,
        'p_event': event,
        'p_watched_seconds': watchedSeconds,
        'p_rating': rating,
        'p_comment': comment,
      },
    );
  }

  Future<Map<String, dynamic>> finalizeTripAdRewards(String tripId) async {
    AppLog.i('ads.finalize', 'started', {'tripId': tripId});
    final raw = await client.rpc(
      'finalize_trip_ad_rewards',
      params: {'p_trip_id': tripId},
    );
    final res = Map<String, dynamic>.from(raw as Map);
    AppLog.i('ads.finalize', 'done', {
      'ok': res['ok'],
      'total': res['total_amount'],
      'count': res['credited_count'],
    });
    return res;
  }

  Future<Map<String, dynamic>> debitWalletForTrip({
    required String tripId,
    required double amount,
  }) async {
    AppLog.i('wallet.debitTrip', 'started', {
      'tripId': tripId,
      'amount': amount,
    });
    final raw = await client.rpc(
      'rider_debit_wallet_for_trip',
      params: {
        'p_trip_id': tripId,
        'p_amount': amount,
      },
    );
    final res = Map<String, dynamic>.from(raw as Map);
    if (res['ok'] != true) {
      throw StateError('${res['error'] ?? res}');
    }
    AppLog.i('wallet.debitTrip', 'ok', {'balance': res['balance']});
    return res;
  }
}
