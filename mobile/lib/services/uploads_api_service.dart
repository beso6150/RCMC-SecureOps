import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/core/network/dio_client.dart';

final uploadsApiServiceProvider = Provider<UploadsApiService>((ref) {
  return UploadsApiService(ref.watch(dioProvider));
});

class UploadedFileMeta {
  const UploadedFileMeta({
    required this.storageKey,
    required this.url,
    required this.fileName,
    required this.mimeType,
    required this.fileSize,
  });

  final String storageKey;
  final String url;
  final String fileName;
  final String mimeType;
  final int fileSize;

  factory UploadedFileMeta.fromJson(Map<String, dynamic> json) {
    return UploadedFileMeta(
      storageKey: json['storageKey']?.toString() ?? '',
      url: json['url']?.toString() ?? '',
      fileName: json['fileName']?.toString() ?? '',
      mimeType: json['mimeType']?.toString() ?? 'application/octet-stream',
      fileSize: (json['fileSize'] as num?)?.toInt() ?? 0,
    );
  }
}

class UploadsApiService {
  UploadsApiService(this._dio);

  final Dio _dio;

  Future<UploadedFileMeta> uploadLocalFile({
    required String localPath,
    required String fileName,
    String mimeType = 'image/jpeg',
    String folder = 'attachments',
  }) async {
    final file = File(localPath);
    if (!await file.exists()) {
      throw Exception('الملف المحلي غير موجود');
    }
    final bytes = await file.readAsBytes();
    final contentBase64 = base64Encode(bytes);
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/uploads',
        data: {
          'fileName': fileName,
          'mimeType': mimeType,
          'contentBase64': contentBase64,
          'folder': folder,
        },
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) throw Exception('تعذر رفع الملف');
      return UploadedFileMeta.fromJson(data);
    } catch (e) {
      throw mapDioError(e);
    }
  }
}
