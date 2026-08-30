import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/utils/app_log.dart';
import '../../core/utils/toast.dart';
import '../../shared/providers/app_providers.dart';
import 'models/trip.dart';
import 'models/trip_driver_details.dart';
import 'trip_service.dart';

class PostTripScreen extends ConsumerStatefulWidget {
  const PostTripScreen({super.key, required this.trip});

  final Trip trip;

  @override
  ConsumerState<PostTripScreen> createState() => _PostTripScreenState();
}

class _PostTripScreenState extends ConsumerState<PostTripScreen> {
  var _rating = 5;
  final _comment = TextEditingController();
  final _tip = TextEditingController();
  var _loading = false;
  var _submitted = false;
  double _adEarnings = 0;
  var _earningsLoaded = false;
  TripDriverDetails? _driver;

  @override
  void initState() {
    super.initState();
    _finalizeAds();
    _loadDriver();
  }

  @override
  void dispose() {
    _comment.dispose();
    _tip.dispose();
    super.dispose();
  }

  Future<void> _loadDriver() async {
    try {
      final d = await ref
          .read(tripServiceProvider)
          .fetchTripDriver(widget.trip.tripId);
      if (mounted) setState(() => _driver = d);
    } catch (e, st) {
      AppLog.e('ui.postTrip', 'driver_load_failed', error: e, stackTrace: st);
    }
  }

  Future<void> _finalizeAds() async {
    try {
      final res = await ref
          .read(supabaseServiceProvider)
          .finalizeTripAdRewards(widget.trip.tripId);
      final total = res['total_amount'];
      if (mounted) {
        setState(() {
          _adEarnings = total is num ? total.toDouble() : 0;
          _earningsLoaded = true;
        });
        ref.invalidate(riderWalletProvider);
      }
      AppLog.i('ui.postTrip', 'ads_finalized', {'total': total});
    } catch (e, st) {
      AppLog.e('ui.postTrip', 'ads_finalize_failed', error: e, stackTrace: st);
      if (mounted) setState(() => _earningsLoaded = true);
    }
  }

  Future<void> _submit() async {
    setState(() => _loading = true);
    try {
      final tip = double.tryParse(_tip.text.trim());
      await ref.read(tripServiceProvider).rateCompletedTrip(
            tripId: widget.trip.tripId,
            rating: _rating,
            comment: _comment.text.trim(),
            tipAmount: tip != null && tip > 0 ? tip : null,
          );
      setState(() => _submitted = true);
      showAppToast('Thanks for rating your driver');
      AppLog.i('ui.postTrip', 'rated', {
        'tripId': widget.trip.tripId,
        'rating': _rating,
      });
      // Let “Done” dismiss; also pop if they leave via system back later.
    } catch (e) {
      showAppToast('$e', long: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _dismiss() {
    final ids = {...ref.read(dismissedRatingTripIdsProvider)};
    ids.add(widget.trip.tripId);
    ref.read(dismissedRatingTripIdsProvider.notifier).state = ids;
    ref.invalidate(currentTripProvider);
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final fare = widget.trip.finalFare ?? widget.trip.estimatedFare;

    if (_submitted) {
      return Padding(
        padding: AppSpacing.screenPadding,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle_outline, size: 72, color: scheme.primary),
            const SizedBox(height: 16),
            Text('Thanks!', style: textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text(
              'Your $_rating-star rating was sent'
              '${_driver != null ? ' for ${_driver!.fullName}' : ''}.',
              textAlign: TextAlign.center,
              style: textTheme.bodyLarge,
            ),
            if (fare != null) ...[
              const SizedBox(height: 12),
              Text(
                'Fare: R${fare.toStringAsFixed(2)}',
                style: textTheme.titleMedium,
              ),
            ],
            if (_adEarnings > 0) ...[
              const SizedBox(height: 8),
              Text(
                'Ad credits earned: +R${_adEarnings.toStringAsFixed(2)}',
                style: textTheme.titleMedium?.copyWith(
                  color: Colors.green.shade700,
                ),
              ),
            ],
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () {
                ref.invalidate(currentTripProvider);
                if (Navigator.of(context).canPop()) {
                  Navigator.of(context).pop();
                }
              },
              child: const Text('Done'),
            ),
          ],
        ),
      );
    }

    return ListView(
      padding: AppSpacing.screenPadding,
      children: [
        Text('Rate your driver', style: textTheme.headlineSmall),
        const SizedBox(height: 6),
        Text(
          'How was this trip?',
          style: textTheme.bodyMedium?.copyWith(
            color: scheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 16),
        if (_driver != null)
          Card(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: scheme.primary.withOpacity(0.12),
                child: Icon(Icons.person, color: scheme.primary),
              ),
              title: Text(_driver!.fullName),
              subtitle: Text(
                _driver!.vehicleLine ?? 'Your driver',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ),
        const SizedBox(height: 8),
        Text(
          'Fare: R${fare?.toStringAsFixed(2) ?? '—'}',
          style: textTheme.titleLarge,
        ),
        if (_earningsLoaded && _adEarnings > 0) ...[
          const SizedBox(height: 8),
          Card(
            color: scheme.secondaryContainer,
            child: ListTile(
              leading: const Icon(Icons.savings_outlined),
              title: const Text('Trip Media'),
              subtitle: const Text('Credited to your wallet'),
              trailing: Text(
                '+R${_adEarnings.toStringAsFixed(2)}',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
        const SizedBox(height: 20),
        Text('Your rating', style: textTheme.titleMedium),
        const SizedBox(height: 4),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(5, (i) {
            final star = i + 1;
            return IconButton(
              onPressed: () => setState(() => _rating = star),
              icon: Icon(
                star <= _rating ? Icons.star_rounded : Icons.star_outline_rounded,
                color: scheme.primary,
                size: 40,
              ),
            );
          }),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _comment,
          decoration: const InputDecoration(
            labelText: 'Comment (optional)',
            alignLabelWithHint: true,
          ),
          maxLines: 3,
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _tip,
          decoration: const InputDecoration(
            labelText: 'Tip from wallet (optional, max R500)',
            prefixText: 'R ',
          ),
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
        ),
        const SizedBox(height: 24),
        FilledButton(
          onPressed: _loading ? null : _submit,
          child: _loading
              ? const SizedBox(
                  height: 22,
                  width: 22,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Submit rating'),
        ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: _loading ? null : _dismiss,
          child: const Text('Maybe later'),
        ),
      ],
    );
  }
}
