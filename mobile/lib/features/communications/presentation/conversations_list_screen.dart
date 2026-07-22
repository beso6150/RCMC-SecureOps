import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rcmc_secureops/services/communications_api_service.dart';
import 'package:rcmc_secureops/widgets/common_widgets.dart';

final conversationsProvider = FutureProvider<List<ConversationSummary>>((
  ref,
) async {
  return ref.watch(communicationsApiServiceProvider).listConversations();
});

class ConversationsListScreen extends ConsumerWidget {
  const ConversationsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(conversationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('الرسائل'),
        actions: [
          IconButton(
            onPressed: () => ref.invalidate(conversationsProvider),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: async.when(
        loading: () => const AppLoadingView(message: 'جاري التحميل...'),
        error: (e, _) => Center(child: Text('تعذر التحميل: $e')),
        data: (items) {
          if (items.isEmpty) {
            return const Center(child: Text('لا توجد محادثات'));
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(conversationsProvider);
              await ref.read(conversationsProvider.future);
            },
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, i) {
                final c = items[i];
                return Card(
                  child: ListTile(
                    title: Text(c.title),
                    subtitle: Text(c.lastMessage ?? '—'),
                    trailing: c.unreadCount > 0
                        ? Badge(label: Text('${c.unreadCount}'))
                        : const Icon(Icons.chevron_left),
                    onTap: () => context.push('/communications/${c.id}'),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
