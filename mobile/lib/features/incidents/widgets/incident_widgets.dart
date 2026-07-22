import 'package:flutter/material.dart';
import 'package:rcmc_secureops/models/incident.dart';
import 'package:rcmc_secureops/theme/app_theme.dart';

class IncidentStatusChip extends StatelessWidget {
  const IncidentStatusChip({
    super.key,
    required this.status,
    this.pendingSync = false,
  });

  final IncidentStatus status;
  final bool pendingSync;

  @override
  Widget build(BuildContext context) {
    final color = pendingSync ? AppColors.amber : status.color;
    final label = pendingSync ? 'بانتظار المزامنة' : status.labelAr;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
          color: color,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class IncidentPriorityChip extends StatelessWidget {
  const IncidentPriorityChip({super.key, required this.priority});

  final IncidentPriority priority;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: priority.color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        priority.labelAr,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
          color: priority.color,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class IncidentListTileCard extends StatelessWidget {
  const IncidentListTileCard({
    super.key,
    required this.incident,
    required this.onTap,
  });

  final IncidentRecord incident;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: scheme.surfaceContainerHighest.withValues(alpha: 0.45),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      incident.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  IncidentStatusChip(
                    status: incident.status,
                    pendingSync: incident.pendingSync,
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                incident.typeLabelAr,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  IncidentPriorityChip(priority: incident.priority),
                  const Spacer(),
                  if (incident.isSlaBreached)
                    Text(
                      'تجاوز SLA',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: AppColors.danger,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class AutoFillBanner extends StatelessWidget {
  const AutoFillBanner({
    super.key,
    required this.userName,
    required this.dateLabel,
    required this.timeLabel,
    required this.shiftLabel,
    this.gpsLabel,
  });

  final String userName;
  final String dateLabel;
  final String timeLabel;
  final String shiftLabel;
  final String? gpsLabel;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.primaryContainer.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'بيانات تلقائية',
            style: Theme.of(
              context,
            ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          _line(context, 'المستخدم', userName),
          _line(context, 'التاريخ', dateLabel),
          _line(context, 'الوقت', timeLabel),
          _line(context, 'الوردية', shiftLabel),
          if (gpsLabel != null) _line(context, 'الموقع', gpsLabel!),
        ],
      ),
    );
  }

  Widget _line(BuildContext context, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Text('$label: $value'),
    );
  }
}
