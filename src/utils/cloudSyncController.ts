import type { GymData } from '../types';
import type { ServerDataEnvelope } from './serverApi';
import { cloudTrainingSnapshot, restoreCloudTraining, trainingFingerprint } from './cloudTrainingData';

export type CloudSyncStatus = 'idle' | 'busy' | 'verified' | 'pending' | 'conflict' | 'error';
export interface CloudSyncState {
  status: CloudSyncStatus;
  message: string;
  checkedAt?: string;
  remote?: ServerDataEnvelope | null;
  confirmation?: 'upload' | 'restore';
}
interface Dependencies {
  read: () => Promise<ServerDataEnvelope | null>;
  write: (data: GymData, expected: { revision: number; contentHash: string | null }) => Promise<ServerDataEnvelope>;
  local: () => GymData;
  backup: (data: GymData) => Promise<void>;
  apply: (data: GymData, expectedFingerprint: string, ensureCurrent: () => void) => Promise<void>;
  current: () => boolean;
  restoringAllowed: () => boolean;
  change: (state: CloudSyncState) => void;
}

export class CloudSyncController {
  private locked = false;
  private lastFingerprint: string | null = null;
  private staged: { direction: 'upload' | 'restore'; remote: ServerDataEnvelope | null; local: GymData; fingerprint: string } | null = null;
  state: CloudSyncState = { status: 'idle', message: 'Zapis lokalny. Kopia w chmurze nie została jeszcze sprawdzona.' };

  constructor(private readonly deps: Dependencies) {}
  get established() { return this.lastFingerprint !== null; }
  private publish(state: CloudSyncState) {
    if (!this.deps.current()) return;
    this.state = state;
    this.deps.change(state);
  }
  private assertCurrent() {
    if (!this.deps.current()) throw new Error('Sesja zmieniła się. Zaloguj ponownie i sprawdź kopię.');
  }
  private async run(work: () => Promise<void>) {
    if (this.locked) return;
    this.locked = true;
    this.publish({ ...this.state, status: 'busy', message: 'Łączenie z magazynem chmurowym…' });
    try { this.assertCurrent(); await work(); }
    catch (error) {
      const status = (error as { status?: number }).status;
      const message = status === 409 ? 'Kopia na serwerze zmieniła się. Sprawdź ją ponownie i wybierz, którą wersję zachować.'
        : status === 401 ? 'Sesja wygasła. Zaloguj ponownie, aby połączyć dane z tym kontem.'
        : error instanceof Error && !/fetch|network|timeout|abort|server_http|cloud_store/i.test(error.message) ? error.message
        : 'Nie udało się połączyć z chmurą. Dane lokalne są zachowane; spróbuj ponownie po odzyskaniu połączenia.';
      this.publish({ ...this.state, status: status === 409 ? 'conflict' : 'error', message, confirmation: undefined });
      this.staged = null;
    } finally { this.locked = false; }
  }

  async inspect(direction?: 'upload' | 'restore') {
    await this.run(async () => {
      const remote = await this.deps.read();
      this.assertCurrent();
      const local = cloudTrainingSnapshot(this.deps.local());
      if (direction === 'restore' && !remote) throw new Error('Na tym koncie nie ma jeszcze kopii treningów.');
      this.staged = direction ? { direction, remote, local, fingerprint: trainingFingerprint(local) } : null;
      this.publish({ status: 'pending', remote, checkedAt: new Date().toISOString(), confirmation: direction,
        message: remote ? 'Odczyt kopii z serwera potwierdzony. Porównaj dane przed zapisem lub przywróceniem.'
          : 'Magazyn odpowiada. To konto nie ma jeszcze kopii treningów.' });
    });
  }

  cancel() {
    this.staged = null;
    this.publish({ ...this.state, confirmation: undefined, message: 'Operacja anulowana. Dane nie zostały zmienione.' });
  }

