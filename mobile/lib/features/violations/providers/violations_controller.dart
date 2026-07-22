import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/features/auth/providers/auth_controller.dart';
import 'package:rcmc_secureops/features/settings/presentation/settings_screen.dart';
import 'package:rcmc_secureops/models/violation.dart';
import 'package:rcmc_secureops/repositories/violations_repository.dart';
import 'package:rcmc_secureops/services/location_service.dart';
import 'package:rcmc_secureops/services/ocr_service.dart';
import 'package:rcmc_secureops/services/sync_service.dart';
import 'package:uuid/uuid.dart';

final ocrServiceProvider = Provider<OcrService>(
  (ref) => ManualPlateOcrService(),
);
final locationServiceProvider = Provider<LocationService>(
  (ref) => LocationService(),
);

enum ViolationListFilter { all, today, open, resolved }

class ViolationsListState {
  const ViolationsListState({
    this.items = const [],
    this.filter = ViolationListFilter.today,
    this.search = '',
    this.parkingFilter,
    this.isLoading = false,
    this.errorMessage,
    this.isOnline = true,
  });

  final List<ViolationRecord> items;
  final ViolationListFilter filter;
  final String search;
  final ParkingArea? parkingFilter;
  final bool isLoading;
  final String? errorMessage;
  final bool isOnline;

  List<ViolationRecord> get visible {
    final now = DateTime.now();
    final start = DateTime(now.year, now.month, now.day);
    final end = start.add(const Duration(days: 1));

    return items.where((v) {
      if (search.isNotEmpty) {
        final q = search.trim();
        final hay =
            '${v.plateNumber}${v.arabicPlate ?? ''}${v.englishPlate ?? ''}';
        if (!hay.contains(q)) return false;
      }
      if (parkingFilter != null && v.parkingCode != parkingFilter) return false;
      switch (filter) {
        case ViolationListFilter.today:
          return !v.createdAt.isBefore(start) && v.createdAt.isBefore(end);
        case ViolationListFilter.open:
          return v.status == ViolationStatus.newStatus ||
              v.status == ViolationStatus.assigned ||
              v.status == ViolationStatus.inProgress;
        case ViolationListFilter.resolved:
          return v.status == ViolationStatus.resolved;
        case ViolationListFilter.all:
          return true;
      }
    }).toList();
  }

  ViolationsListState copyWith({
    List<ViolationRecord>? items,
    ViolationListFilter? filter,
    String? search,
    ParkingArea? parkingFilter,
    bool clearParking = false,
    bool? isLoading,
    String? errorMessage,
    bool clearError = false,
    bool? isOnline,
  }) {
    return ViolationsListState(
      items: items ?? this.items,
      filter: filter ?? this.filter,
      search: search ?? this.search,
      parkingFilter: clearParking
          ? null
          : (parkingFilter ?? this.parkingFilter),
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      isOnline: isOnline ?? this.isOnline,
    );
  }
}

final violationsControllerProvider =
    StateNotifierProvider<ViolationsController, ViolationsListState>((ref) {
      return ViolationsController(ref);
    });

class ViolationsController extends StateNotifier<ViolationsListState> {
  ViolationsController(this.ref) : super(const ViolationsListState()) {
    _connectivitySub = ref.listen<AsyncValue<bool>>(connectivityProvider, (
      _,
      next,
    ) {
      final online = next.maybeWhen(
        data: (v) => v,
        orElse: () => state.isOnline,
      );
      state = state.copyWith(isOnline: online);
      if (online) {
        unawaited(syncPending());
      }
    });
    unawaited(refresh());
  }

  final Ref ref;
  late final ProviderSubscription<AsyncValue<bool>> _connectivitySub;

  ViolationsRepository get _repo => ref.read(violationsRepositoryProvider);

  @override
  void dispose() {
    _connectivitySub.close();
    super.dispose();
  }

  Future<void> refresh() async {
    state = state.copyWith(isLoading: true, clearError: true);
    final local = _repo.readLocal();
    state = state.copyWith(items: local);

    try {
      final online = ref
          .read(connectivityProvider)
          .maybeWhen(data: (v) => v, orElse: () => true);
      state = state.copyWith(isOnline: online);
      if (online) {
        await _repo.syncPending();
        final items = await _repo.fetchAndCache();
        state = state.copyWith(items: items, isLoading: false);
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(
        items: _repo.readLocal(),
        isLoading: false,
        errorMessage: e.toString(),
      );
    }
  }

  Future<void> syncPending() async {
    final syncEnabled = ref.read(settingsControllerProvider).offlineSyncEnabled;
    if (!syncEnabled) return;
    try {
      await _repo.syncPending();
      state = state.copyWith(items: _repo.readLocal());
    } catch (_) {
      // Keep local pending items.
    }
  }

  void setFilter(ViolationListFilter filter) {
    state = state.copyWith(filter: filter);
  }

  void setSearch(String value) {
    state = state.copyWith(search: value);
  }

  void setParkingFilter(ParkingArea? area) {
    if (area == null) {
      state = state.copyWith(clearParking: true);
    } else {
      state = state.copyWith(parkingFilter: area);
    }
  }

  Future<ViolationRecord> submitDraft(CreateViolationDraft draft) async {
    final user = ref.read(authControllerProvider).user;
    final clientSyncId = const Uuid().v4();
    final fileName = 'violation_${DateTime.now().millisecondsSinceEpoch}.jpg';

    final record = ViolationRecord(
      id: clientSyncId,
      plateNumber: draft.plateNumber.trim().isEmpty
          ? (draft.englishPlate ?? draft.arabicPlate ?? 'UNKNOWN')
          : draft.plateNumber.trim().toUpperCase(),
      arabicPlate: draft.arabicPlate,
      englishPlate: draft.englishPlate,
      ocrResult: draft.ocrResult,
      ocrConfidence: draft.ocrConfidence,
      vehicleColor: draft.vehicleColor,
      violationType: draft.violationType,
      parkingCode: draft.parkingCode,
      status: ViolationStatus.newStatus,
      notes: draft.notes,
      imagePath: draft.imageLocalPath,
      gpsLatitude: draft.gpsLatitude,
      gpsLongitude: draft.gpsLongitude,
      createdAt: draft.capturedAt,
      clientSyncId: clientSyncId,
      pendingSync: false,
      createdBy: user == null
          ? null
          : ViolationPerson(
              id: user.id,
              fullName: user.fullName,
              employeeNumber: user.employeeNumber,
            ),
      attachments: [
        ViolationAttachment(
          id: clientSyncId,
          fileName: fileName,
          storageKey: 'local/$clientSyncId/$fileName',
          imagePath: draft.imageLocalPath,
          localPath: draft.imageLocalPath,
          fileSize: 0,
        ),
      ],
    );

    final online = state.isOnline;
    final saved = await _repo.create(draft: record, online: online);
    state = state.copyWith(items: _repo.readLocal());
    return saved;
  }
}

final violationDetailProvider = FutureProvider.family<ViolationRecord, String>((
  ref,
  id,
) async {
  return ref.watch(violationsRepositoryProvider).getById(id);
});
