<?php

namespace App\Imports;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class ProductsImport implements ToCollection, WithHeadingRow
{
    public int $totalRows = 0;
    public int $successRows = 0;
    public int $failedRows = 0;
    public array $errors = [];

    public function __construct(protected int $logId) {}

    public function collection(\Illuminate\Support\Collection $rows)
    {
        foreach ($rows as $i => $row) {
            $this->totalRows++;
            $rowNum = $i + 2;

            try {
                if (empty($row['sku']) || empty($row['name'])) {
                    throw new \RuntimeException('sku and name are required.');
                }

                $variant = ProductVariant::where('sku', $row['sku'])->first();

                if ($variant) {
                    $product = $variant->product;

                    // Orphan variant → create product and link
                    if (!$product) {
                        $category = $this->resolveCategory($row['category'] ?? null);

                        $product = Product::create([
                            'name'           => $row['name'],
                            'slug'           => Str::slug($row['name']) . '-' . Str::random(5),
                            'category_id'    => $category->id,
                            'hsn_code'       => $row['hsn_code'] ?? null,
                            'gst_rate'       => $row['gst_rate'] ?? 0,
                            'is_active'      => true,
                            'is_new_arrival' => false,
                        ]);

                        $variant->update(['product_id' => $product->id]);
                    }

                    $product->update([
                        'name'     => $row['name'] ?? $product->name,
                        'hsn_code' => $row['hsn_code'] ?? $product->hsn_code,
                        'gst_rate' => $row['gst_rate'] ?? $product->gst_rate,
                    ]);

                    $variant->update([
                        'stock_quantity' => $row['stock_quantity'] ?? $variant->stock_quantity,
                        'mrp'            => $row['mrp'] ?? $variant->mrp,
                        'pack_size'      => $row['pack_size'] ?? $variant->pack_size,
                    ]);
                } else {
                    $category = $this->resolveCategory($row['category'] ?? null);

                    $product = Product::create([
                        'name'           => $row['name'],
                        'slug'           => Str::slug($row['name']) . '-' . Str::random(5),
                        'category_id'    => $category->id,
                        'hsn_code'       => $row['hsn_code'] ?? null,
                        'gst_rate'       => $row['gst_rate'] ?? 0,
                        'is_active'      => true,
                        'is_new_arrival' => false,
                    ]);

                    ProductVariant::create([
                        'product_id'     => $product->id,
                        'sku'            => $row['sku'],
                        'mrp'            => $row['mrp'] ?? 0,
                        'stock_quantity' => $row['stock_quantity'] ?? 0,
                        'pack_size'      => $row['pack_size'] ?? null,
                    ]);
                }

                $this->successRows++;
            } catch (\Throwable $e) {
                $this->failedRows++;
                $this->errors[] = ['row' => $rowNum, 'message' => $e->getMessage()];
            }
        }
    }

    protected function resolveCategory(?string $name): Category
    {
        $name = $name ?: 'Uncategorized';
        $slug = Str::slug($name);

        $category = Category::withTrashed()->where('slug', $slug)->first();

        if ($category) {
            if (method_exists($category, 'trashed') && $category->trashed()) {
                $category->restore();
            }
            return $category;
        }

        return Category::create([
            'slug' => $slug,
            'name' => $name,
        ]);
    }
}