  async confirm() {
    const staged = this.staged;
    if (!staged) return;
    await this.run(async () => {
      if (trainingFingerprint(this.deps.local()) !== staged.fingerprint) {
        throw new Error('Dane lokalne zmieniły się od podglądu. Sprawdź kopię ponownie.');
      }
      if (staged.direction === 'upload') {
        if (!this.deps.restoringAllowed()) throw new Error('Zakończ aktywny trening przed zapisem kopii.');
        await this.upload(staged.local, staged.remote);
      } else {
        if (!this.deps.restoringAllowed()) throw new Error('Zakończ aktywny trening przed przywróceniem kopii.');
        const fresh = await this.deps.read();
        this.assertCurrent();
        if (!fresh || fresh.revision !== staged.remote!.revision || fresh.contentHash !== staged.remote!.contentHash) {
          throw Object.assign(new Error('conflict'), { status: 409 });
        }
        await this.restore(fresh, staged.fingerprint);
      }
      this.staged = null;
    });
  }

  private async upload(local: GymData, remote: ServerDataEnvelope | null) {
    this.assertCurrent();
    const saved = await this.deps.write(local, { revision: remote?.revision || 0, contentHash: remote?.contentHash || null });
    this.assertCurrent();
    const verified = await this.deps.read();
    this.assertCurrent();
    if (!verified || verified.revision !== saved.revision || verified.contentHash !== saved.contentHash
        || trainingFingerprint(verified.data) !== trainingFingerprint(local)) {
      throw new Error('Zapis wysłano, ale odczyt potwierdzający się nie zgadza. Sprawdź kopię przed ponowieniem.');
    }
    this.lastFingerprint = trainingFingerprint(local);
    this.publish({ status: 'verified', remote: verified, checkedAt: new Date().toISOString(),
      message: 'Kopia treningów zapisana w chmurze i potwierdzona ponownym odczytem.' });
  }

  private async restore(remote: ServerDataEnvelope, expectedFingerprint: string) {
    this.assertCurrent();
    if (!this.deps.restoringAllowed()) throw new Error('Zakończ aktywny trening przed przywróceniem kopii.');
    const local = this.deps.local();
    if (trainingFingerprint(local) !== expectedFingerprint) throw new Error('Dane lokalne zmieniły się. Sprawdź kopię ponownie.');
    await this.deps.backup(local);
    this.assertCurrent();
    if (trainingFingerprint(this.deps.local()) !== expectedFingerprint) throw new Error('Dane lokalne zmieniły się podczas tworzenia kopii. Sprawdź kopię ponownie.');
    if (!this.deps.restoringAllowed()) throw new Error('Zakończ aktywny trening przed przywróceniem kopii.');
    await this.deps.apply(restoreCloudTraining(this.deps.local(), remote.data), expectedFingerprint, () => this.assertCurrent());
    this.assertCurrent();
    this.lastFingerprint = trainingFingerprint(remote.data);
    this.publish({ status: 'verified', remote, checkedAt: new Date().toISOString(),
      message: 'Przywrócono treningi z chmury. Poprzednie dane są w lokalnych kopiach zapasowych.' });
  }

  async reconcile() {
    if (!this.established || this.staged) return;
    await this.run(async () => {
      if (!this.deps.restoringAllowed()) {
        this.publish({ ...this.state, status: 'pending', message: 'Synchronizacja poczeka na zakończenie aktywnego treningu.' });
        return;
      }
      const remote = await this.deps.read();
      this.assertCurrent();
      const local = cloudTrainingSnapshot(this.deps.local());
      const localPrint = trainingFingerprint(local);
      const remotePrint = remote ? trainingFingerprint(remote.data) : null;
      if (!remote || (localPrint !== this.lastFingerprint && remotePrint !== this.lastFingerprint && localPrint !== remotePrint)) {
        throw Object.assign(new Error('conflict'), { status: 409 });
      }
      if (localPrint === remotePrint) {
        this.lastFingerprint = localPrint;
        this.publish({ status: 'verified', remote, checkedAt: new Date().toISOString(), message: 'Treningi na urządzeniu i w chmurze są zgodne.' });
      } else if (remotePrint === this.lastFingerprint) {
        await this.upload(local, remote);
      } else if (this.deps.restoringAllowed()) {
        await this.restore(remote, localPrint);
      } else {
        this.publish({ status: 'pending', remote, message: 'W chmurze są nowsze dane. Pobieranie czeka na zakończenie aktywnego treningu.' });
      }
    });
  }
}
