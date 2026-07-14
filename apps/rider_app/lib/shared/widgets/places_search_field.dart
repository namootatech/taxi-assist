import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/services/places_service.dart';

/// Address search with Google Places suggestions.
class PlacesSearchField extends StatefulWidget {
  const PlacesSearchField({
    super.key,
    required this.label,
    required this.controller,
    required this.onPlaceSelected,
    this.biasLat,
    this.biasLng,
    this.enabled = true,
  });

  final String label;
  final TextEditingController controller;
  final void Function(PlaceDetails details) onPlaceSelected;
  final double? biasLat;
  final double? biasLng;
  final bool enabled;

  @override
  State<PlacesSearchField> createState() => _PlacesSearchFieldState();
}

class _PlacesSearchFieldState extends State<PlacesSearchField> {
  final _places = PlacesService();
  List<PlaceSuggestion> _suggestions = [];
  Timer? _debounce;
  var _searching = false;

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 320), () async {
      if (!mounted) return;
      setState(() => _searching = true);
      final list = await _places.autocomplete(
        value,
        lat: widget.biasLat,
        lng: widget.biasLng,
      );
      if (!mounted) return;
      setState(() {
        _suggestions = list;
        _searching = false;
      });
    });
  }

  Future<void> _select(PlaceSuggestion s) async {
    final details = await _places.details(s.placeId);
    if (details == null || !mounted) return;
    widget.controller.text = details.formattedAddress;
    setState(() => _suggestions = []);
    widget.onPlaceSelected(details);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: widget.controller,
          enabled: widget.enabled,
          decoration: InputDecoration(
            labelText: widget.label,
            prefixIcon: const Icon(Icons.search),
            suffixIcon: _searching
                ? const Padding(
                    padding: EdgeInsets.all(12),
                    child: SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                : null,
          ),
          onChanged: _onChanged,
        ),
        if (_suggestions.isNotEmpty)
          Material(
            elevation: 2,
            borderRadius: BorderRadius.circular(12),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _suggestions.length.clamp(0, 6),
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, i) {
                final s = _suggestions[i];
                return ListTile(
                  dense: true,
                  leading: const Icon(Icons.place_outlined),
                  title: Text(s.mainText ?? s.description),
                  subtitle:
                      s.secondaryText != null ? Text(s.secondaryText!) : null,
                  onTap: () => _select(s),
                );
              },
            ),
          ),
        if (!_places.isConfigured)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(
              'Add GOOGLE_MAPS_API_KEY (Places + Maps SDK) and run dart run tool/sync_env.dart',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.error,
                  ),
            ),
          ),
      ],
    );
  }
}
