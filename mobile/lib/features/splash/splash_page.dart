import "package:flutter/material.dart";

/// Écran d’amorçage (branding + futur chargement cache Hive / session).
class SplashPage extends StatelessWidget {
  const SplashPage({super.key});

  static const path = "/";
  static const name = "splash";

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("SIRH EVA")),
      body: const Center(
        child: Text(
          "Mobile Flutter — socle prêt.\nConfigurez API_BASE_URL et branchez l’auth.",
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}
