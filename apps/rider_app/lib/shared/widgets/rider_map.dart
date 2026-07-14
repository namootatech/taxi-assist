import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Interactive Google Map for rider home / booking / active trip.
class RiderMap extends StatefulWidget {
  const RiderMap({
    super.key,
    this.initialLat,
    this.initialLng,
    this.pickup,
    this.dropoff,
    this.driver,
    this.myLocationEnabled = true,
    this.onMapCreated,
    this.onCameraIdle,
    this.height,
  });

  final double? initialLat;
  final double? initialLng;
  final LatLng? pickup;
  final LatLng? dropoff;
  final LatLng? driver;
  final bool myLocationEnabled;
  final void Function(GoogleMapController controller)? onMapCreated;
  final VoidCallback? onCameraIdle;
  final double? height;

  @override
  State<RiderMap> createState() => _RiderMapState();
}

class _RiderMapState extends State<RiderMap> {
  GoogleMapController? _controller;
  static const _fallback = LatLng(-33.9249, 18.4241); // Cape Town

  LatLng get _center {
    if (widget.pickup != null) return widget.pickup!;
    if (widget.initialLat != null && widget.initialLng != null) {
      return LatLng(widget.initialLat!, widget.initialLng!);
    }
    return _fallback;
  }

  Set<Marker> get _markers {
    final out = <Marker>{};
    if (widget.pickup != null) {
      out.add(
        Marker(
          markerId: const MarkerId('pickup'),
          position: widget.pickup!,
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
          infoWindow: const InfoWindow(title: 'Pickup'),
        ),
      );
    }
    if (widget.dropoff != null) {
      out.add(
        Marker(
          markerId: const MarkerId('dropoff'),
          position: widget.dropoff!,
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
          infoWindow: const InfoWindow(title: 'Drop-off'),
        ),
      );
    }
    if (widget.driver != null) {
      out.add(
        Marker(
          markerId: const MarkerId('driver'),
          position: widget.driver!,
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
          infoWindow: const InfoWindow(title: 'Driver'),
        ),
      );
    }
    return out;
  }

  Set<Polyline> get _polylines {
    if (widget.pickup == null || widget.dropoff == null) return {};
    return {
      Polyline(
        polylineId: const PolylineId('route'),
        points: [widget.pickup!, widget.dropoff!],
        width: 4,
        color: const Color(0xFF1A1A1A),
      ),
    };
  }

  Future<void> _fitBounds() async {
    final c = _controller;
    if (c == null) return;
    final points = <LatLng>[
      if (widget.pickup != null) widget.pickup!,
      if (widget.dropoff != null) widget.dropoff!,
      if (widget.driver != null) widget.driver!,
    ];
    if (points.length < 2) {
      await c.animateCamera(CameraUpdate.newLatLngZoom(_center, 15));
      return;
    }
    var minLat = points.first.latitude;
    var maxLat = points.first.latitude;
    var minLng = points.first.longitude;
    var maxLng = points.first.longitude;
    for (final p in points.skip(1)) {
      minLat = minLat < p.latitude ? minLat : p.latitude;
      maxLat = maxLat > p.latitude ? maxLat : p.latitude;
      minLng = minLng < p.longitude ? minLng : p.longitude;
      maxLng = maxLng > p.longitude ? maxLng : p.longitude;
    }
    await c.animateCamera(
      CameraUpdate.newLatLngBounds(
        LatLngBounds(
          southwest: LatLng(minLat, minLng),
          northeast: LatLng(maxLat, maxLng),
        ),
        72,
      ),
    );
  }

  @override
  void didUpdateWidget(covariant RiderMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.pickup != widget.pickup ||
        oldWidget.dropoff != widget.dropoff ||
        oldWidget.driver != widget.driver) {
      unawaited(_fitBounds());
    }
  }

  @override
  Widget build(BuildContext context) {
    final map = GoogleMap(
      initialCameraPosition: CameraPosition(target: _center, zoom: 14),
      myLocationEnabled: widget.myLocationEnabled,
      myLocationButtonEnabled: false,
      zoomControlsEnabled: false,
      compassEnabled: false,
      mapToolbarEnabled: false,
      markers: _markers,
      polylines: _polylines,
      onMapCreated: (c) {
        _controller = c;
        widget.onMapCreated?.call(c);
        unawaited(_fitBounds());
      },
      onCameraIdle: widget.onCameraIdle,
    );

    final body = Stack(
      children: [
        map,
        Positioned(
          right: 12,
          bottom: 12,
          child: FloatingActionButton.small(
            heroTag: 'rider_map_recenter_${identityHashCode(this)}',
            onPressed: () => unawaited(_fitBounds()),
            child: const Icon(Icons.my_location),
          ),
        ),
      ],
    );

    if (widget.height == null) return body;
    return SizedBox(height: widget.height, child: body);
  }
}
