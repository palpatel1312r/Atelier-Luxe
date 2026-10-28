import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useToast } from "../../context/ToastContext";

interface ImportResult {
  dry_run: boolean;
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
  preview: Array<{
    row: number;
    action: "create" | "update";
    id?: number;
    name: string;
  }>;
}

export default function AdminProductsImportExport() {
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const pickFile = () => fileRef.current?.click();

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (!f.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please select a .csv file");
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleExport = async () => {
    try {
      const blob = await api.adminExportProductsCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Catalog exported.");
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    }
  };

  const handleTemplate = async () => {
    try {
      const blob = await api.adminDownloadProductsTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "products-template.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Template downloaded.");
    } catch (e: any) {
      toast.error(e.message || "Template download failed");
    }
  };

  const runImport = async (dry: boolean) => {
    if (!file) {
      toast.error("Choose a CSV file first");
      return;
    }
    setBusy(true);
    try {
      const res = await api.adminImportProductsCsv(file, { dry });
      setResult(res);
      if (dry) {
        toast.success(`Preview: ${res.total} row(s) parsed`);
      } else {
        toast.success(
          `Imported: ${res.created} created, ${res.updated} updated, ${res.failed} failed.`,
        );
      }
    } catch (e: any) {
      toast.error(e.message || "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-sm tracking-wider text-amber-800 uppercase mb-1">
            Admin
          </p>
          <h1 className="text-3xl font-light text-stone-800">
            Import / Export Products
          </h1>
        </div>
        <button
          onClick={() => navigate("/admin/products")}
          className="text-sm tracking-wider uppercase text-stone-600 hover:text-amber-800 transition-colors"
        >
          ← Back to products
        </button>
      </div>

      {/* ---------- Export block ---------- */}
      <section className="bg-white rounded-lg border border-stone-200 p-6 mb-6">
        <h2 className="text-lg font-light text-stone-800 mb-1">Export</h2>
        <p className="text-sm text-stone-500 mb-4">
          Download the entire catalog as CSV. Edit in Excel / Google Sheets,
          then re-import to update in bulk.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            className="bg-stone-800 text-white px-5 py-2.5 text-sm tracking-wider uppercase rounded hover:bg-amber-900 transition-colors"
          >
            Download CSV
          </button>
          <button
            onClick={handleTemplate}
            className="border border-stone-300 text-stone-700 px-5 py-2.5 text-sm tracking-wider uppercase rounded hover:border-amber-800 hover:text-amber-900 transition-colors"
          >
            Download blank template
          </button>
        </div>
      </section>

      {/* ---------- Import block ---------- */}
      <section className="bg-white rounded-lg border border-stone-200 p-6">
        <h2 className="text-lg font-light text-stone-800 mb-1">Import</h2>
        <p className="text-sm text-stone-500 mb-4">
          Upload a CSV that matches the export format. Rows with an{" "}
          <code className="px-1 bg-stone-100 rounded">id</code> column update
          existing products; rows without an id create new ones. Categories are
          auto-created if they don't exist.
        </p>

        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onFiles(e.dataTransfer.files);
          }}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver
              ? "border-amber-800 bg-amber-50/40"
              : "border-stone-300 bg-stone-50/40"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => onFiles(e.target.files)}
            className="hidden"
          />
          {file ? (
            <div>
              <p className="text-sm text-stone-800 font-medium">{file.name}</p>
              <p className="text-xs text-stone-500 mt-1">
                {(file.size / 1024).toFixed(1)} KB
              </p>
              <button
                onClick={() => {
                  setFile(null);
                  setResult(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="mt-3 text-xs tracking-wider uppercase text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-stone-700">
                Drag & drop a CSV here, or{" "}
                <button
                  onClick={pickFile}
                  className="text-amber-800 hover:text-amber-900 underline"
                >
                  choose a file
                </button>
              </p>
              <p className="text-xs text-stone-400 mt-2">
                Max 5 MB · 2000 rows
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mt-5">
          <button
            onClick={() => runImport(true)}
            disabled={!file || busy}
            className="bg-white border border-stone-300 text-stone-700 px-5 py-2.5 text-sm tracking-wider uppercase rounded hover:border-amber-800 hover:text-amber-900 transition-colors disabled:opacity-50"
          >
            {busy && result?.dry_run === undefined ? "…" : "Preview (dry run)"}
          </button>
          <button
            onClick={() => runImport(false)}
            disabled={!file || busy}
            className="bg-stone-800 text-white px-5 py-2.5 text-sm tracking-wider uppercase rounded hover:bg-amber-900 transition-colors disabled:bg-stone-400"
          >
            {busy ? "Importing…" : "Import now"}
          </button>
        </div>

        {/* ---------- Result summary ---------- */}
        {result && (
          <div className="mt-6 border-t border-stone-200 pt-5">
            <div className="flex flex-wrap gap-4 mb-4">
              <Stat label="Rows" value={result.total} />
              <Stat label="Created" value={result.created} tone="green" />
              <Stat label="Updated" value={result.updated} tone="blue" />
              <Stat label="Failed" value={result.failed} tone="red" />
              {result.dry_run && (
                <span className="text-xs tracking-wider uppercase text-amber-800 self-center">
                  Dry run — nothing was saved
                </span>
              )}
            </div>

            {/* Preview list */}
            {result.dry_run && result.preview.length > 0 && (
              <div className="mb-4">
                <p className="text-xs tracking-wider uppercase text-stone-500 mb-2">
                  Preview
                </p>
                <ul className="max-h-64 overflow-y-auto border border-stone-200 rounded divide-y divide-stone-100">
                  {result.preview.slice(0, 100).map((p, i) => (
                    <li
                      key={`${p.row}-${i}`}
                      className="flex items-center justify-between px-3 py-1.5 text-xs"
                    >
                      <span className="text-stone-500">Row {p.row}</span>
                      <span className="flex-1 truncate mx-3 text-stone-800">
                        {p.name}
                      </span>
                      <span
                        className={
                          p.action === "create"
                            ? "text-green-700 uppercase"
                            : "text-blue-700 uppercase"
                        }
                      >
                        {p.action}
                      </span>
                    </li>
                  ))}
                </ul>
                {result.preview.length > 100 && (
                  <p className="text-xs text-stone-400 mt-2">
                    …and {result.preview.length - 100} more
                  </p>
                )}
              </div>
            )}

            {/* Error list */}
            {result.errors.length > 0 && (
              <div>
                <p className="text-xs tracking-wider uppercase text-red-600 mb-2">
                  Errors
                </p>
                <ul className="max-h-64 overflow-y-auto border border-red-200 rounded divide-y divide-red-100 bg-red-50/40">
                  {result.errors.slice(0, 100).map((e, i) => (
                    <li
                      key={`${e.row}-${i}`}
                      className="flex items-start gap-3 px-3 py-2 text-xs"
                    >
                      <span className="text-red-600 whitespace-nowrap">
                        Row {e.row}
                      </span>
                      <span className="text-red-800">{e.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "stone",
}: {
  label: string;
  value: number;
  tone?: "stone" | "green" | "blue" | "red";
}) {
  const colors: Record<string, string> = {
    stone: "text-stone-800",
    green: "text-green-700",
    blue: "text-blue-700",
    red: "text-red-600",
  };
  return (
    <div className="bg-stone-50 rounded-md border border-stone-200 px-4 py-2 min-w-[90px]">
      <p className="text-xs tracking-wider uppercase text-stone-500">{label}</p>
      <p className={`text-lg font-medium ${colors[tone]}`}>{value}</p>
    </div>
  );
}
