import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';

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
  if (source == ImageSource.camera) {
    final p = await Permission.camera.request();
    if (!p.isGranted) return null;
  }
  final x = await ImagePicker().pickImage(source: source, imageQuality: 85);
  return x?.path;
}

Future<String?> pickRegistrationFile() async {
  final r = await FilePicker.platform.pickFiles(
    type: FileType.custom,
    allowedExtensions: const ['pdf', 'png', 'jpg', 'jpeg'],
    withData: false,
  );
  if (r == null || r.files.isEmpty) return null;
  return r.files.single.path;
}
