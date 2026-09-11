<?php

namespace Tests\Feature;

use GuzzleHttp\Promise\Create;
use GuzzleHttp\Psr7\Response;
use Illuminate\Support\Facades\Storage;
use Psr\Http\Message\RequestInterface;
use Tests\TestCase;

class R2FilesystemTest extends TestCase
{
    public function test_r2_uses_one_put_and_generates_public_urls_without_storage_reads(): void
    {
        $requests = [];
        config(['filesystems.disks.r2' => array_replace(config('filesystems.disks.r2'), [
            'key' => 'test-access-key',
            'secret' => 'test-secret-key',
            'bucket' => 'test-images',
            'endpoint' => 'https://test-account.r2.cloudflarestorage.com',
            'url' => 'https://media.example.test',
            'http_handler' => function (RequestInterface $request) use (&$requests) {
                $requests[] = $request;

                return Create::promiseFor(new Response(200, ['ETag' => '"test-etag"']));
            },
        ])]);
        Storage::forgetDisk('r2');
        $disk = Storage::disk('r2');

        $this->assertTrue($disk->put('images/test.webp', 'encoded-image', [
            'ContentType' => 'image/webp',
            'CacheControl' => 'public, max-age=3600',
        ]));
        $this->assertSame('https://media.example.test/images/test.webp', $disk->url('images/test.webp'));
        $this->assertCount(1, $requests);
        $this->assertSame('PUT', $requests[0]->getMethod());
        $this->assertSame('test-images.test-account.r2.cloudflarestorage.com', $requests[0]->getUri()->getHost());
        $this->assertSame('image/webp', $requests[0]->getHeaderLine('Content-Type'));
        $this->assertSame('public, max-age=3600', $requests[0]->getHeaderLine('Cache-Control'));
        // Flysystem's default is private. Public delivery is configured on the R2 custom domain.
        $this->assertSame('private', $requests[0]->getHeaderLine('x-amz-acl'));
        $this->assertSame('encoded-image', (string) $requests[0]->getBody());
    }
}
