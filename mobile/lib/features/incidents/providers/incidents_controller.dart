import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rcmc_secureops/features/auth/providers/auth_controller.dart';
import 'package:rcmc_secureops/features/settings/presentation/settings_screen.dart';
import 'package:rcmc_secureops/models/incident.dart';
import 'package:rcmc_secureops/repositories/incidents_repository.dart';
import 'package:rcmc_secureops/services/incidents_api_service.dart';
import 'package:rcmc_secureops/services/location_service.dart';
import 'package:rcmc_secureops/services/sync_service.dart';
import 'package:uuid/uuid.dart';

final incidentLocationServiceProvider = Provider<LocationService>(
  (ref) => LocationService(),
);

enum IncidentListFilter { active, history, all, pendingSync }

class IncidentsListState {
  const IncidentsListState({
    this.items = const [],
    this.types = const [],
    this.filter = IncidentListFilter.active,
    this.search = '',
    this.isLoading = false,
    this.errorMessage,
    this.isOnline = true,
  });

  final List<IncidentRecord> items;
  final List<IncidentTypeOption> types;
  final IncidentListFilter filter;
  final String search;
  final bool isLoading;
  final String? errorMessage;
  final bool isOnline;

  List<IncidentRecord> get visible {
    return items.where((v) {
      if (search.isNotEmpty) {
        final q = search.trim();
        final hay =
            '${v.title}${v.description}${v.typeLabelAr}${v.reporter?.fullName ?? ''}';
        if (!hay.contains(q)) return false;
      }
      switch (filter) {
        case IncidentListFilter.active:
          return v.status.isOpen;
        case IncidentListFilter.history:
          return v.status.isTerminal;
        case IncidentListFilter.pendingSync:
          return v.pendingSync;
        case IncidentListFilter.all:
          return true;
      }
    }).toList();
  }

  IncidentsListState copyWith({
    List<IncidentRecord>? items,
    List<IncidentTypeOption>? types,
    IncidentListFilter? filter,
    String? search,
    bool? isLoading,
    String? errorMessage,
    bool clearError = false,
    bool? isOnline,
  }) {
    return IncidentsListState(
      items: items ?? this.items,
      types: types ?? this.types,
      filter: filter ?? this.filter,
      search: search ?? this.search,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      isOnline: isOnline ?? this.isOnline,
    );
  }
}

final incidentsControllerProvider =
    StateNotifierProvider<IncidentsController, IncidentsListState>((ref) {
      return IncidentsController(ref);
    });

class IncidentsController extends StateNotifier<IncidentsListState> {
  IncidentsController(this.ref) : super(const IncidentsListState()) {
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

  IncidentsRepository get _repo => ref.read(incidentsRepositoryProvider);

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
      final types = await _repo.loadTypes(online: online);
      state = state.copyWith(types: types);

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
    } catch (_) {}
  }

  void setFilter(IncidentListFilter filter) {
    state = state.copyWith(filter: filter);
  }

  void setSearch(String value) {
    state = state.copyWith(search: value);
  }

  Future<IncidentRecord> submitDraft(CreateIncidentDraft draft) async {
    final user = ref.read(authControllerProvider).user;
    final clientSyncId = const Uuid().v4();
    final now = DateTime.now();

    final record = IncidentRecord(
      id: clientSyncId,
      title: draft.title.trim(),
      description: draft.description.trim(),
      notes: draft.notes?.trim(),
      status: IncidentStatus.newStatus,
      priority: draft.priority,
      typeId: draft.typeId,
      typeCode: draft.typeCode,
      typeNameAr: draft.typeNameAr,
      parkingCode: draft.parkingCode,
      floorId: draft.floorId,
      floorNameAr: draft.floorNameAr,
      meetingRoomId: draft.meetingRoomId,
      meetingRoomNameAr: draft.meetingRoomNameAr,
      shiftId: draft.shiftId ?? user?.shiftId,
      shiftNameAr: draft.shiftNameAr ?? user?.shiftNameAr,
      gpsLatitude: draft.gpsLatitude,
      gpsLongitude: draft.gpsLongitude,
      occurredAt: draft.occurredAt,
      createdAt: now,
      clientSyncId: clientSyncId,
      pendingSync: false,
      reporter: user == null
          ? null
          : IncidentPerson(
              id: user.id,
              fullName: user.fullName,
              employeeNumber: user.employeeNumber,
            ),
      attachments: draft.attachments,
    );

    final online = state.isOnline;
    final saved = await _repo.create(draft: record, online: online);
    state = state.copyWith(items: _repo.readLocal());
    return saved;
  }

  Future<IncidentRecord> closeIncident(String id, {String? notes}) async {
    final closed = await _repo.closeIncident(id, notes: notes);
    state = state.copyWith(items: _repo.readLocal());
    return closed;
  }

  Future<IncidentRecord> startIncident(String id) async {
    final started = await _repo.startIncident(id);
    state = state.copyWith(items: _repo.readLocal());
    return started;
  }

  Future<IncidentRecord> addComment(String id, String body) async {
    final updated = await _repo.addComment(id, body);
    state = state.copyWith(items: _repo.readLocal());
    return updated;
  }

  Future<String> downloadPdf(String id) async {
    return _repo.downloadAndOpenPdf(id);
  }
}

final incidentDetailProvider = FutureProvider.family<IncidentRecord, String>((
  ref,
  id,
) async {
  return ref.watch(incidentsRepositoryProvider).getById(id);
});

final incidentTypesProvider = FutureProvider<List<IncidentTypeOption>>((
  ref,
) async {
  final online = ref
      .watch(connectivityProvider)
      .maybeWhen(data: (v) => v, orElse: () => true);
  return ref.watch(incidentsRepositoryProvider).loadTypes(online: online);
});

final facilityFloorsProvider = FutureProvider<List<FacilityFloor>>((ref) async {
  return ref.watch(incidentsApiServiceProvider).listFloors();
});

final facilityRoomsProvider =
    FutureProvider.family<List<FacilityMeetingRoom>, String?>((ref, floorId) {
      return ref
          .watch(incidentsApiServiceProvider)
          .listMeetingRooms(floorId: floorId);
    });
