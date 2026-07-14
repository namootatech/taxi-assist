import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../core/constants/app_spacing.dart';
import '../../core/services/places_service.dart';
import '../../core/utils/app_log.dart';
import '../../core/utils/fare_calculator.dart';
import '../../core/utils/toast.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/widgets/places_search_field.dart';
import '../../shared/widgets/rider_map.dart';
import 'trip_service.dart';

class BookingWizardScreen extends ConsumerStatefulWidget {
  const BookingWizardScreen({
    super.key,
    this.initialLat,
    this.initialLng,
    this.initialPickupAddress,
    this.initialDropoff,
  });

  final double? initialLat;
  final double? initialLng;
  final String? initialPickupAddress;
  final PlaceDetails? initialDropoff;

  @override
  ConsumerState<BookingWizardScreen> createState() =>
      _BookingWizardScreenState();
}

class _BookingWizardScreenState extends ConsumerState<BookingWizardScreen> {
  final _pickupAddress = TextEditingController();
  final _dropoffAddress = TextEditingController();
  var _step = 0;
  var _loading = false;
  String _paymentMethod = 'CASH';
  double? _pickupLat;
  double? _pickupLng;
  double? _dropoffLat;
  double? _dropoffLng;
  FareBreakdown? _fare;
  double _walletBalance = 0;

  @override
  void initState() {
    super.initState();
    _pickupLat = widget.initialLat;
    _pickupLng = widget.initialLng;
    _pickupAddress.text = widget.initialPickupAddress ?? 'Current location';
    final drop = widget.initialDropoff;
    if (drop != null) {
      _dropoffLat = drop.lat;
      _dropoffLng = drop.lng;
      _dropoffAddress.text = drop.formattedAddress;
      _step = 1;
    }
    _recalcFare();
    _loadWallet();
  }

  @override
  void dispose() {
    _pickupAddress.dispose();
    _dropoffAddress.dispose();
    super.dispose();
  }

  Future<void> _loadWallet() async {
    final w = await ref.read(supabaseServiceProvider).fetchRiderWallet();
    final bal = w?['balance'];
    if (mounted && bal is num) {
      setState(() => _walletBalance = bal.toDouble());
    }
  }

  void _recalcFare() {
    if (_pickupLat == null ||
        _pickupLng == null ||
        _dropoffLat == null ||
        _dropoffLng == null) {
      setState(() => _fare = null);
      return;
    }
    final fare = FareCalculator.fromLatLng(
      pickupLat: _pickupLat!,
      pickupLng: _pickupLng!,
      dropoffLat: _dropoffLat!,
      dropoffLng: _dropoffLng!,
      distanceBetween: Geolocator.distanceBetween,
    );
    setState(() => _fare = fare);
    AppLog.d('ui.booking', 'fare', {
      'km': fare.distanceKm,
      'total': fare.total,
    });
  }

