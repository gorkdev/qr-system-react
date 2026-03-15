<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;

class PurgeTrashedProducts extends Command
{
    protected $signature = 'product:purge-trashed';

    protected $description = 'Permanently delete products that have been in trash for more than 30 days.';

    public function handle(): int
    {
        $cutoff = now()->subDays(30);
        $products = Product::onlyTrashed()->where('deleted_at', '<', $cutoff)->get();
        $count = $products->count();

        foreach ($products as $product) {
            $product->forceDelete();
        }

        if ($count > 0) {
            $this->info("$count ürün kalıcı olarak silindi.");
        }

        return Command::SUCCESS;
    }
}
