import 'package:hive/hive.dart';

part 'vitals_model.g.dart';

@HiveType(typeId: 0)
class VitalsModel extends HiveObject {
  @HiveField(0) String patientId;
  @HiveField(1) int? heartRate;
  @HiveField(2) double? spo2;
  @HiveField(3) int? systolicBp;
  @HiveField(4) int? diastolicBp;
  @HiveField(5) double? temperature;
  @HiveField(6) int? respiratoryRate;
  @HiveField(7) String? consciousness;
  @HiveField(8) int news2Score;
  @HiveField(9) bool synced;
  @HiveField(10) DateTime recordedAt;

  VitalsModel({
    required this.patientId,
    this.heartRate,
    this.spo2,
    this.systolicBp,
    this.diastolicBp,
    this.temperature,
    this.respiratoryRate,
    this.consciousness = 'A',
    this.news2Score = 0,
    this.synced = false,
    required this.recordedAt,
  });
}
