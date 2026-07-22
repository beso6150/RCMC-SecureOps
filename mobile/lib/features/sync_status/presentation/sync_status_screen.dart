import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:rcmc_secureops/core/sync/sync_queue_models.dart';
import 'package:rcmc_secureops/services/sqlite_service.dart';
import 'package:rcmc_secureops/services/sync_service.dart';
import 'package:rcmc_secureops/widgets/common_widgets.dart';

class SyncStatusScreen extends ConsumerStatefulWidget {
  const SyncStatusScreen({super.key});

  @override
  ConsumerState<SyncStatusScreen> createState() => _SyncStatusScreenState();
}

class _SyncStatusScreenState extends ConsumerState<SyncStatusScreen> {
  List<SyncQueueItem> _items = const [];
  var _loading = true;
  var _syncing = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final items = await ref.read(sqliteServiceProvider).listSyncQueue();
    if (mounted) {
      setState(() {
        _items = items;
        _loading = false;
      });
    }
  }

  Future<void> _runSync() async {
    setState(() => _syncing = true);
    try {
      final result = await ref
          .read(syncServiceProvider)
          .runSync(trigger: 'manual');
      if (!mounted) return;
      if (result.conflictMessage != null) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(result.conflictMessage!)));
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              result.skipped
                  ? 'المزامنة قيد التنفيذ بالفعل'
                  : 'تمت المزامنة — ${result.flushed} عنصر',
            ),
          ),
        );
      }
      await _load();
    } finally {
      if (mounted) setState(() => _syncing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final online = ref.watch(connectivityAwareOnlineProvider);
    final lastSync = ref.watch(syncServiceProvider).lastSyncAt();

    return Scaffold(
      appBar: AppBar(
        title: const Text('حالة المزامنة'),
        actions: [
          IconButton(
            onPressed: _syncing ? null : _runSync,
            icon: _syncing
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.sync),
          ),
        ],
      ),
      body: _loading
          ? const AppLoadingView()
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          online ? 'متصل بالخادم' : 'غير متصل',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ),
                      ConnectionBadge(isConnected: online),
                    ],
                  ),
                  const SizedBox(height: 8),
                  FutureBuilder(
                    future: lastSync,
                    builder: (context, snap) {
                      final at = snap.data;
                      final label = at == null
                          ? 'لم تتم المزامنة بعد'
                          : DateFormat('yyyy/MM/dd HH:mm', 'ar').format(at);
                      return Text('آخر مزامنة: $label');
                    },
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'قائمة الانتظار (${_items.length})',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (_items.isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(top: 40),
                      child: Center(child: Text('لا توجد عناصر معلّقة')),
                    )
                  else
                    ..._items.map((item) {
                      return Card(
                        child: ListTile(
                          title: Text(
                            '${item.operationType} · ${item.entityType}',
                          ),
                          subtitle: Text(
                            [
                              item.status.labelAr,
                              if (item.failureReason != null)
                                item.failureReason!,
                              'محاولات: ${item.retryCount}/${item.maxRetries}',
                            ].join('\n'),
                          ),
                          isThreeLine: item.failureReason != null,
                        ),
                      );
                    }),
                ],
              ),
            ),
    );
  }
}
