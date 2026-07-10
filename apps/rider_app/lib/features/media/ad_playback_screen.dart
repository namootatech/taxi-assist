import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:video_player/video_player.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/utils/toast.dart';
import '../../shared/providers/app_providers.dart';

/// Taxi Assist Media — full-screen ad surface with abandon warning.
class AdPlaybackScreen extends ConsumerStatefulWidget {
  const AdPlaybackScreen({super.key, required this.tripId, this.campaignId});

  final String tripId;
  final String? campaignId;

  @override
  ConsumerState<AdPlaybackScreen> createState() => _AdPlaybackScreenState();
}

class _AdPlaybackScreenState extends ConsumerState<AdPlaybackScreen> {
  VideoPlayerController? _controller;
  var _watchedSeconds = 0;
  var _rating = 5;
  final _comment = TextEditingController();
  var _phase = _AdPhase.intro;

  @override
  void dispose() {
    _controller?.dispose();
    _comment.dispose();
    super.dispose();
  }

  Future<void> _recordEvent(String event) async {
    final uid = ref.read(supabaseClientProvider).auth.currentUser?.id;
    if (uid == null) return;
    final campaignId = widget.campaignId;
    if (campaignId == null) return;

    await ref.read(supabaseClientProvider).rpc(
      'record_ad_view_event',
      params: {
        'p_trip_id': widget.tripId,
        'p_rider_id': uid,
        'p_campaign_id': campaignId,
        'p_event': event,
        'p_watched_seconds': _watchedSeconds,
        'p_rating': event == 'COMPLETED' ? _rating : null,
        'p_comment': event == 'COMPLETED' ? _comment.text : null,
      },
    );
  }

  Future<bool> _onWillPop() async {
    final leave = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Leave ad?'),
        content: const Text(
          'Leaving before completion means no wallet credit.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Stay')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Leave')),
        ],
      ),
    );
    if (leave == true) {
      await _recordEvent('ABANDONED');
    }
    return leave ?? false;
  }

  Future<void> _startPlayback() async {
    setState(() => _phase = _AdPhase.playback);
    await _recordEvent('STARTED');

    _controller = VideoPlayerController.networkUrl(
      Uri.parse('https://flutter.github.io/assets-for-api-docs/assets/videos/bee.mp4'),
    );
    try {
      await _controller!.initialize();
      await _controller!.play();
      _controller!.addListener(() {
        if (_controller!.value.isPlaying && mounted) {
          setState(() => _watchedSeconds = _controller!.value.position.inSeconds);
        }
      });
    } catch (_) {
      await Future<void>.delayed(const Duration(seconds: 3));
      if (mounted) setState(() => _watchedSeconds = 5);
    }
    if (mounted) setState(() => _phase = _AdPhase.rate);
  }

  Future<void> _complete() async {
    if (_comment.text.trim().isEmpty) {
      showAppToast('Rating and comment required for credit');
      return;
    }
    await _recordEvent('COMPLETED');
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final leave = await _onWillPop();
        if (leave && context.mounted) Navigator.of(context).pop();
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: SafeArea(
          child: Padding(
            padding: AppSpacing.screenPadding,
            child: switch (_phase) {
              _AdPhase.intro => _Intro(onStart: _startPlayback),
              _AdPhase.playback => _Playback(
                  controller: _controller,
                  watchedSeconds: _watchedSeconds,
                  onSkip: () => setState(() => _phase = _AdPhase.rate),
                ),
              _AdPhase.rate => _RateGate(
                  rating: _rating,
                  comment: _comment,
                  onRatingChanged: (v) => setState(() => _rating = v),
                  onSubmit: _complete,
                ),
            },
          ),
        ),
      ),
    );
  }
}

enum _AdPhase { intro, playback, rate }

class _Intro extends StatelessWidget {
  const _Intro({required this.onStart});

  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Spacer(),
        const Icon(Icons.play_circle_outline, size: 72, color: Colors.white),
        const SizedBox(height: 16),
        Text(
          'Taxi Assist Media',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: Colors.white),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          'Watch a short ad to earn wallet credit on this trip.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white70),
          textAlign: TextAlign.center,
        ),
        const Spacer(),
        FilledButton(onPressed: onStart, child: const Text('Watch ad')),
      ],
    );
  }
}

class _Playback extends StatelessWidget {
  const _Playback({
    required this.controller,
    required this.watchedSeconds,
    required this.onSkip,
  });

  final VideoPlayerController? controller;
  final int watchedSeconds;
  final VoidCallback onSkip;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: controller != null && controller!.value.isInitialized
              ? AspectRatio(
                  aspectRatio: controller!.value.aspectRatio,
                  child: VideoPlayer(controller!),
                )
              : Center(
                  child: Text(
                    'Playing ad… ${watchedSeconds}s',
                    style: const TextStyle(color: Colors.white),
                  ),
                ),
        ),
        TextButton(
          onPressed: watchedSeconds >= 5 ? onSkip : null,
          child: const Text('Continue', style: TextStyle(color: Colors.white)),
        ),
      ],
    );
  }
}

class _RateGate extends StatelessWidget {
  const _RateGate({
    required this.rating,
    required this.comment,
    required this.onRatingChanged,
    required this.onSubmit,
  });

  final int rating;
  final TextEditingController comment;
  final ValueChanged<int> onRatingChanged;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Rate this ad',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(5, (i) {
            final s = i + 1;
            return IconButton(
              onPressed: () => onRatingChanged(s),
              icon: Icon(
                s <= rating ? Icons.star : Icons.star_border,
                color: Colors.amber,
              ),
            );
          }),
        ),
        TextField(
          controller: comment,
          style: const TextStyle(color: Colors.white),
          decoration: const InputDecoration(
            labelText: 'Comment',
            labelStyle: TextStyle(color: Colors.white70),
          ),
        ),
        const Spacer(),
        FilledButton(onPressed: onSubmit, child: const Text('Claim credit')),
      ],
    );
  }
}
