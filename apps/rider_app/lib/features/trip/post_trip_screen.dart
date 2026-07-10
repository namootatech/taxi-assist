import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/utils/toast.dart';
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

  @override
  void dispose() {
    _comment.dispose();
    _tip.dispose();
    super.dispose();
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
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.check_circle_outline, size: 64),
              const SizedBox(height: 16),
              Text(
                'Fare: R${widget.trip.finalFare?.toStringAsFixed(2) ?? widget.trip.estimatedFare?.toStringAsFixed(2) ?? '—'}',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () => ref.invalidate(currentTripProvider),
                child: const Text('Done'),
              ),
            ],
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
