import React from 'react';
import { Cloud, RefreshCw, UploadCloud, DownloadCloud } from 'lucide-react';
import type { GymData } from '../types';
import type { CloudTrainingSync } from '../utils/useCloudTrainingSync';
import { trainingCounts } from '../utils/cloudTrainingData';

export function CloudTrainingSyncPanel({ data, sync }: { data: GymData; sync: CloudTrainingSync }) {
  const busy = sync.status === 'busy';
  const summary = (value: GymData | null) => {
    const count = trainingCounts(value);
    return `${count.weeks} tygodni · ${count.exercises} ćwiczeń · ${count.sessions} treningów · ${count.measurements} pomiarów`;
  };
  const buttonClass = 'min-h-11 px-3 py-2 rounded-xl border border-sky-500/30 bg-sky-950/40 text-sky-100 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40';
  return (
    <section className="rounded-2xl border border-sky-500/30 bg-slate-950 p-4 space-y-4" aria-label="Kopia treningów w chmurze" id="cloud-training-sync-panel">
      <h3 className="text-base font-bold text-sky-100 flex items-center gap-2"><Cloud className="w-5 h-5" /> Treningi w chmurze</h3>
      <p className="text-sm text-slate-300">Kopia obejmuje plany, historię treningów, pomiary i notatki kalendarza. Profile, wyniki badań, protokoły, rozmowy AI, ustawienia i klucze API pozostają lokalne.</p>
      <p role="status" className={`text-sm ${sync.status === 'verified' ? 'text-emerald-300' : sync.status === 'error' || sync.status === 'conflict' ? 'text-amber-300' : 'text-slate-300'}`}>{sync.message}</p>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-slate-900 p-3"><strong className="block text-slate-100">Na urządzeniu</strong><span className="text-slate-300">{summary(data)}</span></div>
        <div className="rounded-xl bg-slate-900 p-3"><strong className="block text-slate-100">Na koncie Google</strong><span className="text-slate-300">{sync.remote ? summary(sync.remote.data) : sync.remote === null ? 'Brak kopii' : 'Jeszcze nie sprawdzono'}</span></div>
      </div>
      {sync.checkedAt && <p className="text-xs text-slate-400">Ostatni odczyt: {new Date(sync.checkedAt).toLocaleString('pl-PL')}{sync.remote && ` · wersja ${sync.remote.revision}`}</p>}
      {!sync.available && <p className="text-sm text-amber-300">Zaloguj się ponownie przez Google, aby uzyskać aktywną sesję serwera.</p>}
      <div className="flex flex-wrap gap-2">
        <button id="btn-cloud-inspect" className={buttonClass} disabled={busy || !sync.available} onClick={() => void sync.inspect()}><RefreshCw className="w-4 h-4" /> Sprawdź kopię</button>
        <button id="btn-cloud-upload" className={buttonClass} disabled={busy || !sync.available} onClick={() => void sync.inspect('upload')}><UploadCloud className="w-4 h-4" /> Zapisz kopię</button>
        <button id="btn-cloud-restore" className={buttonClass} disabled={busy || !sync.available || Boolean(data.activeSessionDraft)} onClick={() => void sync.inspect('restore')}><DownloadCloud className="w-4 h-4" /> Przywróć kopię</button>
      </div>
      {sync.confirmation && !busy && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 space-y-3" role="group" aria-label="Potwierdzenie synchronizacji">
          <p className="text-sm text-amber-100">{sync.confirmation === 'upload'
            ? 'Zapisać dane z tego urządzenia na zalogowanym koncie Google? Istniejąca kopia na tym koncie zostanie zastąpiona. Sprawdź liczby powyżej.'
            : 'Zastąpić lokalne treningi kopią z tego konta? Najpierw powstanie lokalna kopia zapasowa. Ustawienia i logowanie pozostaną bez zmian.'}</p>
          <div className="flex flex-wrap gap-2">
            <button id="btn-cloud-confirm" className={buttonClass} onClick={() => void sync.confirm()}>{sync.confirmation === 'upload' ? 'Potwierdzam zapis' : 'Utwórz kopię i przywróć'}</button>
            <button className={buttonClass} onClick={sync.cancel}>Anuluj</button>
          </div>
        </div>
      )}
      <label className="flex items-start gap-3 text-sm text-slate-300">
        <input type="checkbox" className="mt-1 w-5 h-5" checked={sync.autoSync} disabled={!sync.canEnableAuto || busy}
          onChange={(event) => sync.setAutoSync(event.target.checked)} />
        <span>Synchronizuj zmiany podczas tej sesji. Włącz po pierwszym potwierdzonym zapisie lub przywróceniu. Przy konflikcie synchronizacja zatrzyma się i poprosi o wybór wersji.</span>
      </label>
      <details className="rounded-xl border border-slate-700 p-3 text-sm space-y-3">
        <summary className="min-h-11 cursor-pointer text-sky-200">Diagnostyka trwałego zapisu Firestore</summary>
        <p className="text-slate-300">Test tworzy osobny rekord techniczny, sprawdza zapis, odczyt, aktualizację i konflikt, a następnie usuwa rekord i sprawdza usunięcie. Nie wysyła ani nie zmienia Twoich treningów.</p>
        <button id="btn-cloud-diagnostic" className={buttonClass} disabled={!sync.available || sync.diagnostic.running || busy}
          onClick={() => void sync.runDiagnostic()}>{sync.diagnostic.running ? 'Trwa rzeczywisty test…' : 'Uruchom test Firestore'}</button>
        <p role="status" className="text-slate-300">{sync.diagnostic.running ? 'RUNNING' : sync.diagnostic.error || (sync.diagnostic.report ? sync.diagnostic.report.status.toUpperCase() : 'NOT RUN')}</p>
        {sync.diagnostic.report && <div className="space-y-2">
          {sync.diagnostic.report.steps.map((step, index) => <p key={`${step.name}-${index}`} className={step.status === 'pass' ? 'text-emerald-300' : 'text-amber-300'}>{step.name}: {step.status.toUpperCase()} · {step.latencyMs} ms{step.error ? ` · ${step.error}` : ''}</p>)}
          <p className="text-xs text-slate-400 break-all">Test: {new Date(sync.diagnostic.report.checkedAt).toLocaleString('pl-PL')} · żądanie: {sync.diagnostic.report.requestId || 'nie podano'}</p>
          {sync.diagnostic.report.status === 'fail' && <p className="text-xs text-amber-300 break-all">Rekord diagnostyczny: {sync.diagnostic.report.documentId}. Sprawdź wynik cleanup; nie usuwaj danych treningowych.</p>}
        </div>}
      </details>
    </section>
  );
}
