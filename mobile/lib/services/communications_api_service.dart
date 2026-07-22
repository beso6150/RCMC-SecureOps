import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/core/network/dio_client.dart';
import 'package:rcmc_secureops/services/sync_service.dart';
import 'package:uuid/uuid.dart';

final communicationsApiServiceProvider = Provider<CommunicationsApiService>((
  ref,
) {
  return CommunicationsApiService(
    dio: ref.watch(dioProvider),
    sync: ref.watch(syncServiceProvider),
    online: () => ref.read(connectivityAwareOnlineProvider),
  );
});

class ConversationSummary {
  const ConversationSummary({
    required this.id,
    required this.title,
    this.lastMessage,
    this.unreadCount = 0,
  });

  final String id;
  final String title;
  final String? lastMessage;
  final int unreadCount;

  factory ConversationSummary.fromJson(Map<String, dynamic> json) {
    return ConversationSummary(
      id: json['id']?.toString() ?? '',
      title:
          json['title']?.toString() ?? json['nameAr']?.toString() ?? 'محادثة',
      lastMessage: json['lastMessage']?.toString(),
      unreadCount: (json['unreadCount'] as num?)?.toInt() ?? 0,
    );
  }
}

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.body,
    required this.createdAt,
    this.senderName,
    this.clientMessageId,
    this.pending = false,
  });

  final String id;
  final String body;
  final DateTime createdAt;
  final String? senderName;
  final String? clientMessageId;
  final bool pending;

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id']?.toString() ?? json['clientMessageId']?.toString() ?? '',
      body: json['body']?.toString() ?? '',
      createdAt:
          DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      senderName:
          json['senderName']?.toString() ??
          (json['sender'] is Map
              ? (json['sender'] as Map)['fullName']?.toString()
              : null),
      clientMessageId: json['clientMessageId']?.toString(),
      pending: json['pending'] == true,
    );
  }
}

class CommunicationsApiService {
  CommunicationsApiService({
    required this.dio,
    required this.sync,
    required this.online,
  });

  final Dio dio;
  final SyncService sync;
  final bool Function() online;
  final _uuid = const Uuid();

  Future<List<ConversationSummary>> listConversations() async {
    try {
      final response = await dio.get<Map<String, dynamic>>(
        '/communications/conversations',
      );
      final data = response.data?['data'] as List<dynamic>? ?? const [];
      return data
          .whereType<Map>()
          .map(
            (e) => ConversationSummary.fromJson(Map<String, dynamic>.from(e)),
          )
          .toList();
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<List<ChatMessage>> listMessages(String conversationId) async {
    try {
      final response = await dio.get<Map<String, dynamic>>(
        '/communications/conversations/$conversationId/messages',
      );
      final data = response.data?['data'] as List<dynamic>? ?? const [];
      return data
          .whereType<Map>()
          .map((e) => ChatMessage.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } catch (e) {
      throw mapDioError(e);
    }
  }

  Future<ChatMessage> sendMessage({
    required String conversationId,
    required String body,
  }) async {
    final clientMessageId = _uuid.v4();
    final payload = {
      'body': body,
      'clientMessageId': clientMessageId,
      'sentAt': DateTime.now().toIso8601String(),
    };

    if (!online()) {
      await sync.enqueue(
        entityType: 'message_send',
        operationType: 'message_send',
        endpoint: '/communications/conversations/$conversationId/messages',
        payload: payload,
      );
      return ChatMessage(
        id: clientMessageId,
        body: body,
        createdAt: DateTime.now(),
        clientMessageId: clientMessageId,
        pending: true,
      );
    }

    try {
      final response = await dio.post<Map<String, dynamic>>(
        '/communications/conversations/$conversationId/messages',
        data: payload,
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data != null) return ChatMessage.fromJson(data);
      return ChatMessage(
        id: clientMessageId,
        body: body,
        createdAt: DateTime.now(),
        clientMessageId: clientMessageId,
      );
    } catch (e) {
      throw mapDioError(e);
    }
  }
}
