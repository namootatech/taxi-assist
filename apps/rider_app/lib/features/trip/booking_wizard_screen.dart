import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/utils/toast.dart';
import '../../shared/widgets/map_placeholder.dart';
import 'trip_service.dart';

class BookingWizardScreen extends ConsumerStatefulWidget {
  const BookingWizardScreen({
    super.key,
    this.initialLat,
    this.initialLng,
  });

  final double? initialLat;
  final double? initialLng;

  @override
  ConsumerState<BookingWizardScreen> createState() => _BookingWizardScreenState();
}

class _BookingWizardScreenState extends ConsumerState<BookingWizardScreen> {
  final _pickupAddress = TextEditingController(text: 'Current location');
  final _dropoffAddress = TextEditingController();
  var _step = 0;
  var _loading = false;
  String _paymentMethod = 'CASH';
  double? _pickupLat;
  double? _pickupLng;
  final double _dropoffLat = -32.0;
  final double _dropoffLng = 26.0;
  double? _estimatedFare;

  @override
  void initState() {
    super.initState();
    _pickupLat = widget.initialLat ?? -33.0;
    _pickupLng = widget.initialLng ?? 18.0;
    _estimateFare();
  }

  @override
  void dispose() {
    _pickupAddress.dispose();
    _dropoffAddress.dispose();
    super.dispose();
  }

  void _estimateFare() {
    if (_pickupLat == null || _pickupLng == null) return;
    final meters = Geolocator.distanceBetween(
      _pickupLat!,
      _pickupLng!,
      _dropoffLat,
      _dropoffLng,
    );
    setState(() => _estimatedFare = (meters / 1000 * 12).clamp(35, 500));
  }

  Future<void> _confirm() async {
    if (_pickupLat == null || _pickupLng == null) return;
    setState(() => _loading = true);
    try {
      await ref.read(tripServiceProvider).requestTrip(
            pickupLat: _pickupLat!,
            pickupLng: _pickupLng!,
            dropoffLat: _dropoffLat,
            dropoffLng: _dropoffLng,
            pickupAddress: _pickupAddress.text,
            dropoffAddress: _dropoffAddress.text,
            paymentMethod: _paymentMethod,
            estimatedFare: _estimatedFare,
            estimatedDurationSec: 900,
          );
      if (mounted) {
        showAppToast('Trip requested');
        Navigator.of(context).pop();
      }
    } catch (e) {
      showAppToast('$e', long: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onContinue() {
    if (_step < 2) {
      setState(() => _step++);
      if (_step == 2) _estimateFare();
    } else {
      _confirm();
    }
  }

  void _onBack() {
    if (_step > 0) {
      setState(() => _step--);
    } else {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Book a trip')),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          LinearProgressIndicator(value: (_step + 1) / 3),
          Expanded(
            child: SingleChildScrollView(
              padding: AppSpacing.screenPadding,
              child: switch (_step) {
                0 => Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text('Pickup', style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _pickupAddress,
                        decoration: const InputDecoration(labelText: 'Pickup address'),
                      ),
                      const SizedBox(height: 12),
                      const MapPlaceholder(pickupLabel: 'Pickup'),
                    ],
                  ),
                1 => Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text('Destination', style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _dropoffAddress,
                        decoration: const InputDecoration(labelText: 'Destination'),
                        onChanged: (_) => _estimateFare(),
                      ),
                      const SizedBox(height: 12),
                      const MapPlaceholder(dropoffLabel: 'Destination'),
                    ],
                  ),
                _ => Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Payment & confirm',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Estimated fare: R${_estimatedFare?.toStringAsFixed(0) ?? '—'}',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: _paymentMethod,
                        decoration: const InputDecoration(labelText: 'Payment'),
                        items: const [
                          DropdownMenuItem(value: 'CASH', child: Text('Cash')),
                          DropdownMenuItem(value: 'CARD', child: Text('Card')),
                          DropdownMenuItem(value: 'WALLET', child: Text('Wallet')),
                          DropdownMenuItem(
                            value: 'WALLET_CASH',
                            child: Text('Wallet + cash fallback'),
                          ),
                        ],
                        onChanged: (v) {
                          if (v != null) setState(() => _paymentMethod = v);
                        },
                      ),
                    ],
                  ),
              },
            ),
          ),
          Padding(
            padding: AppSpacing.screenPadding,
            child: Row(
              children: [
                TextButton(
                  onPressed: _loading ? null : _onBack,
                  child: Text(_step == 0 ? 'Cancel' : 'Back'),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton(
                    key: const ValueKey('wizard-continue'),
                    onPressed: _loading ? null : _onContinue,
                    child: _loading
                        ? const SizedBox(
                            height: 22,
                            width: 22,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(_step == 2 ? 'Confirm' : 'Next'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
