import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/utils/toast.dart';
import '../../../shared/providers/app_providers.dart';
import '../../../shared/services/supabase_service.dart';
import '../trip_providers.dart';

/// Rider card on ride request / active trip (from `driver_get_trip_rider`).
class TripRiderCard extends ConsumerWidget {
  const TripRiderCard({super.key, required this.tripId});

  final String tripId;

  String? _resolvePhotoUrl(WidgetRef ref, String? raw) {
    if (raw == null || raw.trim().isEmpty) return null;
    final path = raw.trim();
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    try {
      return ref
          .read(supabaseClientProvider)
          .storage
          .from(SupabaseService.bucketDriverDocuments)
          .getPublicUrl(path);
    } catch (_) {
      return path;
    }
  }

  Future<void> _call(String? phone) async {
    final raw = phone?.trim() ?? '';
    if (raw.isEmpty) return;
    final uri = Uri(scheme: 'tel', path: raw);
    if (!await launchUrl(uri)) {
      showAppToast('Could not open dialer');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(tripRiderDetailsProvider(tripId));
    final scheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return async.when(
      data: (rider) {
        if (rider == null) {
          return const Card(
            child: ListTile(
              leading: Icon(Icons.person_outline),
              title: Text('Rider'),
              subtitle: Text('Details unavailable'),
            ),
          );
        }
        final photoUrl = _resolvePhotoUrl(ref, rider.selfieUrl);
        final ratingLabel = rider.totalRatings > 0 && rider.avgRating != null
            ? '${rider.avgRating!.toStringAsFixed(1)} · ${rider.totalRatings} trip${rider.totalRatings == 1 ? '' : 's'}'
            : 'No trips yet';

        return Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: scheme.primary.withOpacity(0.12),
                  backgroundImage:
                      photoUrl != null ? NetworkImage(photoUrl) : null,
                  onBackgroundImageError:
                      photoUrl != null ? (_, __) {} : null,
                  child: photoUrl == null
                      ? Icon(Icons.person, color: scheme.primary)
                      : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        rider.fullName,
                        style: textTheme.titleMedium,
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Icon(Icons.star, size: 16, color: scheme.primary),
                          const SizedBox(width: 4),
                          Expanded(child: Text(ratingLabel)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            rider.verified
                                ? Icons.verified
                                : Icons.verified_outlined,
                            size: 16,
                            color: rider.verified
                                ? scheme.primary
                                : scheme.onSurfaceVariant,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            rider.verified ? 'Verified' : 'Not verified',
                            style: textTheme.bodyMedium?.copyWith(
                              color: rider.verified
                                  ? scheme.primary
                                  : scheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            Icons.schedule,
                            size: 16,
                            color: scheme.onSurfaceVariant,
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              'On platform ${rider.memberSinceLabel}',
                              style: textTheme.bodySmall?.copyWith(
                                color: scheme.onSurfaceVariant,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (rider.cellphoneVisible &&
                          (rider.cellphone?.trim().isNotEmpty ?? false)) ...[
                        const SizedBox(height: 8),
                        OutlinedButton.icon(
                          onPressed: () => _call(rider.cellphone),
                          icon: const Icon(Icons.phone),
                          label: Text(rider.cellphone!),
                        ),
                      ] else ...[
                        const SizedBox(height: 4),
                        Text(
                          'Cellphone available after you accept',
                          style: textTheme.bodySmall?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
      loading: () => const Card(
        child: ListTile(
          leading: SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          title: Text('Loading rider…'),
        ),
      ),
      error: (e, _) => Card(
        child: ListTile(
          leading: const Icon(Icons.warning_amber),
          title: const Text('Rider'),
          subtitle: Text('$e'),
        ),
      ),
    );
  }
}
