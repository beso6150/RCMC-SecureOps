import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:rcmc_secureops/services/cctv_ops_api_service.dart';
import 'package:rcmc_secureops/widgets/common_widgets.dart';

class CctvReferralDetailsScreen extends ConsumerWidget {
  const CctvReferralDetailsScreen({super.key, required this.referralId});

  final String referralId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('تفاصيل الإحالة')),
      body: FutureBuilder(
        future: ref.read(cctvOpsApiServiceProvider).getReferral(referralId),
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const AppLoadingView();
          }
          if (snap.hasError) {
            return Center(child: Text('${snap.error}'));
          }
          final item = snap.data!;
          final time = DateFormat(
            'yyyy/MM/dd HH:mm',
            'ar',
          ).format(item.createdAt);
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                item.title,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              Chip(label: Text(item.status)),
              const SizedBox(height: 12),
              Text(item.body ?? '—'),
              const SizedBox(height: 16),
              Text('الوقت: $time'),
            ],
          );
        },
      ),
    );
  }
}
