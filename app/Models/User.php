<?php

namespace App\Models;

use App\Support\Usernames;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;

/**
 * @property int $id
 * @property string $name
 * @property string $username
 * @property string $email
 * @property string|null $bio
 * @property string|null $location
 * @property string|null $website
 * @property int|null $topics_count
 * @property int|null $methods_count
 * @property int|null $experiences_count
 * @property string|null $google_id
 * @property string|null $avatar
 * @property int|null $avatar_image_id
 * @property-read MediaImage|null $avatarImage
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, Topic> $topics
 * @property-read Collection<int, Method> $methods
 */
#[Fillable(['name', 'username', 'email', 'google_id', 'avatar', 'password', 'bio', 'location', 'website'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token', 'avatarImage', 'avatar_image_id'])]
class User extends Authenticatable implements MustVerifyEmail, PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    protected static function booted(): void
    {
        static::creating(function (User $user): void {
            if ($user->getAttribute('username') === null) {
                $user->username = Usernames::generate($user->getConnection(), $user->name);
            }
        });

        static::retrieved(function (User $user): void {
            if (array_key_exists('username', $user->getAttributes()) && $user->getAttribute('username') === null) {
                // Repair users created by an older container during deployment,
                // while leaving partial selects and historical timestamps alone.
                $connection = $user->getConnection();
                $username = Usernames::generate($connection, (string) $user->getAttribute('name'));
                $query = $connection->table('users')->where('id', $user->id);
                $updated = (clone $query)->whereNull('username')->update(['username' => $username]);
                $user->setAttribute('username', $updated ? $username : $query->value('username'));
                $user->syncOriginalAttribute('username');
            }
        });
    }

    /** @return HasMany<Topic, $this> */
    public function topics(): HasMany
    {
        return $this->hasMany(Topic::class);
    }

    /** @return HasMany<Method, $this> */
    public function methods(): HasMany
    {
        return $this->hasMany(Method::class);
    }

    /** @return HasMany<Experience, $this> */
    public function experiences(): HasMany
    {
        return $this->hasMany(Experience::class);
    }

    /** @return BelongsTo<MediaImage, $this> */
    public function avatarImage(): BelongsTo
    {
        return $this->belongsTo(MediaImage::class, 'avatar_image_id');
    }

    public function avatarUrl(): ?string
    {
        return $this->avatarImage?->url();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }
}