  Future<void> _confirm() async {
    if (_pickupLat == null ||
        _pickupLng == null ||
        _dropoffLat == null ||
        _dropoffLng == null ||
        _fare == null) {
      showAppToast('Select pickup and drop-off first', long: true);
      return;
    }
    if (_paymentMethod == 'WALLET' && _walletBalance < _fare!.total) {
      showAppToast(
        'Wallet balance R${_walletBalance.toStringAsFixed(2)} is too low. '
        'Choose Cash or Wallet + cash.',
        long: true,
      );
      return;
    }
    setState(() => _loading = true);
    try {
      final etaSec = (_fare!.distanceKm / 30 * 3600).round().clamp(300, 3600);
      await ref.read(tripServiceProvider).requestTrip(
            pickupLat: _pickupLat!,
            pickupLng: _pickupLng!,
            dropoffLat: _dropoffLat!,
            dropoffLng: _dropoffLng!,
            pickupAddress: _pickupAddress.text,
            dropoffAddress: _dropoffAddress.text,
            paymentMethod: _paymentMethod,
            estimatedFare: _fare!.total,
            estimatedDurationSec: etaSec,
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
    if (_step == 0) {
      if (_dropoffLat == null) {
        showAppToast('Choose a drop-off from the suggestions');
        return;
      }
      setState(() => _step = 1);
      _recalcFare();
      return;
    }
    if (_step == 1) {
      setState(() => _step = 2);
      return;
    }
    _confirm();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final pickup = (_pickupLat != null && _pickupLng != null)
        ? LatLng(_pickupLat!, _pickupLng!)
        : null;
    final dropoff = (_dropoffLat != null && _dropoffLng != null)
        ? LatLng(_dropoffLat!, _dropoffLng!)
        : null;

    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          RiderMap(
            initialLat: _pickupLat,
            initialLng: _pickupLng,
            pickup: pickup,
            dropoff: dropoff,
          ),
          SafeArea(
            child: Align(
              alignment: Alignment.topLeft,
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Material(
                  shape: const CircleBorder(),
                  elevation: 2,
                  child: IconButton(
                    onPressed: () {
                      if (_step > 0) {
                        setState(() => _step--);
                      } else {
                        Navigator.pop(context);
                      }
                    },
                    icon: const Icon(Icons.arrow_back),
                  ),
                ),
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: SafeArea(
              child: Padding(
                padding: AppSpacing.screenPadding,
                child: Material(
                  elevation: 10,
                  borderRadius: BorderRadius.circular(20),
                  color: scheme.surface,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: AnimatedSize(
                      duration: const Duration(milliseconds: 220),
                      curve: Curves.easeOutCubic,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            switch (_step) {
                              0 => 'Set your route',
                              1 => 'Payment',
                              _ => 'Confirm trip',
                            },
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 12),
                          if (_step == 0) ...[
                            PlacesSearchField(
                              label: 'Pickup',
                              controller: _pickupAddress,
                              biasLat: _pickupLat,
                              biasLng: _pickupLng,
                              onPlaceSelected: (d) {
                                setState(() {
                                  _pickupLat = d.lat;
                                  _pickupLng = d.lng;
                                });
                                _recalcFare();
                              },
                            ),
                            const SizedBox(height: 10),
                            PlacesSearchField(
                              label: 'Drop-off',
                              controller: _dropoffAddress,
                              biasLat: _pickupLat,
                              biasLng: _pickupLng,
                              onPlaceSelected: (d) {
                                setState(() {
                                  _dropoffLat = d.lat;
                                  _dropoffLng = d.lng;
                                });
                                _recalcFare();
                              },
                            ),
                          ] else if (_step == 1) ...[
                            Wrap(
                              spacing: 8,
                              children: [
                                for (final m in const [
                                  ('CASH', 'Cash'),
                                  ('CARD', 'Card'),
                                  ('WALLET', 'Wallet'),
                                  ('WALLET_CASH', 'Wallet + cash'),
                                ])
                                  ChoiceChip(
                                    label: Text(m.$2),
                                    selected: _paymentMethod == m.$1,
                                    onSelected: (_) =>
                                        setState(() => _paymentMethod = m.$1),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Wallet balance: R${_walletBalance.toStringAsFixed(2)}',
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                            if (_paymentMethod == 'WALLET_CASH')
                              Text(
                                'Pay what you can from wallet; settle the rest in cash with the driver.',
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                          ] else ...[
                            if (_fare != null) ...[
                              _FareCard(fare: _fare!),
                              const SizedBox(height: 8),
                            ],
                            Text(
                              '${_pickupAddress.text} → ${_dropoffAddress.text}',
                              maxLines: 3,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text('Pay with $_paymentMethod'),
                          ],
                          const SizedBox(height: 16),
                          FilledButton(
                            onPressed: _loading ? null : _onContinue,
                            child: _loading
                                ? const SizedBox(
                                    height: 22,
                                    width: 22,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : Text(
                                    _step < 2 ? 'Continue' : 'Request taxi',
                                  ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FareCard extends StatelessWidget {
  const _FareCard({required this.fare});

  final FareBreakdown fare;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Fare', style: theme.textTheme.titleMedium),
          const SizedBox(height: 6),
          _row('Distance', fare.distanceLabel),
          _row('Base', 'R${fare.baseFare.toStringAsFixed(0)}'),
          _row(
            'Distance charge (R${fare.perKmRate.toStringAsFixed(0)}/km)',
            'R${fare.distanceCharge.toStringAsFixed(2)}',
          ),
          const Divider(),
          _row('Total', fare.totalLabel, bold: true),
        ],
      ),
    );
  }

  Widget _row(String label, String value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Expanded(child: Text(label)),
          Text(
            value,
            style: bold ? const TextStyle(fontWeight: FontWeight.w700) : null,
          ),
        ],
      ),
    );
  }
}
