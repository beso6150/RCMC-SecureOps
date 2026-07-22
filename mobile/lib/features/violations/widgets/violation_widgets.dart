import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:rcmc_secureops/models/violation.dart';

class ViolationStatusChip extends StatelessWidget {
  const ViolationStatusChip({
    super.key,
    required this.status,
    this.pendingSync = false,
  });

  final ViolationStatus status;
  final bool pendingSync;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 6,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: status.color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: status.color.withValues(alpha: 0.45)),
          ),
          child: Text(
            status.labelAr,
            style: TextStyle(
              color: status.color,
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
        ),
        if (pendingSync)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.brown.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(999),
            ),
            child: const Text(
              'بانتظار المزامنة',
              style: TextStyle(
                color: Colors.brown,
                fontWeight: FontWeight.w700,
                fontSize: 12,
              ),
            ),
          ),
      ],
    );
  }
}

class ViolationListTileCard extends StatelessWidget {
  const ViolationListTileCard({
    super.key,
    required this.violation,
    required this.onTap,
  });

  final ViolationRecord violation;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final date = DateFormat(
      'yyyy/MM/dd HH:mm',
      'ar',
    ).format(violation.createdAt);
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      violation.plateNumber,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  ViolationStatusChip(
                    status: violation.status,
                    pendingSync: violation.pendingSync,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                '${violation.parkingCode.labelAr} • ${violation.violationType.labelAr}',
              ),
              const SizedBox(height: 4),
              Text(date, style: Theme.of(context).textTheme.bodySmall),
              if (violation.assignedLabel.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  violation.assignedLabel,
                  style: Theme.of(context).textTheme.labelMedium,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
