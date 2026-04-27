import 'package:flutter/material.dart';
import '../models/vitals_model.dart';
import '../services/sync_service.dart';

int computeNews2({int? rr, double? spo2, int? sbp, int? hr, double? temp, String? consciousness}) {
  int score = 0;
  if (rr != null) {
    if (rr <= 8 || rr >= 25) score += 3;
    else if (rr >= 21) score += 2;
    else if (rr <= 11) score += 1;
  }
  if (spo2 != null) {
    if (spo2 <= 91) score += 3;
    else if (spo2 <= 93) score += 2;
    else if (spo2 <= 95) score += 1;
  }
  if (sbp != null) {
    if (sbp <= 90 || sbp >= 220) score += 3;
    else if (sbp <= 100) score += 2;
    else if (sbp <= 110) score += 1;
  }
  if (hr != null) {
    if (hr <= 40 || hr >= 131) score += 3;
    else if (hr >= 111) score += 2;
    else if (hr <= 50 || hr >= 91) score += 1;
  }
  if (temp != null) {
    if (temp <= 35.0) score += 3;
    else if (temp >= 39.1) score += 2;
    else if (temp >= 38.1 || temp <= 36.0) score += 1;
  }
  if (consciousness != null && consciousness != 'A') score += 3;
  return score;
}

class VitalsScreen extends StatefulWidget {
  final String patientId;
  const VitalsScreen({super.key, required this.patientId});

  @override
  State<VitalsScreen> createState() => _VitalsScreenState();
}

class _VitalsScreenState extends State<VitalsScreen> {
  final _hrCtrl = TextEditingController();
  final _spo2Ctrl = TextEditingController();
  final _sbpCtrl = TextEditingController();
  final _tempCtrl = TextEditingController();
  final _rrCtrl = TextEditingController();
  String _consciousness = 'A';
  int _news2 = 0;
  bool _saved = false;

  void _recalculate() {
    setState(() {
      _news2 = computeNews2(
        rr: int.tryParse(_rrCtrl.text),
        spo2: double.tryParse(_spo2Ctrl.text),
        sbp: int.tryParse(_sbpCtrl.text),
        hr: int.tryParse(_hrCtrl.text),
        temp: double.tryParse(_tempCtrl.text),
        consciousness: _consciousness,
      );
    });
  }

  Future<void> _save() async {
    final v = VitalsModel(
      patientId: widget.patientId,
      heartRate: int.tryParse(_hrCtrl.text),
      spo2: double.tryParse(_spo2Ctrl.text),
      systolicBp: int.tryParse(_sbpCtrl.text),
      temperature: double.tryParse(_tempCtrl.text),
      respiratoryRate: int.tryParse(_rrCtrl.text),
      consciousness: _consciousness,
      news2Score: _news2,
      recordedAt: DateTime.now(),
    );
    await SyncService.enqueue(v);
    setState(() => _saved = true);
    if (_news2 >= 5 && mounted) {
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('⚠️ Referral Needed'),
          content: Text('NEWS2 score is $_news2. Patient needs urgent referral.'),
          actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK'))],
        ),
      );
    }
  }

  Widget _field(String label, TextEditingController ctrl, {String? hint}) {
    return TextFormField(
      controller: ctrl,
      keyboardType: TextInputType.number,
      decoration: InputDecoration(labelText: label, hintText: hint, border: const OutlineInputBorder()),
      onChanged: (_) => _recalculate(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final color = _news2 >= 7 ? Colors.red : _news2 >= 5 ? Colors.orange : _news2 >= 1 ? Colors.yellow.shade700 : Colors.green;
    return Scaffold(
      appBar: AppBar(title: Text('Vitals — ${widget.patientId}')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: color),
            ),
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text('NEWS2 Score', style: TextStyle(color: color, fontWeight: FontWeight.w600)),
              const SizedBox(width: 12),
              Text('$_news2', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: color)),
            ]),
          ),
          const SizedBox(height: 16),
          _field('Heart Rate (bpm)', _hrCtrl, hint: '60–100'),
          const SizedBox(height: 12),
          _field('SpO₂ (%)', _spo2Ctrl, hint: '95–100'),
          const SizedBox(height: 12),
          _field('Systolic BP (mmHg)', _sbpCtrl),
          const SizedBox(height: 12),
          _field('Temperature (°C)', _tempCtrl, hint: '36.5–37.5'),
          const SizedBox(height: 12),
          _field('Respiratory Rate', _rrCtrl, hint: '12–20'),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _consciousness,
            decoration: const InputDecoration(labelText: 'Consciousness (AVPU)', border: OutlineInputBorder()),
            items: ['A', 'V', 'P', 'U'].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
            onChanged: (v) { setState(() => _consciousness = v!); _recalculate(); },
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _save,
              child: Text(_saved ? '✓ Saved (will sync when online)' : 'Save Vitals'),
            ),
          ),
        ]),
      ),
    );
  }
}
