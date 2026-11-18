import { useState, type DragEvent } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react';
import { Modal } from '@/staff/components/Modal';
import { useToast } from '@/staff/components/Toast';
import { Button, StatusBadge } from '@/staff/components/ui';
import { cn } from '@/staff/utils/cn';
import { downloadCsv, parseCsv, type CsvRow } from '@/staff/utils/csv';
import { errorMessage } from '@/staff/utils/format';

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const PREVIEW_LIMIT = 50;

export interface ImportField {
  key: string;
  label: string;
  required?: boolean;
}

export interface ImportSpec<T> {
  fileLabel: string;
  fields: ImportField[];
  validate: (row: CsvRow) => { value: T } | { error: string };
  describe: (value: T) => string;
  save: (items: T[]) => Promise<void>;
}

interface ImportDialogProps<T> {
  open: boolean;
  onClose: () => void;
  spec: ImportSpec<T>;
  onImported: (count: number) => void;
}

type Result<T> = { value: T; rowNumber: number } | { error: string; rowNumber: number };

interface Analysis<T> {
  fileName: string;
  missingHeaders: string[];
  results: Result<T>[];
}

function downloadTemplate<T>(spec: ImportSpec<T>): void {
  const name = spec.fileLabel.toLowerCase().replace(/\s+/g, '-');
  downloadCsv(`${name}-template.csv`, spec.fields.map((field) => field.label).join(',') + '\r\n');
}

export function ImportDialog<T>({ open, onClose, spec, onImported }: ImportDialogProps<T>) {
  const { notify } = useToast();
  const [analysis, setAnalysis] = useState<Analysis<T> | null>(null);
  const [fileError, setFileError] = useState<string | undefined>();
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);

  const reset = () => {
    setAnalysis(null);
    setFileError(undefined);
    setSaved(null);
    setSaving(false);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const readFile = async (file: File) => {
    setFileError(undefined);
    setSaved(null);
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
      setFileError('Choose a .csv file exported from a spreadsheet.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError('This file is larger than 2 MB. Split it into smaller files and import them one at a time.');
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.headers.length === 0) {
        setFileError('The file is empty. Add a header row and at least one record.');
        return;
      }
      const missingHeaders = spec.fields
        .filter((field) => field.required && !parsed.headers.includes(field.key))
        .map((field) => field.label);
      const results: Result<T>[] = parsed.rows.map((row, index) => {
        const rowNumber = index + 2;
        const outcome = spec.validate(row);
        return 'value' in outcome ? { value: outcome.value, rowNumber } : { error: outcome.error, rowNumber };
      });
      setAnalysis({ fileName: file.name, missingHeaders, results });
    } catch (err) {
      setFileError(errorMessage(err));
    }
  };

  const onFileChange = (files: FileList | null) => {
    const file = files?.[0];
    if (file) void readFile(file);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    onFileChange(event.dataTransfer.files);
  };

  const valid = analysis?.results.filter((result): result is Extract<Result<T>, { value: T }> => 'value' in result) ?? [];
  const invalid = analysis?.results.filter((result): result is Extract<Result<T>, { error: string }> => 'error' in result) ?? [];
  const canImport = !!analysis && analysis.missingHeaders.length === 0 && valid.length > 0 && !saving && saved === null;

  const confirm = async () => {
    if (!analysis || !canImport) return;
    setSaving(true);
    try {
      await spec.save(valid.map((result) => result.value));
      setSaved(valid.length);
      notify(`${valid.length} record${valid.length === 1 ? '' : 's'} imported.`);
      onImported(valid.length);
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="lg"
      title={`Import ${spec.fileLabel}`}
      description="Upload a CSV file, review every row, then confirm the import."
      footer={
        saved !== null ? (
          <Button onClick={handleClose}>Done</Button>
        ) : (
          <>
            <Button variant="outline" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={confirm} disabled={!canImport} loading={saving}>
              {valid.length > 0 ? `Import ${valid.length} record${valid.length === 1 ? '' : 's'}` : 'Import'}
            </Button>
          </>
        )
      }
    >
      {saved !== null ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-50 text-success-600">
            <CheckCircle2 className="h-6 w-6" aria-hidden />
          </span>
          <p className="text-base font-semibold text-ink">{saved} records imported</p>
          <p className="max-w-md text-sm text-muted">The list has been updated and saved to this browser.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              Required columns: <span className="font-medium text-ink">{spec.fields.filter((f) => f.required).map((f) => f.label).join(', ')}</span>
            </p>
            <Button variant="outline" size="sm" onClick={() => downloadTemplate(spec)}>
              <FileSpreadsheet className="h-4 w-4" aria-hidden />
              Download template
            </Button>
          </div>

          <label
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
              dragging ? 'border-primary-400 bg-primary-50' : 'border-border hover:border-primary-300 hover:bg-slate-50',
            )}
          >
            <Upload className="h-6 w-6 text-primary-600" aria-hidden />
            <span className="text-sm font-medium text-ink">Drop a CSV file here, or click to choose one</span>
            <span className="text-xs text-muted">Comma-separated values, up to 2 MB</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => {
                onFileChange(event.target.files);
                event.target.value = '';
              }}
            />
          </label>

          {fileError && (
            <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {fileError}
            </p>
          )}

          {analysis && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Summary label="File" value={analysis.fileName} />
                <Summary label="Ready to import" value={String(valid.length)} tone="success" />
                <Summary label="Skipped" value={String(invalid.length)} tone={invalid.length ? 'danger' : 'neutral'} />
              </div>

              {analysis.missingHeaders.length > 0 && (
                <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">
                  Missing required column{analysis.missingHeaders.length > 1 ? 's' : ''}: {analysis.missingHeaders.join(', ')}. Nothing can be imported until
                  the file has them.
                </p>
              )}

              {invalid.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="bg-danger-50 px-4 py-2 text-xs font-semibold text-danger-700">
                    Rows that will be skipped ({invalid.length})
                  </div>
                  <ul className="max-h-48 divide-y divide-border overflow-y-auto text-sm">
                    {invalid.slice(0, PREVIEW_LIMIT).map((result) => (
                      <li key={result.rowNumber} className="flex gap-3 px-4 py-2">
                        <span className="w-16 shrink-0 text-muted">Row {result.rowNumber}</span>
                        <span className="text-danger-700">{result.error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {valid.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="flex items-center justify-between bg-success-50 px-4 py-2 text-xs font-semibold text-success-700">
                    <span>Preview of rows to import</span>
                    <StatusBadge status="Valid" tone="success" />
                  </div>
                  <ul className="divide-y divide-border text-sm">
                    {valid.slice(0, 5).map((result) => (
                      <li key={result.rowNumber} className="flex gap-3 px-4 py-2">
                        <span className="w-16 shrink-0 text-muted">Row {result.rowNumber}</span>
                        <span className="min-w-0 truncate text-ink">{'value' in result ? spec.describe(result.value) : ''}</span>
                      </li>
                    ))}
                  </ul>
                  {valid.length > 5 && <p className="px-4 py-2 text-xs text-muted">and {valid.length - 5} more</p>}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function Summary({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'success' | 'danger' }) {
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <p className="text-xs text-muted">{label}</p>
      <p
        className={cn(
          'mt-1 truncate text-lg font-semibold',
          tone === 'success' && 'text-success-700',
          tone === 'danger' && 'text-danger-700',
          tone === 'neutral' && 'text-ink',
        )}
      >
        {value}
      </p>
    </div>
  );
}
