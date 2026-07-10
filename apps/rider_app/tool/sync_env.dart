import 'dart:io';

Future<void> main(List<String> args) async {
  final inputPath = _readArg(args, '--input') ?? '.env.local';
  final outputPath = _readArg(args, '--output') ?? 'assets/default.env';

  final inputFile = File(inputPath);
  if (!await inputFile.exists()) {
    stderr.writeln(
      'Missing $inputPath. Create it (copy from .env.example) before building.',
    );
    exitCode = 1;
    return;
  }

  final raw = await inputFile.readAsString();
  final normalized = _normalizeEnv(raw);
  final parsed = _parseEnv(normalized);

  final requiredKeys = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  final missing = requiredKeys.where((k) {
    final v = parsed[k];
    return v == null || v.trim().isEmpty || v.contains('your-project');
  }).toList();

  if (missing.isNotEmpty) {
    stderr.writeln(
      'Invalid env in $inputPath. Missing/placeholder keys: ${missing.join(', ')}',
    );
    exitCode = 1;
    return;
  }

  final outputFile = File(outputPath);
  await outputFile.parent.create(recursive: true);
  await outputFile.writeAsString(normalized);

  stdout.writeln('Wrote $outputPath from $inputPath');
}

String? _readArg(List<String> args, String key) {
  final i = args.indexOf(key);
  if (i == -1) return null;
  if (i + 1 >= args.length) return null;
  return args[i + 1];
}

String _normalizeEnv(String raw) {
  final lines = raw.replaceAll('\r\n', '\n').split('\n');
  final cleaned = <String>[];
  for (final line in lines) {
    final trimmed = line.trim();
    if (trimmed.isEmpty) continue;
    if (trimmed.startsWith('#')) continue;
    cleaned.add(trimmed);
  }

  return '${cleaned.join('\n')}\n';
}

Map<String, String> _parseEnv(String normalized) {
  final out = <String, String>{};
  for (final line in normalized.split('\n')) {
    if (line.trim().isEmpty) continue;
    final eq = line.indexOf('=');
    if (eq <= 0) continue;
    final key = line.substring(0, eq).trim();
    final value = line.substring(eq + 1).trim();
    if (key.isEmpty) continue;
    out[key] = value;
  }
  return out;
}
