import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../core/utils/picked_file_path.dart';
import '../../core/utils/toast.dart';

/// Selfie only — camera or gallery (images).
Future<String?> pickImageFromSheet(BuildContext context) async {
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
  return pickImageWithSource(source);
}

/// Camera or gallery image; shared by [pickImageFromSheet] and [pickPdfOrImageDocument].
Future<String?> pickImageWithSource(ImageSource source) async {
  try {
    if (source == ImageSource.camera) {
      final p = await Permission.camera.request();
      if (!p.isGranted) {
        showAppToast('Camera permission denied', long: true);
        return null;
      }
    } else {
      final p = await Permission.photos.request();
      if (!p.isGranted && !p.isLimited) {
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
    debugPrint('pickImageWithSource: picked path=$path');
    return path;
  } catch (e, st) {
    debugPrint('pickImageWithSource failed: $e\n$st');
    showAppToast(
      'Could not open your photo picker. Please try again.',
      long: true,
    );
    return null;
  }
}

enum _PdfOrImageChoice { camera, gallery, file }

/// ID, licence, proof of residence, bank statement — camera, gallery, or PDF/image file.
Future<String?> pickPdfOrImageDocument(BuildContext context) async {
  final choice = await showModalBottomSheet<_PdfOrImageChoice>(
    context: context,
    builder: (ctx) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: const Icon(Icons.photo_camera),
            title: const Text('Camera'),
            onTap: () => Navigator.pop(ctx, _PdfOrImageChoice.camera),
          ),
          ListTile(
            leading: const Icon(Icons.photo_library),
            title: const Text('Gallery'),
            onTap: () => Navigator.pop(ctx, _PdfOrImageChoice.gallery),
          ),
          ListTile(
            leading: const Icon(Icons.picture_as_pdf_outlined),
            title: const Text('PDF or image file'),
            subtitle: const Text('Choose from Downloads, Drive, etc.'),
            onTap: () => Navigator.pop(ctx, _PdfOrImageChoice.file),
          ),
        ],
      ),
    ),
  );
  if (choice == null) return null;
  switch (choice) {
    case _PdfOrImageChoice.camera:
      return pickImageWithSource(ImageSource.camera);
    case _PdfOrImageChoice.gallery:
      return pickImageWithSource(ImageSource.gallery);
    case _PdfOrImageChoice.file:
      return pickRegistrationFile();
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
