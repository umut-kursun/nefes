/// Future-facing AI Coach port — stub for M1.
abstract class AiCoachPort {
  Future<String> ask(String question);
}

class NoopAiCoachPort implements AiCoachPort {
  const NoopAiCoachPort();

  @override
  Future<String> ask(String question) async {
    throw UnimplementedError('AI Coach is not available in Milestone M1');
  }
}
