import { useRef, useState, type ChangeEvent } from 'react'
import { exportService } from '../../services/exportService'
import { ImportError } from '../../services/errors'
import { applyBackup, buildBackupPreview, parseBackup, type BackupPreview, type ConflictResolution, type ImportSummary, type ParsedBackup } from '../../services/importService'
import { generateSampleData } from '../../services/sampleDataService'
import { Button } from '../../ui/components/Button'
import { Card } from '../../ui/components/Card'
import { Modal } from '../../ui/components/Modal'
import { downloadBlob } from '../../ui/download'
import { useTheme, type ThemePreference } from '../../ui/theme/ThemeContext'
import styles from './SettingsPage.module.css'

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
]

type ImportStep =
  | { kind: 'idle' }
  | { kind: 'preview'; parsed: ParsedBackup; preview: BackupPreview }
  | { kind: 'result'; summary: ImportSummary }
  | { kind: 'error'; message: string }

export function SettingsPage() {
  const { preference, setPreference } = useTheme()
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string>()
  const [importStep, setImportStep] = useState<ImportStep>({ kind: 'idle' })
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution>('skip')
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [generatingSampleData, setGeneratingSampleData] = useState(false)

  const handleExport = async () => {
    setExportError(undefined)
    setExporting(true)
    try {
      const { blob, filename } = await exportService.createBackup()
      downloadBlob(blob, filename)
    } catch {
      setExportError('Export fehlgeschlagen. Bitte erneut versuchen.')
    } finally {
      setExporting(false)
    }
  }

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const parsed = await parseBackup(file)
      const preview = await buildBackupPreview(parsed)
      setConflictResolution('skip')
      setImportStep({ kind: 'preview', parsed, preview })
    } catch (err) {
      setImportStep({
        kind: 'error',
        message: err instanceof ImportError ? err.message : 'Sicherung konnte nicht gelesen werden.',
      })
    }
  }

  const handleConfirmImport = async () => {
    if (importStep.kind !== 'preview') return
    setImporting(true)
    try {
      const summary = await applyBackup(importStep.parsed, conflictResolution)
      setImportStep({ kind: 'result', summary })
    } catch {
      setImportStep({ kind: 'error', message: 'Import fehlgeschlagen. Es wurden keine Daten überschrieben.' })
    } finally {
      setImporting(false)
    }
  }

  const closeImportModal = () => setImportStep({ kind: 'idle' })

  const handleGenerateSampleData = async () => {
    if (!window.confirm('Beispieldaten zum bestehenden Inventar hinzufügen?')) return
    setGeneratingSampleData(true)
    try {
      await generateSampleData()
    } finally {
      setGeneratingSampleData(false)
    }
  }

  return (
    <div className={styles.page}>
      <h1>Einstellungen</h1>

      <Card>
        <h2 className={styles.sectionTitle}>Daten</h2>
        <div className={styles.row}>
          <div>
            <p className={styles.rowLabel}>Sicherung exportieren</p>
            <p className={styles.rowHint}>Alle Gegenstände, Orte, Kategorien, Fotos und Dokumente als ZIP-Datei.</p>
          </div>
          <Button variant="primary" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exportiert…' : 'Exportieren'}
          </Button>
        </div>
        {exportError && (
          <p className={styles.error} role="alert">
            {exportError}
          </p>
        )}

        <div className={styles.row}>
          <div>
            <p className={styles.rowLabel}>Sicherung importieren</p>
            <p className={styles.rowHint}>Stellt Daten aus einer zuvor exportierten ZIP-Datei wieder her.</p>
          </div>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Datei wählen
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,application/zip"
            hidden
            onChange={handleFileSelected}
            aria-label="Sicherungsdatei wählen"
          />
        </div>
      </Card>

      <Card>
        <h2 className={styles.sectionTitle}>Darstellung</h2>
        <div className={styles.themeOptions} role="radiogroup" aria-label="Erscheinungsbild">
          {THEME_OPTIONS.map((option) => (
            <label key={option.value} className={styles.themeOption}>
              <input
                type="radio"
                name="theme"
                value={option.value}
                checked={preference === option.value}
                onChange={() => setPreference(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </Card>

      {import.meta.env.DEV && (
        <Card>
          <h2 className={styles.sectionTitle}>Entwicklung</h2>
          <div className={styles.row}>
            <div>
              <p className={styles.rowLabel}>Beispieldaten</p>
              <p className={styles.rowHint}>Nur im Entwicklungsmodus sichtbar.</p>
            </div>
            <Button variant="secondary" onClick={handleGenerateSampleData} disabled={generatingSampleData}>
              {generatingSampleData ? 'Erstellt…' : 'Beispieldaten laden'}
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <h2 className={styles.sectionTitle}>Über Keller</h2>
        <p className={styles.rowHint}>Version 1.0 · Offline-first · Alle Daten bleiben lokal auf diesem Gerät.</p>
      </Card>

      <Modal
        open={importStep.kind !== 'idle'}
        title={
          importStep.kind === 'result'
            ? 'Import abgeschlossen'
            : importStep.kind === 'error'
              ? 'Import fehlgeschlagen'
              : 'Sicherung importieren'
        }
        onClose={closeImportModal}
      >
        {importStep.kind === 'error' && (
          <div className={styles.modalBody}>
            <p className={styles.error}>{importStep.message}</p>
            <div className={styles.formActions}>
              <Button variant="primary" onClick={closeImportModal}>
                OK
              </Button>
            </div>
          </div>
        )}

        {importStep.kind === 'preview' && (
          <div className={styles.modalBody}>
            <p>Diese Sicherung enthält:</p>
            <ul className={styles.summaryList}>
              <li>{importStep.preview.counts.items} Gegenstände</li>
              <li>{importStep.preview.counts.locations} Orte</li>
              <li>{importStep.preview.counts.categories} Kategorien</li>
              <li>{importStep.preview.counts.tags} Tags</li>
              <li>{importStep.preview.counts.photos} Fotos</li>
              <li>{importStep.preview.counts.documents} Dokumente</li>
            </ul>

            {Object.values(importStep.preview.conflicts).some((count) => count > 0) && (
              <div className={styles.conflictBox}>
                <p>
                  Einige Einträge existieren bereits ({importStep.preview.conflicts.items} Gegenstände,{' '}
                  {importStep.preview.conflicts.locations} Orte, {importStep.preview.conflicts.categories}{' '}
                  Kategorien betroffen). Wie soll verfahren werden?
                </p>
                <label className={styles.radioRow}>
                  <input
                    type="radio"
                    name="conflict"
                    checked={conflictResolution === 'skip'}
                    onChange={() => setConflictResolution('skip')}
                  />
                  Vorhandene Daten behalten
                </label>
                <label className={styles.radioRow}>
                  <input
                    type="radio"
                    name="conflict"
                    checked={conflictResolution === 'overwrite'}
                    onChange={() => setConflictResolution('overwrite')}
                  />
                  Mit Sicherung überschreiben
                </label>
              </div>
            )}

            <div className={styles.formActions}>
              <Button variant="ghost" onClick={closeImportModal}>
                Abbrechen
              </Button>
              <Button variant="primary" onClick={handleConfirmImport} disabled={importing}>
                {importing ? 'Importiert…' : 'Importieren'}
              </Button>
            </div>
          </div>
        )}

        {importStep.kind === 'result' && (
          <div className={styles.modalBody}>
            <ul className={styles.summaryList}>
              <li>{importStep.summary.imported.items} Gegenstände importiert</li>
              <li>{importStep.summary.imported.locations} Orte importiert</li>
              <li>{importStep.summary.imported.categories} Kategorien importiert</li>
              <li>{importStep.summary.imported.photos} Fotos importiert</li>
              <li>{importStep.summary.imported.documents} Dokumente importiert</li>
            </ul>
            {Object.values(importStep.summary.skipped).some((count) => count > 0) && (
              <p className={styles.rowHint}>Bereits vorhandene Einträge wurden übersprungen.</p>
            )}
            {importStep.summary.missingFiles.length > 0 && (
              <p className={styles.error}>
                {importStep.summary.missingFiles.length} Datei(en) fehlten in der Sicherung und wurden
                ausgelassen.
              </p>
            )}
            <div className={styles.formActions}>
              <Button variant="primary" onClick={closeImportModal}>
                Fertig
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
