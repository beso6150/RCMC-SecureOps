# RCMC SecureOps Mobile

Visible name: **المشرف الأمني الذكي** · Version **1.0.0+20**

## Stack

- Flutter 3.35+ · Material 3 · Riverpod · GoRouter
- Dio (JWT + single-flight refresh + Idempotency-Key)
- Hive + SQLite SyncQueue · Socket.IO · local notifications
- mobile_scanner (QR patrol checkpoints)

## Run

```bash
cd D:\RCMC-SecureOps\mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1
```

Android emulator uses `10.0.2.2` to reach host localhost. iOS simulator can use `http://127.0.0.1:3000/api/v1`. Physical device: use your LAN IP.

## Debug APK

```bash
flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1
```

Output path:

`D:\RCMC-SecureOps\mobile\build\app\outputs\flutter-apk\app-debug.apk`

## Sprint 20 highlights

- SyncEngine with SQLite `SyncQueueItem`, mutex, batch `/mobile/sync/batch`, conflict → Arabic + server wins
- Role bottom nav (guard / supervisor / CCTV) · SOS (never fake success offline)
- Patrols + QR · CCTV referrals/permits · handover drafts · communications outbox
- Tasks: accept / start / wait / complete / reject + evidence
- About: RCMC SecureOps · Bassam Alharbi · 0556728911 · bassam14s44@gmail.com · v1.0.0 · © 2026

## Login

Use seeded backend users (national ID + employee number + password). First login forces password change.

Tokens are stored **only** in `flutter_secure_storage`. Do not hardcode production secrets.
