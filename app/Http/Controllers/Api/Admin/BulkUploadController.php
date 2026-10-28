<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Imports\ProductsImport;
use App\Models\BulkUploadLog;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class BulkUploadController extends Controller
{
    public function uploadProducts(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv,txt|max:10240',
        ]);

        $path = $request->file('file')->store('bulk-uploads');

        $log = BulkUploadLog::create([
            'user_id'   => $request->user()->id,
            'file_name' => $request->file('file')->getClientOriginalName(),
            'file_path' => $path,
            'status'    => 'processing',
        ]);

        try {
            $import = new ProductsImport($log->id);
            Excel::import($import, $request->file('file'));

            $log->update([
                'total_rows'   => $import->totalRows,
                'success_rows' => $import->successRows,
                'failed_rows'  => $import->failedRows,
                'errors'       => $import->errors,
                'status'       => $import->failedRows > 0 && $import->successRows === 0
                    ? 'failed'
                    : 'completed',
            ]);

            return response()->json([
                'message' => 'Bulk upload processed.',
                'data'    => $log->fresh(),
            ]);
        } catch (\Throwable $e) {
            $log->update([
                'status' => 'failed',
                'errors' => [['row' => 0, 'message' => $e->getMessage()]],
            ]);

            // 🟢 Return the actual error message
            return response()->json([
                'message' => $e->getMessage(),
                'log'     => $log->fresh(),
            ], 422);
        }
    }
    public function downloadSample()
    {
        $headers = [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="bulk_upload_sample.csv"',
        ];

        $callback = function () {
            $file = fopen('php://output', 'w');

            fputcsv($file, [
                'sku',
                'name',
                'category',
                'brand',
                'mrp',
                'stock_quantity',
                'pack_size',
                'hsn_code',
                'gst_rate',
            ]);

            fputcsv($file, ['SKU-001', 'Sample Product 1', 'Electronics', 'SampleBrand', '199.00', '50', '10', '8517', '18']);
            fputcsv($file, ['SKU-002', 'Sample Product 2', 'Accessories', 'SampleBrand', '99.00', '100', '5', '8518', '12']);

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
    // GET /api/admin/bulk-upload/logs
    public function logs(Request $request)
    {
        return response()->json(BulkUploadLog::with('user')->latest()->paginate(20));
    }
}
