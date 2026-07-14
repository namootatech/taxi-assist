import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/utils/app_log.dart';
import '../../core/utils/toast.dart';
import '../../shared/providers/app_providers.dart';
import 'models/trip.dart';
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

  @override
  void initState() {
    super.initState();
    _finalizeAds();
  }

  @override
  void dispose() {
    _comment.dispose();
    _tip.dispose();
    super.dispose();
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
    if (_comment.text.trim().isEmpty) {
      showAppToast('Comment is required');
      return;
    }
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
      showAppToast('Thanks for your feedback');
    } catch (e) {
      showAppToast('$e', long: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_submitted) {
      return Scaffold(
        appBar: AppBar(title: const Text('Trip complete')),
        body: Center(
          child: Padding(
            padding: AppSpacing.screenPadding,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.check_circle_outline, size: 64),
                const SizedBox(height: 16),
                Text(
                  'Fare: R${widget.trip.finalFare?.toStringAsFixed(2) ?? widget.trip.estimatedFare?.toStringAsFixed(2) ?? '—'}',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                if (_adEarnings > 0) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Ad credits earned: +R${_adEarnings.toStringAsFixed(2)}',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: Colors.green.shade700,
                        ),
                  ),
                ],
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () => ref.invalidate(currentTripProvider),
                  child: const Text('Done'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Rate your trip')),
      body: SingleChildScrollView(
        padding: AppSpacing.screenPadding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Fare: R${widget.trip.finalFare?.toStringAsFixed(2) ?? widget.trip.estimatedFare?.toStringAsFixed(2) ?? '—'}',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            if (_earningsLoaded && _adEarnings > 0) ...[
              const SizedBox(height: 8),
              Card(
                color: Theme.of(context).colorScheme.secondaryContainer,
                child: ListTile(
                  leading: const Icon(Icons.savings_outlined),
                  title: const Text('Taxi Assist Media'),
                  subtitle: const Text('Credited to your wallet'),
                  trailing: Text(
                    '+R${_adEarnings.toStringAsFixed(2)}',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 16),
            Text('Rating', style: Theme.of(context).textTheme.titleMedium),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (i) {
                final star = i + 1;
                return IconButton(
                  onPressed: () => setState(() => _rating = star),
                  icon: Icon(
                    star <= _rating ? Icons.star : Icons.star_border,
                    color: Colors.amber,
                    size: 36,
                  ),
                );
              }),
            ),
            TextField(
              controller: _comment,
              decoration: const InputDecoration(
                labelText: 'Comment (required)',
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
              keyboardType: TextInputType.number,
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
          ],
        ),
      ),
    );
  }
}
