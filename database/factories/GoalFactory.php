<?php

namespace Database\Factories;

use App\Models\Goal;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Goal> */
class GoalFactory extends Factory
{
    protected $model = Goal::class;

    public function definition(): array
    {
        $title = fake()->sentence(fake()->numberBetween(4, 8));

        return [
            'user_id' => User::factory(),
            'title' => $title,
            'slug' => Str::slug($title).'-'.fake()->unique()->numberBetween(1000, 999999),
            'description' => fake()->paragraph(),
        ];
    }
}
