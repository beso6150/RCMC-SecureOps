import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:rcmc_secureops/app.dart';
import 'package:rcmc_secureops/services/hive_cache_service.dart';
import 'package:rcmc_secureops/services/push_notification_service.dart';
import 'package:rcmc_secureops/services/sqlite_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('ar');

  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  final container = ProviderContainer();
  await container.read(hiveCacheServiceProvider).init();
  await container.read(sqliteServiceProvider).database;
  await container.read(pushNotificationServiceProvider).init();

  runApp(
    UncontrolledProviderScope(
      container: container,
      child: const SecureOpsApp(),
    ),
  );
}
