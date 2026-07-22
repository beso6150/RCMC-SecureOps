import 'package:flutter/material.dart';
import 'package:rcmc_secureops/features/incidents/presentation/incident_create_screen.dart';

/// إثبات حالة — specialized create flow locked to CASE_PROOF type.
class CaseProofScreen extends StatelessWidget {
  const CaseProofScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const IncidentCreateScreen(
      presetTypeCode: 'CASE_PROOF',
      titleOverride: 'إثبات حالة',
    );
  }
}
