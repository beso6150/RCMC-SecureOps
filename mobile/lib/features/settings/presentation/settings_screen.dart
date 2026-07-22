import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:rcmc_secureops/core/config/app_config.dart';
import 'package:rcmc_secureops/core/constants/about_info.dart';
import 'package:rcmc_secureops/features/auth/providers/auth_controller.dart';
import 'package:rcmc_secureops/services/hive_cache_service.dart';
import 'package:rcmc_secureops/shared/providers/theme_locale_providers.dart';

final settingsControllerProvider =
    StateNotifierProvider<SettingsController, SettingsState>((ref) {
      return SettingsController(ref);
    });

class SettingsState {
  const SettingsState({
    this.notificationSound = true,
    this.offlineSyncEnabled = true,
    this.biometricReady = false,
    this.fontScale = 1.0,
  });

  final bool notificationSound;
  final bool offlineSyncEnabled;
  final bool biometricReady;
  final double fontScale;

  SettingsState copyWith({
    bool? notificationSound,
    bool? offlineSyncEnabled,
    bool? biometricReady,
    double? fontScale,
  }) {
    return SettingsState(
      notificationSound: notificationSound ?? this.notificationSound,
      offlineSyncEnabled: offlineSyncEnabled ?? this.offlineSyncEnabled,
      biometricReady: biometricReady ?? this.biometricReady,
      fontScale: fontScale ?? this.fontScale,
    );
  }
}

class SettingsController extends StateNotifier<SettingsState> {
  SettingsController(this.ref) : super(const SettingsState()) {
    final hive = ref.read(hiveCacheServiceProvider);
    state = SettingsState(
      notificationSound:
          hive.readSetting<bool>(StorageKeys.notificationSound) ?? true,
      offlineSyncEnabled:
          hive.readSetting<bool>(StorageKeys.offlineSyncEnabled) ?? true,
      biometricReady:
          hive.readSetting<bool>(StorageKeys.biometricLoginReady) ?? false,
      fontScale: hive.readSetting<double>(StorageKeys.fontScale) ?? 1.0,
    );

    final themeRaw = hive.readSetting<String>(StorageKeys.themeMode);
    if (themeRaw != null) {
      ref.read(themeModeProvider.notifier).state = switch (themeRaw) {
        'dark' => ThemeMode.dark,
        'light' => ThemeMode.light,
        _ => ThemeMode.system,
      };
    }
    ref.read(fontScaleProvider.notifier).state = state.fontScale;
  }

  final Ref ref;

  Future<void> setNotificationSound(bool value) async {
    state = state.copyWith(notificationSound: value);
    await ref
        .read(hiveCacheServiceProvider)
        .setSetting(StorageKeys.notificationSound, value);
  }

  Future<void> setOfflineSync(bool value) async {
    state = state.copyWith(offlineSyncEnabled: value);
    await ref
        .read(hiveCacheServiceProvider)
        .setSetting(StorageKeys.offlineSyncEnabled, value);
  }

  Future<void> setDarkMode(bool dark) async {
    final mode = dark ? ThemeMode.dark : ThemeMode.light;
    ref.read(themeModeProvider.notifier).state = mode;
    await ref
        .read(hiveCacheServiceProvider)
        .setSetting(StorageKeys.themeMode, dark ? 'dark' : 'light');
  }

  Future<void> setBiometricReady(bool value) async {
    state = state.copyWith(biometricReady: value);
    await ref
        .read(hiveCacheServiceProvider)
        .setSetting(StorageKeys.biometricLoginReady, value);
  }

  Future<void> setFontScale(double value) async {
    final clamped = value.clamp(0.85, 1.35);
    state = state.copyWith(fontScale: clamped);
    ref.read(fontScaleProvider.notifier).state = clamped;
    await ref
        .read(hiveCacheServiceProvider)
        .setSetting(StorageKeys.fontScale, clamped);
  }
}

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsControllerProvider);
    final controller = ref.read(settingsControllerProvider.notifier);
    final themeMode = ref.watch(themeModeProvider);
    final auth = ref.watch(authControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('الإعدادات')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: SwitchListTile.adaptive(
              secondary: const Icon(Icons.dark_mode_outlined),
              title: const Text('الوضع الداكن'),
              value: themeMode == ThemeMode.dark,
              onChanged: (v) => controller.setDarkMode(v),
            ),
          ),
          const SizedBox(height: 10),
          Card(
            child: ListTile(
              leading: const Icon(Icons.text_fields),
              title: const Text('حجم الخط'),
              subtitle: Slider(
                value: settings.fontScale,
                min: 0.85,
                max: 1.35,
                divisions: 10,
                label: settings.fontScale.toStringAsFixed(2),
                onChanged: controller.setFontScale,
              ),
            ),
          ),
          const SizedBox(height: 10),
          Card(
            child: SwitchListTile.adaptive(
              secondary: const Icon(Icons.sync),
              title: const Text('المزامنة دون اتصال'),
              subtitle: const Text('حفظ محلي ومزامنة تلقائية عند الاتصال'),
              value: settings.offlineSyncEnabled,
              onChanged: controller.setOfflineSync,
            ),
          ),
          const SizedBox(height: 10),
          Card(
            child: SwitchListTile.adaptive(
              secondary: const Icon(Icons.notifications_active_outlined),
              title: const Text('صوت الإشعارات'),
              value: settings.notificationSound,
              onChanged: controller.setNotificationSound,
            ),
          ),
          const SizedBox(height: 10),
          Card(
            child: ListTile(
              leading: const Icon(Icons.cloud_sync_outlined),
              title: const Text('حالة المزامنة'),
              trailing: const Icon(Icons.chevron_left),
              onTap: () => context.push('/sync-status'),
            ),
          ),
          const SizedBox(height: 10),
          Card(
            child: ListTile(
              leading: const Icon(Icons.info_outline),
              title: const Text('حول التطبيق'),
              subtitle: Text('${AboutInfo.productName}\nv${AboutInfo.version}'),
              trailing: const Icon(Icons.chevron_left),
              onTap: () => context.push('/about'),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: auth.isLoading
                ? null
                : () => ref.read(authControllerProvider.notifier).logout(),
            icon: const Icon(Icons.logout),
            label: const Text('تسجيل الخروج'),
          ),
          const SizedBox(height: 8),
          Text(
            '${AppConfig.appName} · build ${AppConfig.buildNumber}',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.labelSmall,
          ),
        ],
      ),
    );
  }
}
