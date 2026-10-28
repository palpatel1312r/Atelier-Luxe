<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryAdminController extends Controller
{

    public function index()
    {
        $categories = Category::query()
            ->with(['children', 'parent:id,name'])
            ->withCount('products')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $categories]);
    }

    // app/Http/Controllers/Api/Admin/CategoryAdminController.php

    public function show(Category $category)
    {
        // Load the category WITH its products (and only select the fields you need)
        // We eager-load 'products' to avoid N+1 queries
        $category->load(['products' => function ($query) {
            $query->select('id', 'name', 'category_id'); // Only fetch what's needed
        }]);

        return response()->json(['data' => $category]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'parent_id'   => 'nullable|exists:categories,id',
            'description' => 'nullable|string',
            'icon'        => 'nullable|string',
        ]);

        $data['slug'] = Str::slug($data['name']) . '-' . Str::random(4);

        return response()->json(['data' => Category::create($data)], 201);
    }

    public function update(Request $request, Category $category)
    {
        $data = $request->validate([
            'name'      => 'sometimes|string|max:255',
            'parent_id' => 'sometimes|nullable|exists:categories,id',
            'is_active' => 'sometimes|boolean',
        ]);

        $category->update($data);

        return response()->json(['data' => $category]);
    }

    public function destroy(Category $category)
    {
        if ($category->products()->exists() || $category->children()->exists()) {
            return response()->json([
                'message' => 'Cannot delete: category has products or sub-categories.',
            ], 422);
        }

        $category->delete();

        return response()->json(['message' => 'Category deleted.']);
    }
}
