<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;

class AdminController extends Controller
{
  public function dashboard()
  {
    return response()->json([
      'products' => Product::count(),
      'orders'   => Order::count(),
      'users'    => User::count(),
      'messages' => Contact::where('read', false)->count(),
      'revenue'  => (float) Order::where('status', 'completed')->sum('total'),  // 👈 cast
    ]);
  }
public function products()
{
    return response()->json(
        Product::with('categoryRef')->latest()->get()
    );
}

public function showProduct($id)
{
    return response()->json(
        Product::with('categoryRef')->findOrFail($id)
    );
}

public function createProduct(Request $request)
{
    $data = $request->validate([
        'name'        => 'required|string|max:255',
        'description' => 'nullable|string',
        'details'     => 'nullable|array',
        'price'       => 'required|numeric|min:0',
        'color'       => 'nullable|string|max:100',
        'category'    => 'nullable|string|max:100',
        'category_id' => 'nullable|exists:categories,id',
        'sizes'       => 'nullable|array',
        'image'       => 'nullable|string|max:2048',
        'images'      => 'nullable|array',
        'images.*'    => 'string|max:2048',
        'is_active'   => 'nullable|boolean',
        'stock'       => 'nullable|integer|min:0',
        'featured'    => 'nullable|boolean',
    ]);

    $data['is_active'] = $data['is_active'] ?? true;
    $data['images']    = $data['images']    ?? [];

    return response()->json(Product::create($data), 201);
}

public function deleteProduct($id)
{
    $product = Product::findOrFail($id);
    $product->delete();
    return response()->json(['message' => 'Deleted']);
}
  public function messages()
  {
    return response()->json(Contact::latest()->get());
  }

  public function markMessageRead(Contact $contact)
  {
    $contact->update(['read' => true]);
    return response()->json($contact);
  }

  // Orders
  public function orders()
  {
    return response()->json(Order::with('user')->latest()->get());
  }

  public function storeOrder(Request $request)
  {
    $data = $request->validate([
      'items'            => 'required|array',
      'total'            => 'required|numeric',
      'customer_name'    => 'required|string',
      'customer_email'   => 'required|email',
      'shipping_address' => 'required|string',
      'status'           => 'nullable|string',
    ]);

    if ($request->user()) {
      $data['user_id'] = $request->user()->id;
    }

    return response()->json(Order::create($data), 201);
  }

  public function updateOrder(Request $request, Order $order)
  {
    $data = $request->validate([
      'status' => 'required|in:pending,processing,shipped,completed,cancelled',
    ]);
    $order->update($data);
    return response()->json($order);
  }
  public function updateProduct(Request $request, $id)
{
    $product = Product::findOrFail($id);

    // Quick toggle endpoint behaviour: if only is_active is sent, update it
    if ($request->has('is_active') && count($request->all()) === 1) {
        $product->is_active = $request->boolean('is_active');
        $product->save();
        return response()->json($product);
    }

    $data = $request->validate([
        'name'        => 'sometimes|string|max:255',
        'description' => 'nullable|string',
        'details'     => 'nullable|array',
        'price'       => 'sometimes|numeric',
        'color'       => 'nullable|string',
        'category'    => 'nullable|string',
        'category_id' => 'nullable|integer',
        'sizes'       => 'nullable|array',
        'image'       => 'nullable|string',
        'images'      => 'nullable|array',
        'is_active'   => 'sometimes|boolean',
    ]);

    $product->update($data);
    return response()->json($product);
}
}
