import 'dart:developer' show log;
import 'dart:io';
import 'dart:math' show Random;

import 'package:file_picker/file_picker.dart';

/// Android (scoped storage) and some providers return [PlatformFile.path] as
/// null while data is only in [PlatformFile.bytes]. Materialize to a temp
/// file so [File] reads work for upload.
Future<String?> materializePickedFile(PlatformFile file) async {
  log(
    'materializePickedFile start name=${file.name} '
    'hasPath=${file.path != null} bytes=${file.bytes?.length ?? 0} size=${file.size}',
    name: 'PickedFilePath',
  );
  final rawPath = file.path;
  if (rawPath != null && rawPath.trim().isNotEmpty) {
    final f = File(rawPath);
    if (await f.exists()) {
      log('materializePickedFile using rawPath=$rawPath', name: 'PickedFilePath');
      return rawPath;
    }
  }
  final bytes = file.bytes;
  if (bytes != null && bytes.isNotEmpty) {
    final safeName = file.name.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
    final tmp = File(
      '${Directory.systemTemp.path}/driver_pick_${Random().nextInt(0x7fffffff)}_$safeName',
    );
    await tmp.writeAsBytes(bytes, flush: true);
    log('materializePickedFile wrote tmp=${tmp.path} bytes=${bytes.length}', name: 'PickedFilePath');
    return tmp.path;
  }
  log(
    'materializePickedFile: no readable path or bytes (name=${file.name})',
    name: 'PickedFilePath',
  );
  return null;
}
