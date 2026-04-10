<?php

namespace Database\Factories;

use App\Enums\SeverityEnum;
use App\Enums\IncidentTypeEnum;
use App\Enums\IncidentStatusEnum;
use App\Enums\IncidentSourceEnum;
use App\Models\Incident;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Incident>
 */
class IncidentFactory extends Factory
{
    protected $model = Incident::class;

    public function definition(): array
    {
        $types = IncidentTypeEnum::values();
        $severities = SeverityEnum::values();

        return [
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(2),
            'type' => fake()->randomElement($types),
            'severity' => fake()->randomElement($severities),
            'status' => IncidentStatusEnum::REPORTED->value,
            'source' => fake()->randomElement(IncidentSourceEnum::values()),
            'address' => fake()->address(),
            'district_id' => fake()->numberBetween(1, 7),
            'water_level_m' => fake()->randomFloat(2, 0, 5),
            'reported_by' => 1,
        ];
    }

    public function critical(): static
    {
        return $this->state(fn (array $attributes) => [
            'severity' => SeverityEnum::CRITICAL->value,
            'water_level_m' => fake()->randomFloat(2, 3, 6),
        ]);
    }

    public function resolved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => IncidentStatusEnum::RESOLVED->value,
            'resolved_at' => now(),
        ]);
    }
}
