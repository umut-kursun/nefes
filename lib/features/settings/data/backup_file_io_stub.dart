/// Non-web stub (VM test target) — file download/pick is web-only in V1.
Future<void> downloadJsonFile({
  required String filename,
  required String jsonContent,
}) async {
  throw UnsupportedError(
    'downloadJsonFile is only available on the web target.',
  );
}

Future<void> pickJsonFile(Future<void> Function(String content) onLoaded) async {
  throw UnsupportedError('pickJsonFile is only available on the web target.');
}
