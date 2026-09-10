<?php

namespace Database\Factories;

use App\Models\Method;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Method> */
class MethodFactory extends Factory
{
    protected $model = Method::class;

    public function definition(): array
    {
        return [
            'topic_id' => Topic::factory(),
            'user_id' => User::factory(),
            'title' => fake()->sentence(fake()->numberBetween(4, 8)),
            'body' => fake()->paragraphs(3, true),
            'source_url' => null,
        ];
    }
}
