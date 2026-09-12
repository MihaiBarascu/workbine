<?php

namespace App\Support;

use Illuminate\Support\Str;

class TopicDiscovery
{
    /** @return array<string, string> */
    public static function categories(): array
    {
        return [
            'ai' => 'AI in Practice',
            'automation' => 'Automation & Agents',
            'development' => 'Coding & Apps',
            'saas' => 'Products & SaaS',
            'marketing' => 'Marketing & Clients',
            'freelancing' => 'Freelancing & Services',
            'ecommerce' => 'E-commerce',
            'digital-products' => 'Digital Products',
            'content' => 'Content & Monetization',
            'pricing-profit' => 'Pricing & Profit',
        ];
    }

    /** @return array<int, string> */
    public static function tags(string $input): array
    {
        return array_values(array_unique(array_filter(array_map(fn (string $tag): string => Str::slug(trim($tag)), explode(',', $input)))));
    }
}
