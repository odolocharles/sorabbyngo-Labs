import 'dart:convert';
import 'package:hive/hive.dart';
import 'package:http/http.dart' as http;
import 'package:connectivity_plus/connectivity_plus.dart';
import '../models/vitals_model.dart';

const API_BASE = 'http://api.sorabbyngo.io';

class SyncService {
  static final _box = Hive.box<VitalsModel>('pending_vitals');

  static Future<void> enqueue(VitalsModel v) async {
    await _box.add(v);
  }

  static Future<void> syncPending(String token) async {
    final conn = await Connectivity().checkConnectivity();
    if (conn == ConnectivityResult.none) return;

    final pending = _box.values.where((v) => !v.synced).toList();
    for (final v in pending) {
      try {
        final resp = await http.post(
          Uri.parse('$API_BASE:8002/vitals/'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
          body: jsonEncode({
            'patient_id': v.patientId,
            'ward': 'CHW',
            'heart_rate': v.heartRate,
            'spo2': v.spo2,
            'systolic_bp': v.systolicBp,
            'temperature': v.temperature,
            'respiratory_rate': v.respiratoryRate,
            'consciousness': v.consciousness,
          }),
        );
        if (resp.statusCode < 300) {
          v.synced = true;
          await v.save();
        }
      } catch (_) {}
    }
  }
}
