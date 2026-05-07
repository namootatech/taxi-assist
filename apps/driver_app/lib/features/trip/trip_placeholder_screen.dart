import 'package:flutter/material.dart';

class TripPlaceholderScreen extends StatelessWidget {
  const TripPlaceholderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Trips')),
      body: const Center(
        child: Text('Trip history and active trip (PRD §5.4).'),
      ),
    );
  }
}
