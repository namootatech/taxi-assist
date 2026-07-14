import 'dart:convert';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;

import '../utils/app_log.dart';

class PlaceSuggestion {
  const PlaceSuggestion({
    required this.placeId,
    required this.description,
    this.mainText,
    this.secondaryText,
  });

  final String placeId;
  final String description;
  final String? mainText;
  final String? secondaryText;
}

class PlaceDetails {
  const PlaceDetails({
    required this.placeId,
    required this.formattedAddress,
    required this.lat,
    required this.lng,
    this.name,
  });

  final String placeId;
  final String formattedAddress;
  final double lat;
  final double lng;
  final String? name;

  String get displayAddress =>
      (name != null && name!.isNotEmpty) ? '$name — $formattedAddress' : formattedAddress;
}

/// Google Places Autocomplete + Details via HTTP (Maps/Places key from dotenv).
class PlacesService {
  PlacesService({http.Client? client, String? apiKey})
      : _client = client ?? http.Client(),
        _apiKey = apiKey ?? (dotenv.env['GOOGLE_MAPS_API_KEY'] ?? '');

  final http.Client _client;
  final String _apiKey;

  bool get isConfigured =>
      _apiKey.isNotEmpty && !_apiKey.contains('your_maps');

  Future<List<PlaceSuggestion>> autocomplete(
    String input, {
    double? lat,
    double? lng,
  }) async {
    if (!isConfigured || input.trim().length < 2) return [];
    AppLog.d('places.autocomplete', 'query', {'len': input.length});
    final params = <String, String>{
      'input': input.trim(),
      'key': _apiKey,
      'components': 'country:za',
      'language': 'en',
    };
    if (lat != null && lng != null) {
      params['location'] = '$lat,$lng';
      params['radius'] = '50000';
    }
    final uri = Uri.https(
      'maps.googleapis.com',
      '/maps/api/place/autocomplete/json',
      params,
    );
    final res = await _client.get(uri);
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    final status = body['status'] as String? ?? '';
    if (status != 'OK' && status != 'ZERO_RESULTS') {
      AppLog.w('places.autocomplete', 'api_status', {
        'status': status,
        'error': body['error_message'],
      });
      return [];
    }
    final preds = (body['predictions'] as List<dynamic>? ?? []);
    return preds.map((raw) {
      final m = Map<String, dynamic>.from(raw as Map);
      final structured = m['structured_formatting'] as Map<String, dynamic>?;
      return PlaceSuggestion(
        placeId: m['place_id'] as String,
        description: m['description'] as String? ?? '',
        mainText: structured?['main_text'] as String?,
        secondaryText: structured?['secondary_text'] as String?,
      );
    }).toList();
  }

  Future<PlaceDetails?> details(String placeId) async {
    if (!isConfigured) return null;
    AppLog.d('places.details', 'fetch', {'placeId': placeId});
    final uri = Uri.https(
      'maps.googleapis.com',
      '/maps/api/place/details/json',
      {
        'place_id': placeId,
        'fields': 'place_id,formatted_address,geometry,name',
        'key': _apiKey,
      },
    );
    final res = await _client.get(uri);
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    if (body['status'] != 'OK') {
      AppLog.w('places.details', 'api_status', {'status': body['status']});
      return null;
    }
    final r = Map<String, dynamic>.from(body['result'] as Map);
    final loc = (r['geometry'] as Map)['location'] as Map;
    return PlaceDetails(
      placeId: r['place_id'] as String? ?? placeId,
      formattedAddress: r['formatted_address'] as String? ?? '',
      name: r['name'] as String?,
      lat: (loc['lat'] as num).toDouble(),
      lng: (loc['lng'] as num).toDouble(),
    );
  }

  Future<String?> reverseGeocode(double lat, double lng) async {
    if (!isConfigured) return null;
    final uri = Uri.https(
      'maps.googleapis.com',
      '/maps/api/geocode/json',
      {
        'latlng': '$lat,$lng',
        'key': _apiKey,
      },
    );
    final res = await _client.get(uri);
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    if (body['status'] != 'OK') return null;
    final results = body['results'] as List<dynamic>?;
    if (results == null || results.isEmpty) return null;
    return (results.first as Map)['formatted_address'] as String?;
  }
}
