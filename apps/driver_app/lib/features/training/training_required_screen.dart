import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:video_player/video_player.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/utils/toast.dart';
import '../../core/utils/safe_text.dart';
import '../../shared/providers/app_providers.dart';

class TrainingRequiredScreen extends ConsumerStatefulWidget {
  const TrainingRequiredScreen({super.key});

  @override
  ConsumerState<TrainingRequiredScreen> createState() => _TrainingRequiredScreenState();
}

class _TrainingRequiredScreenState extends ConsumerState<TrainingRequiredScreen> {
  var _busy = false;
  VideoPlayerController? _controller;
  var _isVideoReady = false;
  var _isComplete = false;

  @override
  void initState() {
    super.initState();
    _initVideo();
  }

  @override
  void dispose() {
    final c = _controller;
    if (c != null) {
      c.removeListener(_handleVideoTick);
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _initVideo() async {
    final controller = VideoPlayerController.asset('assets/training.mp4');
    _controller = controller;
    try {
      await controller.initialize();
      controller.addListener(_handleVideoTick);
      controller.setLooping(false);
      if (!mounted) return;
      setState(() {
        _isVideoReady = true;
      });
      await controller.play();
    } catch (e) {
      if (!mounted) return;
      showAppToast('Could not load training video. Try again.', long: true);
    }
  }

  void _handleVideoTick() {
    final c = _controller;
    if (c == null) return;
    if (!c.value.isInitialized) return;
    if (_isComplete) return;

    final position = c.value.position;
    final duration = c.value.duration;
    if (duration.inMilliseconds <= 0) return;

    final isAtEnd = position >= duration - const Duration(milliseconds: 200);
    if (!isAtEnd) return;

    if (!mounted) return;
    setState(() {
      _isComplete = true;
    });
  }

  Future<void> _markCompleted() async {
    if (_busy) return;
    if (!_isComplete) {
      showAppToast('Please watch the full training video to continue.', long: true);
      return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(supabaseServiceProvider).updateProfile({
        'training_completed': true,
        'status': 'APPROVED',
      });
      await ref.read(currentDriverProvider.notifier).refresh();
      showAppToast('You’re all set. You can now go online.');
    } catch (e) {
      showAppToast(safeMessage(e), long: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final controller = _controller;
    return Scaffold(
      appBar: AppBar(title: const Text('Training required')),
      body: Padding(
        padding: AppSpacing.screenPadding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Watch this 1-minute training to unlock your driver account.',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 10),
            Text(
              'Once the video finishes, you’ll be approved and able to go online.',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const SizedBox(height: 18),
            Container(
              decoration: BoxDecoration(
                color: scheme.surfaceContainerHighest.withOpacity(0.55),
                borderRadius: BorderRadius.circular(16),
              ),
              padding: const EdgeInsets.all(12),
              child: AspectRatio(
                aspectRatio: controller?.value.isInitialized == true
                    ? controller!.value.aspectRatio
                    : 16 / 9,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: _isVideoReady && controller != null
                      ? VideoPlayer(controller)
                      : const Center(child: CircularProgressIndicator()),
                ),
              ),
            ),
            const SizedBox(height: 18),
            FilledButton(
              onPressed: _busy ? null : _markCompleted,
              child: _busy
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(_isComplete ? 'Finish training' : 'Finish training (watch full video)'),
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: _busy
                  ? null
                  : () async {
                      await ref.read(currentDriverProvider.notifier).refresh();
                    },
              child: const Text('Refresh status'),
            ),
          ],
        ),
      ),
    );
  }
}

