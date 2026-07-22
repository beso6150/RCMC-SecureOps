/// About / credits shown on the About screen.
class AboutInfo {
  AboutInfo._();

  static const String productName = 'RCMC SecureOps';
  static const String developedBy = 'Bassam Alharbi';
  static const String phone = '0556728911';
  static const String email = 'bassam14s44@gmail.com';
  static const String version = '1.0.0';
  static const String copyright = '© 2026';

  static const List<String> displayLines = [
    productName,
    'Developed by $developedBy',
    phone,
    email,
    'v$version',
    copyright,
  ];
}
