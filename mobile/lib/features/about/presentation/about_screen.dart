import 'package:flutter/material.dart';
import 'package:rcmc_secureops/core/constants/about_info.dart';
import 'package:url_launcher/url_launcher.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('حول التطبيق')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(
            AboutInfo.productName,
            key: const Key('about_product_name'),
            textAlign: TextAlign.center,
            style: Theme.of(
              context,
            ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 16),
          Text(
            'Developed by ${AboutInfo.developedBy}',
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          InkWell(
            onTap: () => launchUrl(Uri.parse('tel:${AboutInfo.phone}')),
            child: Text(
              AboutInfo.phone,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
          ),
          const SizedBox(height: 8),
          InkWell(
            onTap: () => launchUrl(Uri.parse('mailto:${AboutInfo.email}')),
            child: Text(
              AboutInfo.email,
              textAlign: TextAlign.center,
              style: TextStyle(color: Theme.of(context).colorScheme.primary),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'v${AboutInfo.version}',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(AboutInfo.copyright, textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
