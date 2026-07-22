import 'dart:convert';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;

/// Triggers a browser download of [jsonContent] as [filename].
Future<void> downloadJsonFile({
  required String filename,
  required String jsonContent,
}) async {
  final bytes = utf8.encode(jsonContent);
  final blob = html.Blob([bytes], 'application/json');
  final url = html.Url.createObjectUrlFromBlob(blob);
  html.AnchorElement(href: url)
    ..download = filename
    ..click();
  html.Url.revokeObjectUrl(url);
}

/// Opens a native file picker and invokes [onLoaded] with the file's text
/// content once read. No-ops if the user cancels the picker.
Future<void> pickJsonFile(Future<void> Function(String content) onLoaded) async {
  final input = html.FileUploadInputElement()
    ..accept = '.json,application/json';
  input.click();
  await input.onChange.first;

  final file = input.files?.first;
  if (file == null) return;

  final reader = html.FileReader();
  reader.readAsText(file);
  await reader.onLoad.first;
  final content = reader.result as String?;
  if (content == null) return;

  await onLoaded(content);
}
