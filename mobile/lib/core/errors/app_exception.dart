class AppException implements Exception {
  const AppException(this.message, {this.code, this.statusCode});

  final String message;
  final String? code;
  final int? statusCode;

  @override
  String toString() => message;
}

class NetworkException extends AppException {
  const NetworkException(super.message, {super.code, super.statusCode});
}

class UnauthorizedException extends AppException {
  const UnauthorizedException([super.message = 'غير مصرح'])
    : super(code: 'UNAUTHORIZED', statusCode: 401);
}

class ValidationException extends AppException {
  const ValidationException(super.message, {this.details})
    : super(code: 'VALIDATION_ERROR', statusCode: 400);

  final Object? details;
}
