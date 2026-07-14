import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/utils/app_log.dart';
import '../../core/utils/pick_image.dart';
import '../../core/utils/safe_text.dart';
import '../../core/utils/toast.dart';
import '../../shared/models/rider_profile.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/services/supabase_service.dart';
import 'document_upload_screen.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  var _uploadingPhoto = false;
  var _savingPhone = false;

  String? _resolvePhotoUrl(String? raw) {
    if (raw == null || raw.trim().isEmpty) return null;
    final path = raw.trim();
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    try {
      return ref
          .read(supabaseClientProvider)
          .storage
          .from(SupabaseService.bucketRiderDocuments)
          .getPublicUrl(path);
    } catch (_) {
      return path;
    }
  }

  Future<void> _uploadPhoto() async {
    if (_uploadingPhoto) return;
    final path = await pickImageFromSheet(context);
    if (path == null) return;

    setState(() => _uploadingPhoto = true);
    try {
      final uid = ref.read(supabaseClientProvider).auth.currentUser?.id;
      if (uid == null) throw StateError('Not signed in');
      final ext =
          path.contains('.') ? path.split('.').last.toLowerCase() : 'jpg';
      final storagePath = '$uid/rider/profile_${const Uuid().v4()}.$ext';
      final bytes = await File(path).readAsBytes();
      await ref
          .read(supabaseClientProvider)
          .storage
          .from(SupabaseService.bucketRiderDocuments)
          .uploadBinary(storagePath, bytes);
      await ref.read(supabaseServiceProvider).updateProfile({
        'selfie_url': storagePath,
      });
      await ref.read(currentRiderProvider.notifier).refresh();
      showAppToast('Profile photo updated');
      AppLog.i('ui.profile', 'photo_ok');
    } catch (e, st) {
      AppLog.e('ui.profile', 'photo_failed', error: e, stackTrace: st);
      showAppToast(userFacingError(e), long: true);
    } finally {
      if (mounted) setState(() => _uploadingPhoto = false);
    }
  }

  Future<void> _editPhone(RiderProfile profile) async {
    final ctrl = TextEditingController(text: profile.cellphone ?? '');
    final saved = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cellphone number'),
        content: TextField(
          controller: ctrl,
          keyboardType: TextInputType.phone,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'Cellphone',
            hintText: 'e.g. 0821234567',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, ctrl.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (saved == null) return;
    if (saved.length < 9) {
      showAppToast('Enter a valid cellphone number', long: true);
      return;
    }
    setState(() => _savingPhone = true);
    try {
      await ref.read(supabaseServiceProvider).updateProfile({
        'cellphone': saved,
      });
      await ref.read(currentRiderProvider.notifier).refresh();
      showAppToast('Cellphone updated');
    } catch (e, st) {
      AppLog.e('ui.profile', 'phone_failed', error: e, stackTrace: st);
      showAppToast(userFacingError(e), long: true);
    } finally {
      if (mounted) setState(() => _savingPhone = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final profileAsync = ref.watch(currentRiderProvider);
    final scheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return profileAsync.when(
      data: (profile) {
        if (profile == null) {
          return const Center(child: Text('Not signed in'));
        }
        final photoUrl = _resolvePhotoUrl(profile.selfieUrl);
        final incomplete = !profile.hasProfilePhoto || !profile.hasCellphone;

        return ListView(
          padding: AppSpacing.screenPadding,
          children: [
            if (incomplete) ...[
              Card(
                color: scheme.primary.withOpacity(0.08),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.info_outline, color: scheme.primary),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'A profile photo and cellphone are required before you can book a trip.',
                          style: textTheme.bodyMedium,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
            Center(
              child: Column(
                children: [
                  Stack(
                    alignment: Alignment.bottomRight,
                    children: [
                      CircleAvatar(
                        radius: 52,
                        backgroundColor: scheme.primary.withOpacity(0.12),
                        backgroundImage:
                            photoUrl != null ? NetworkImage(photoUrl) : null,
                        onBackgroundImageError:
                            photoUrl != null ? (_, __) {} : null,
                        child: photoUrl == null
                            ? Icon(Icons.person, size: 52, color: scheme.primary)
                            : null,
                      ),
                      Material(
                        color: scheme.primary,
                        shape: const CircleBorder(),
                        child: InkWell(
                          customBorder: const CircleBorder(),
                          onTap: _uploadingPhoto ? null : _uploadPhoto,
                          child: Padding(
                            padding: const EdgeInsets.all(8),
                            child: _uploadingPhoto
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(
                                    Icons.camera_alt,
                                    size: 18,
                                    color: Colors.white,
                                  ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  TextButton(
                    onPressed: _uploadingPhoto ? null : _uploadPhoto,
                    child: Text(
                      profile.hasProfilePhoto
                          ? 'Change profile photo'
                          : 'Add profile photo',
                    ),
                  ),
                  const SizedBox(height: 4),
                  ref.watch(riderMyRatingProvider).when(
                        data: (rating) => _RatingSummary(
                          avgRating: rating.avgRating,
                          totalRatings: rating.totalRatings,
                        ),
                        loading: () => const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                        error: (_, __) => Text(
                          'Rating unavailable',
                          style: textTheme.bodySmall?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            ListTile(
              title: Text(profile.fullName ?? 'Rider'),
              subtitle: Text(profile.email ?? ''),
            ),
            ListTile(
              title: const Text('Status'),
              trailing: Chip(label: Text(_statusLabel(profile.status))),
            ),
            ListTile(
              title: const Text('Cellphone'),
              subtitle: Text(
                profile.hasCellphone
                    ? profile.cellphone!
                    : 'Required — tap to add',
              ),
              trailing: _savingPhone
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(
                      profile.hasCellphone ? Icons.edit : Icons.add,
                      color: scheme.primary,
                    ),
              onTap: _savingPhone ? null : () => _editPhone(profile),
            ),
            const Divider(),
            ListTile(
              title: const Text('Verification documents'),
              subtitle: const Text('Optional — skip anytime'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const DocumentUploadScreen(),
                ),
              ),
            ),
            ListTile(
              title: const Text('Sign out'),
              leading: const Icon(Icons.logout),
              onTap: () async {
                await ref.read(supabaseServiceProvider).signOut();
                ref.invalidate(currentRiderProvider);
              },
            ),
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('$e')),
    );
  }

  String _statusLabel(RiderProfileStatus status) {
    return switch (status) {
      RiderProfileStatus.approved => 'APPROVED',
      RiderProfileStatus.rejected => 'REJECTED',
      RiderProfileStatus.suspended => 'SUSPENDED',
      RiderProfileStatus.deactivated => 'DEACTIVATED',
      RiderProfileStatus.pending => 'PENDING',
    };
  }
}

class _RatingSummary extends StatelessWidget {
  const _RatingSummary({
    required this.avgRating,
    required this.totalRatings,
  });

  final double? avgRating;
  final int totalRatings;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    if (totalRatings <= 0 || avgRating == null) {
      return Text(
        'No ratings yet',
        style: textTheme.bodyMedium?.copyWith(
          color: scheme.onSurfaceVariant,
        ),
      );
    }

    final filled = avgRating!.round().clamp(1, 5);
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(5, (i) {
            final star = i + 1;
            return Icon(
              star <= filled ? Icons.star_rounded : Icons.star_outline_rounded,
              color: scheme.primary,
              size: 28,
            );
          }),
        ),
        const SizedBox(height: 4),
        Text(
          '${avgRating!.toStringAsFixed(1)} · $totalRatings '
          '${totalRatings == 1 ? 'rating' : 'ratings'}',
          style: textTheme.titleSmall,
        ),
      ],
    );
  }
}
