<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Application Services
    |--------------------------------------------------------------------------
    */

    'apps' => [
        'reverb' => [
            'host' => env('REVERB_HOST', '127.0.0.1'),
            'port' => env('REVERB_PORT', 6001),
            'scheme' => env('REVERB_SCHEME', 'http'),
            'useTLS' => env('REVERB_SCHEME', 'http') === 'https',
            'ca_cert' => env('REVERB_CA_CERT'),
            'client_cert' => env('REVERB_CLIENT_CERT'),
            'local_cert' => env('REVERB_LOCAL_CERT'),
            'local_pk' => env('REVERB_LOCAL_PK'),
            'passphrase' => env('REVERB_PASSPHRASE'),
            'verify_peer' => env('REVERB_VERIFY_PEER', true),
            'timeout' => 30,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | PUSHER — Backward compatibility
    |--------------------------------------------------------------------------
    */

    'pusher' => [
        'driver' => 'pusher',
        'key' => env('PUSHER_APP_KEY'),
        'secret' => env('PUSHER_APP_SECRET'),
        'app_id' => env('PUSHER_APP_ID'),
        'options' => [
            'cluster' => env('PUSHER_APP_CLUSTER', 'ap1'),
            'host' => env('PUSHER_HOST') ?: env('REVERB_HOST', '127.0.0.1'),
            'port' => env('PUSHER_PORT') ?: env('REVERB_PORT', 6001),
            'scheme' => env('PUSHER_SCHEME') ?: env('REVERB_SCHEME', 'http'),
            'encrypted' => false,
            'useTLS' => env('PUSHER_SCHEME', 'http') === 'https',
        ],
        'client_options' => [],
    ],

    /*
    |--------------------------------------------------------------------------
    | Supported Broadcasting Connections
    |--------------------------------------------------------------------------
    */

    'supported' => [
        'reverb',
        'pusher',
        'ably',
    ],

];
