import { config } from 'dotenv';
import { resolve } from 'path';
import { VippsBaseClient, type VippsConfig } from '../src/lib/payments/vipps/base-client';

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });

// =============================================================================
// EVENT PRESETS
// =============================================================================
// The exact event strings each webhook endpoint expects, mirroring the handler
// in src/app/api/webhooks/vipps/recurring/route.ts.

const EVENT_PRESETS: Record<string, string[]> = {
  recurring: [
    'recurring.agreement-activated.v1',
    'recurring.agreement-rejected.v1',
    'recurring.agreement-stopped.v1',
    'recurring.agreement-expired.v1',
    'recurring.charge-reserved.v1',
    'recurring.charge-captured.v1',
    'recurring.charge-canceled.v1',
    'recurring.charge-refunded.v1',
    'recurring.charge-failed.v1',
    'recurring.charge-creation-failed.v1',
  ],
};

// =============================================================================
// TYPES (mirror webhooks-swagger schemas)
// =============================================================================

interface Webhook {
  id: string;
  url: string;
  events: string[];
}

interface RegisterResponse {
  id: string;
  secret: string;
}

// =============================================================================
// CONFIG
// =============================================================================

function loadVippsConfig(): VippsConfig {
  const required = [
    'VIPPS_CLIENT_ID',
    'VIPPS_CLIENT_SECRET',
    'VIPPS_SUBSCRIPTION_KEY',
    'VIPPS_MERCHANT_SERIAL_NUMBER',
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables in .env.local:\n  - ${missing.join('\n  - ')}`);
    process.exit(1);
  }

  return {
    clientId: process.env.VIPPS_CLIENT_ID!,
    clientSecret: process.env.VIPPS_CLIENT_SECRET!,
    subscriptionKey: process.env.VIPPS_SUBSCRIPTION_KEY!,
    merchantSerialNumber: process.env.VIPPS_MERCHANT_SERIAL_NUMBER!,
    baseUrl: process.env.VIPPS_API_URL || 'https://apitest.vipps.no',
  };
}

// =============================================================================
// API CALLS
// =============================================================================
// The Webhooks API lives under <baseUrl>/webhooks/v1/webhooks. VippsBaseClient
// supplies OAuth (Authorization), Ocp-Apim-Subscription-Key and
// Merchant-Serial-Number headers — exactly what this API requires.

async function listWebhooks(client: VippsBaseClient): Promise<void> {
  const headers = await client.getCommonHeaders();
  const res = await fetch(`${client.getBaseUrl()}/webhooks/v1/webhooks`, { headers });

  if (!res.ok) {
    await client.handleVippsError(res, 'list webhooks');
  }

  const { webhooks } = (await res.json()) as { webhooks: Webhook[] };

  if (webhooks.length === 0) {
    console.log('No webhooks registered.');
    return;
  }

  console.log(`Found ${webhooks.length} webhook(s):\n`);
  for (const wh of webhooks) {
    console.log(`  • ${wh.id}`);
    console.log(`    URL:    ${wh.url}`);
    console.log(`    Events: ${wh.events.join(', ')}\n`);
  }
}

async function registerWebhook(
  client: VippsBaseClient,
  url: string,
  events: string[],
): Promise<void> {
  const headers = await client.getCommonHeaders();
  const res = await fetch(`${client.getBaseUrl()}/webhooks/v1/webhooks`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url, events }),
  });

  if (!res.ok) {
    await client.handleVippsError(res, 'register webhook');
  }

  const data = (await res.json()) as RegisterResponse;

  console.log('✅ Webhook registered:\n');
  console.log(`  ID:     ${data.id}`);
  console.log(`  URL:    ${url}`);
  console.log(`  Events: ${events.join(', ')}\n`);
  console.log('🔐 Secret (store this now — it is shown only once):\n');
  console.log(`     ${data.secret}\n`);
  console.log('   Add it to the matching env var in Vercel (and .env.local for local runs):');
  console.log('     • recurring endpoint → VIPPS_WEBHOOK_SECRET_RECURRING');
}

async function deleteWebhook(client: VippsBaseClient, id: string): Promise<void> {
  const headers = await client.getCommonHeaders();
  const res = await fetch(`${client.getBaseUrl()}/webhooks/v1/webhooks/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    await client.handleVippsError(res, 'delete webhook');
  }

  console.log(`✅ Webhook ${id} deleted.`);
}

// =============================================================================
// CLI
// =============================================================================

function getArg(args: string[], name: string): string | undefined {
  return args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
}

function printUsage(): void {
  console.log(`Manage Vipps webhooks (targets the environment in .env.local).

Usage:
  npm run webhooks -- list
  npm run webhooks -- register --url=<https-url> --events=recurring|<comma,separated>
  npm run webhooks -- delete --id=<uuid>

Event presets:
  recurring  → ${EVENT_PRESETS.recurring.length} agreement + charge events

Examples:
  npm run webhooks -- register --url=https://test.nooracare.no/api/webhooks/vipps/recurring --events=recurring
`);
}

function resolveEvents(raw: string | undefined): string[] {
  if (!raw) {
    console.error('❌ --events is required (use the preset "recurring" or a comma-separated list).');
    process.exit(1);
  }
  if (EVENT_PRESETS[raw]) return EVENT_PRESETS[raw];
  return raw.split(',').map((e) => e.trim()).filter(Boolean);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help') {
    printUsage();
    process.exit(0);
  }

  const vippsConfig = loadVippsConfig();
  const env = vippsConfig.baseUrl.includes('apitest') ? 'TEST' : 'PRODUCTION';
  console.log(`🌍 Target: Vipps ${env} (${vippsConfig.baseUrl}), MSN ${vippsConfig.merchantSerialNumber}\n`);

  const client = new VippsBaseClient(vippsConfig);

  switch (command) {
    case 'list':
      await listWebhooks(client);
      break;

    case 'register': {
      const url = getArg(args, 'url');
      if (!url) {
        console.error('❌ --url is required. Must be a world-reachable HTTPS URL (localhost is rejected by Vipps).');
        process.exit(1);
      }
      const events = resolveEvents(getArg(args, 'events'));
      await registerWebhook(client, url, events);
      break;
    }

    case 'delete': {
      const id = getArg(args, 'id');
      if (!id) {
        console.error('❌ --id is required. Run "list" to find webhook IDs.');
        process.exit(1);
      }
      await deleteWebhook(client, id);
      break;
    }

    default:
      console.error(`❌ Unknown command: ${command}\n`);
      printUsage();
      process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n💥 Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
