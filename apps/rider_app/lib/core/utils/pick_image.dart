import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';

import 'app_log.dart';
import 'toast.dart';

/// Camera or gallery — prefers [image_picker] over file_picker (Android photo
/// picker via file_picker often opens blank on emulators).
Future<String?> pickImageFromSheet(BuildContext context) async {
  AppLog.d('media.pick', 'sheet_opened');
  final source = await showModalBottomSheet<ImageSource>(
    context: context,
    showDragHandle: true,
    builder: (ctx) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: Text(
              'Select a photo',
              style: Theme.of(ctx).textTheme.titleMedium,
            ),
          ),
          ListTile(
            leading: const Icon(Icons.photo_camera_outlined),
            title: const Text('Take photo'),
            subtitle: const Text('Use the camera'),
            onTap: () => Navigator.pop(ctx, ImageSource.camera),
          ),
          ListTile(
            leading: const Icon(Icons.photo_library_outlined),
            title: const Text('Choose from gallery'),
            subtitle: const Text('Pick an existing photo'),
            onTap: () => Navigator.pop(ctx, ImageSource.gallery),
          ),
          const SizedBox(height: 8),
        ],
      ),
    ),
  );
  if (source == null) {
    AppLog.d('media.pick', 'sheet_cancelled');
    return null;
  }
  AppLog.i('media.pick', 'source_selected', {'source': source.name});
  return pickImageWithSource(source);
}

Future<String?> pickImageWithSource(ImageSource source) async {
  try {
    if (source == ImageSource.camera) {
      final p = await Permission.camera.request();
      AppLog.d('media.pick', 'camera_permission', {'status': p.name});
      if (!p.isGranted) {
        showAppToast('Camera permission denied', long: true);
        return null;
      }
    } else {
      // Android 13+ photo picker often works without a permanent grant; still
      // request so older devices get storage access.
      final photos = await Permission.photos.request();
      AppLog.d('media.pick', 'photos_permission', {'status': photos.name});
      if (!photos.isGranted && !photos.isLimited) {
        final storage = await Permission.storage.request();
        AppLog.d('media.pick', 'storage_permission', {'status': storage.name});
        // Do not hard-fail: image_picker may still open the system photo picker.
      }
    }

    AppLog.i('media.pick', 'opening_image_picker', {'source': source.name});
    final x = await ImagePicker().pickImage(
      source: source,
      imageQuality: 85,
      maxWidth: 2048,
      maxHeight: 2048,
    );
    final path = x?.path;
    if (path == null || path.trim().isEmpty) {
      AppLog.w('media.pick', 'no_path_returned');
      showAppToast(
        'No photo selected. Try the camera if your gallery is empty.',
        long: true,
      );
      return null;
    }
    AppLog.i('media.pick', 'picked', {
      'ext': path.contains('.') ? path.split('.').last : 'unknown',
      'name': x?.name,
    });
    return path;
  } catch (e, st) {
    AppLog.e('media.pick', 'failed', error: e, stackTrace: st);
    showAppToast(
      'Could not open the photo picker. Try again or use the camera.',
      long: true,
    );
    return null;
  }
}
