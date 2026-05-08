import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../core/utils/picked_file_path.dart';
import '../../core/utils/toast.dart';

Future<String?> pickImageFromSheet(BuildContext context) async {
  try {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera),
              title: const Text('Camera'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Gallery'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
    if (source == null) return null;
    debugPrint('pickImageFromSheet: source=$source');

    if (source == ImageSource.camera) {
      final p = await Permission.camera.request();
      if (!p.isGranted) {
        showAppToast('Camera permission denied', long: true);
        return null;
      }
    } else {
      // Android 13+ / iOS: gallery access may require runtime permission.
      final p = await Permission.photos.request();
      if (!p.isGranted && !p.isLimited) {
        // Some Android versions map gallery to storage instead of photos.
        final storage = await Permission.storage.request();
        if (!storage.isGranted) {
          showAppToast('Photo access permission denied', long: true);
          return null;
        }
      }
    }

    final x = await ImagePicker().pickImage(
      source: source,
      imageQuality: 85,
    );
    final path = x?.path;
    if (path == null || path.trim().isEmpty) {
      showAppToast(
        'Could not read that photo. Try another one or take a new photo.',
        long: true,
      );
      return null;
    }
    debugPrint('pickImageFromSheet: picked path=$path');
    return path;
  } catch (e, st) {
    debugPrint('pickImageFromSheet failed: $e\n$st');
    showAppToast(
      'Could not open your photo picker. Please try again.',
      long: true,
    );
    return null;
  }
}

Future<String?> pickRegistrationFile() async {
  final r = await FilePicker.platform.pickFiles(
    type: FileType.custom,
    allowedExtensions: const ['pdf', 'png', 'jpg', 'jpeg', 'webp'],
    withData: true,
  );
  if (r == null || r.files.isEmpty) return null;
  final resolved = await materializePickedFile(r.files.single);
  if (resolved == null) {
    showAppToast(
      'Could not read that file. Try another file or save a copy to your device first.',
      long: true,
    );
  }
  return resolved;
}
