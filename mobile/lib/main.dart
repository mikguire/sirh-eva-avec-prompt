import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:hive_flutter/hive_flutter.dart";

import "app.dart";
import "core/session/session_repository.dart";

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await Hive.openBox<dynamic>(SessionRepository.boxName);
  runApp(const ProviderScope(child: EvaApp()));
}
