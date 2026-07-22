/// Domain / data failure types for NEFES.
sealed class Failure implements Exception {
  const Failure(this.message);

  final String message;

  @override
  String toString() => message;
}

final class DatabaseFailure extends Failure {
  const DatabaseFailure([super.message = 'Database error']);
}

final class UnexpectedFailure extends Failure {
  const UnexpectedFailure([super.message = 'Unexpected error']);
}
