<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Response;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Mail\Transport\ResendTransport;
use Illuminate\Support\Facades\Mail;
use PHPUnit\Framework\Attributes\DataProvider;
use Resend\Client as ResendClient;
use Resend\Transporters\HttpTransporter;
use Resend\ValueObjects\ApiKey;
use Resend\ValueObjects\Transporter\BaseUri;
use Resend\ValueObjects\Transporter\Headers;
use Symfony\Component\Mime\Address;
use Tests\TestCase;

class ResendMailTest extends TestCase
{
    use RefreshDatabase;

    #[DataProvider('accountEmails')]
    public function test_account_email_reaches_resend_with_configured_sender(bool $verification, string $subject, string $linkPath): void
    {
        config([
            'mail.default' => 'resend',
            'services.resend.key' => 'test-only-key',
            'mail.from.address' => 'no-reply@mail.example.com',
            'mail.from.name' => 'Workbine',
            'community.email_verification_enabled' => true,
        ]);

        $mailer = Mail::mailer();
        $this->assertInstanceOf(ResendTransport::class, $mailer->getSymfonyTransport());

        // Keep Laravel and the SDK real; replace only the outbound HTTP boundary.
        $history = [];
        $handler = HandlerStack::create(new MockHandler([
            new Response(200, ['Content-Type' => 'application/json'], '{"id":"test-email-id"}'),
        ]));
        $handler->push(Middleware::history($history));
        $client = new ResendClient(new HttpTransporter(
            new Client(['handler' => $handler]),
            BaseUri::from('api.resend.com'),
            Headers::withAuthorization(ApiKey::from('test-only-key')),
        ));
        $mailer->setSymfonyTransport(new ResendTransport($client));

        $user = User::factory()->unverified()->create();

        if ($verification) {
            $this->actingAs($user)->post(route('verification.send'))
                ->assertSessionHas('status', 'verification-link-sent');
        } else {
            $this->post(route('password.email'), ['email' => $user->email])
                ->assertSessionHasNoErrors();
        }

        $this->assertCount(1, $history);
        $request = $history[0]['request'];
        $this->assertSame('https://api.resend.com/emails', (string) $request->getUri());
        $payload = json_decode((string) $request->getBody(), true, flags: JSON_THROW_ON_ERROR);
        $sender = Address::create($payload['from']);
        $this->assertSame('Workbine', $sender->getName());
        $this->assertSame('no-reply@mail.example.com', $sender->getAddress());
        $this->assertSame([$user->email], $payload['to']);
        $this->assertSame($subject, $payload['subject']);
        $this->assertStringContainsString($linkPath, $payload['html']);
        $this->assertStringContainsString($linkPath, $payload['text']);
    }

    public static function accountEmails(): array
    {
        return [
            'confirmation' => [true, 'Verify your email address', '/email/verify/'],
            'password recovery' => [false, 'Reset your password', '/reset-password/'],
        ];
    }
}
