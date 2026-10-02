const fs = require('node:fs');
const path = require('node:path');

const VALID_BODY_PARTS = new Set(['biceps', 'triceps', 'klata', 'barki', 'nogi']);
const VALID_CIRCUMFERENCE_PARTS = new Set(['klatka', 'talia', 'biodra', 'udo', 'łydka', 'ramię']);

function validate(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Data must be an object');
  }
  if (!data.settings || typeof data.settings !== 'object') {
    throw new Error('settings must be an object');
  }
  if (!Array.isArray(data.weeks)) {
    throw new Error('weeks must be an array');
  }

  for (const week of data.weeks) {
    if (!week || typeof week !== 'object') throw new Error('week must be an object');
    if (typeof week.id !== 'string') throw new Error('week.id must be string');
    if (!Array.isArray(week.days)) throw new Error('week.days must be array');
    for (const day of week.days) {
      if (!day || typeof day !== 'object') throw new Error('day must be an object');
      if (typeof day.id !== 'string') throw new Error('day.id must be string');
      if (!Array.isArray(day.exercises)) throw new Error('day.exercises must be array');
      for (const ex of day.exercises) {
        if (!ex || typeof ex !== 'object') throw new Error('exercise must be an object');
        if (typeof ex.name !== 'string') throw new Error('exercise.name must be string');
        if (typeof ex.weight !== 'number' || Number.isNaN(ex.weight)) {
          throw new Error('exercise.weight must be a valid number');
        }
      }
    }
  }

  if (data.bodyPartMeasurements) {
    if (!Array.isArray(data.bodyPartMeasurements)) {
      throw new Error('bodyPartMeasurements must be an array');
    }
    for (const m of data.bodyPartMeasurements) {
      if (!m || typeof m !== 'object') throw new Error('measurement must be an object');
      if (!VALID_BODY_PARTS.has(m.part)) {
        throw new Error(`Invalid bodyPart: ${m.part}`);
      }
      if (typeof m.value !== 'number' || m.value <= 0 || Number.isNaN(m.value)) {
        throw new Error(`Invalid measurement value: ${m.value}`);
      }
    }
  }

  if (data.circumferences) {
    if (!Array.isArray(data.circumferences)) {
      throw new Error('circumferences must be an array');
    }
    for (const c of data.circumferences) {
      if (!c || typeof c !== 'object') throw new Error('circumference must be an object');
      if (!VALID_CIRCUMFERENCE_PARTS.has(c.bodyPart)) {
        throw new Error(`Invalid circumference bodyPart: ${c.bodyPart}`);
      }
      if (!Number.isInteger(c.millimeters) || c.millimeters <= 0) {
        throw new Error(`Invalid circumference millimeters: ${c.millimeters}`);
      }
    }
  }

  return true;
}

let backupSequence = 0;

class Store {
  constructor(dir) {
    this.dir = dir;
    this.primaryFile = path.join(dir, 'workout_data.json');
    this.backupDir = path.join(dir, 'backups');
    fs.mkdirSync(this.dir, { recursive: true });
    fs.mkdirSync(this.backupDir, { recursive: true });
  }

  load() {
    if (!fs.existsSync(this.primaryFile)) {
      return null;
    }
    const content = fs.readFileSync(this.primaryFile, 'utf8');
    const parsed = JSON.parse(content);
    validate(parsed);
    return parsed;
  }

  save(data) {
    validate(data);
    const existing = fs.existsSync(this.primaryFile) ? fs.readFileSync(this.primaryFile, 'utf8') : null;
    if (existing) {
      try {
        const parsedExisting = JSON.parse(existing);
        this.backup(parsedExisting, 'auto');
      } catch (e) {
        // preserve corrupted file
      }
    }
    const jsonStr = JSON.stringify(data, null, 2);
    const tempFile = `${this.primaryFile}.${Date.now()}.tmp`;
    fs.writeFileSync(tempFile, jsonStr, 'utf8');
    fs.renameSync(tempFile, this.primaryFile);
    return true;
  }

  migrate(jsonString) {
    if (fs.existsSync(this.primaryFile)) {
      return false; // never overwrite existing primary
    }
    const parsed = JSON.parse(jsonString);
    validate(parsed);
    this.backup(parsed, 'migration');
    fs.writeFileSync(this.primaryFile, JSON.stringify(parsed, null, 2), 'utf8');
    return true;
  }

  backup(data, reason = 'auto') {
    validate(data);
    const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(++backupSequence).padStart(4, '0');
    const fileName = `gymtracker_${reason}_${dateTag}_${Date.now()}_${seq}.json`;
    const targetPath = path.join(this.backupDir, fileName);
    fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf8');

    // Retention: maxBackupFiles from settings
    const maxFiles = (data.settings && data.settings.maxBackupFiles) || 5;
    const allFiles = fs.readdirSync(this.backupDir);
    const appBackups = allFiles.filter(f => f.startsWith('gymtracker_')).sort();
    if (appBackups.length > maxFiles) {
      const toDelete = appBackups.slice(0, appBackups.length - maxFiles);
      for (const f of toDelete) {
        fs.unlinkSync(path.join(this.backupDir, f));
      }
    }
    return fileName;
  }

  syncBackups(entries) {
    for (const entry of entries) {
      const normalized = path.normalize(entry.fileName);
      if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
        throw new Error('Invalid backup filename escape attempt');
      }
      validate(entry.data);
      fs.writeFileSync(path.join(this.backupDir, normalized), JSON.stringify(entry.data, null, 2), 'utf8');
    }
  }
}

module.exports = {
  Store,
  validate
};
