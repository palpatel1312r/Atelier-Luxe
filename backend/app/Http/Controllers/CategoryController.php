<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    /**
     * GET /api/categories           (public)
     * GET /api/admin/categories     (admin)
     */
    public function index(Request $request)
    {
        $query = Category::query();

        // Public users only see active categories
        if (! $request->user() || ! $request->user()->is_admin) {
            $query->where('active', true);
        }

        return response()->json(
            $query->orderBy('sort_order')->orderBy('name')->get()
        );
    }

    /**
     * POST /api/admin/categories
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255|unique:categories,name',
            'slug'        => 'nullable|string|max:255|unique:categories,slug',
            'description' => 'nullable|string',
            'sort_order'  => 'nullable|integer|min:0',
            'active'      => 'nullable|boolean',
        ]);

        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $category = Category::create($data);

        return response()->json($category, 201);
    }

    /**
     * GET /api/admin/categories/{category}
     */
    public function show(Category $category)
    {
        return response()->json($category->loadCount('products'));
    }

    /**
     * PUT /api/admin/categories/{category}
     */
    public function update(Request $request, Category $category)
    {
        $data = $request->validate([
            'name'        => [
                'sometimes',
                'string',
                'max:255',
                Rule::unique('categories', 'name')->ignore($category->id),
            ],
            'slug'        => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('categories', 'slug')->ignore($category->id),
            ],
            'description' => 'nullable|string',
            'sort_order'  => 'nullable|integer|min:0',
            'active'      => 'nullable|boolean',
        ]);

        $category->update($data);

        return response()->json($category);
    }

    /**
     * DELETE /api/admin/categories/{category}
     * Refuses if products still reference it (unless reassigned).
     */
    public function destroy(Request $request, Category $category)
    {
        $productCount = $category->products()->count();

        if ($productCount > 0) {
            return response()->json([
                'message' => "Cannot delete — {$productCount} product(s) still use this category.",
            ], 422);
        }

        $category->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
