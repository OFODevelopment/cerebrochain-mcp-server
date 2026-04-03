#!/usr/bin/env node
/**
 * CerebroChain MCP Server
 * The first logistics/WMS MCP server for AI agents.
 *
 * Exposes CerebroChain's supply chain APIs as MCP tools:
 * - Shipping rate comparison (free)
 * - Inventory management
 * - Order tracking
 * - Fleet & logistics
 * - AI-powered forecasting & optimization
 * - Executive analytics
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { CerebroChainClient } from './client.js';

const client = new CerebroChainClient();

const server = new McpServer({
  name: 'cerebrochain',
  version: '1.0.0',
});

// ═══════════════════════════════════════════════════════════════
// TIER 1 — FREE TOOLS (No Auth Required)
// ═══════════════════════════════════════════════════════════════

server.tool(
  'compare_shipping_rates',
  'Compare shipping rates across multiple carriers (UPS, FedEx, USPS, DHL) for a package. Returns cheapest and fastest options. Free — no API key needed.',
  {
    from_zip: z.string().describe('Origin ZIP/postal code'),
    to_zip: z.string().describe('Destination ZIP/postal code'),
    weight_lbs: z.number().positive().describe('Package weight in pounds'),
    length_in: z.number().positive().optional().describe('Package length in inches'),
    width_in: z.number().positive().optional().describe('Package width in inches'),
    height_in: z.number().positive().optional().describe('Package height in inches'),
    from_country: z.string().default('US').describe('Origin country code'),
    to_country: z.string().default('US').describe('Destination country code'),
  },
  async (params) => {
    const response = await client.postPublic('/shipping/rates/compare', {
      from: { zip: params.from_zip, country: params.from_country },
      to: { zip: params.to_zip, country: params.to_country },
      packages: [{
        weight: params.weight_lbs,
        length: params.length_in ?? 10,
        width: params.width_in ?? 8,
        height: params.height_in ?? 6,
        units: 'lbs',
      }],
    });

    if (!response.ok) {
      return { content: [{ type: 'text' as const, text: `Error: ${response.error}` }] };
    }

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }],
    };
  },
);

server.tool(
  'get_platform_status',
  'Check CerebroChain platform health and service availability. Free — no API key needed.',
  {},
  async () => {
    const response = await client.getPublic('/health');
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }],
    };
  },
);

// ═══════════════════════════════════════════════════════════════
// TIER 2 — AUTHENTICATED TOOLS (API Key Required)
// ═══════════════════════════════════════════════════════════════

// ── Inventory ──

server.tool(
  'search_inventory',
  'Search inventory items with filters. Returns SKU, name, quantity, location, category. Requires API key.',
  {
    search: z.string().optional().describe('Search term (name, SKU, barcode)'),
    category: z.string().optional().describe('Filter by category'),
    page: z.number().default(1).describe('Page number'),
    limit: z.number().max(100).default(20).describe('Items per page'),
  },
  async (params) => {
    if (!client.isAuthenticated) {
      return { content: [{ type: 'text' as const, text: 'Error: API key required. Set CEREBROCHAIN_API_KEY environment variable.' }] };
    }
    const query: Record<string, string> = {
      page: String(params.page),
      limit: String(params.limit),
    };
    if (params.search) query.search = params.search;
    if (params.category) query.category = params.category;

    const response = await client.get('/inventory/items', query);
    if (!response.ok) return { content: [{ type: 'text' as const, text: `Error: ${response.error}` }] };
    return { content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }] };
  },
);

server.tool(
  'check_stock_levels',
  'Get current stock levels for a specific inventory item by ID. Returns quantity on hand, reserved, available. Requires API key.',
  {
    item_id: z.string().describe('Inventory item ID'),
  },
  async (params) => {
    if (!client.isAuthenticated) {
      return { content: [{ type: 'text' as const, text: 'Error: API key required.' }] };
    }
    const response = await client.get(`/inventory/items/${params.item_id}/stock`);
    if (!response.ok) return { content: [{ type: 'text' as const, text: `Error: ${response.error}` }] };
    return { content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }] };
  },
);

server.tool(
  'lookup_sku',
  'Look up an inventory item by its SKU code. Returns full item details including stock, location, and pricing. Requires API key.',
  {
    sku: z.string().describe('SKU code to look up'),
  },
  async (params) => {
    if (!client.isAuthenticated) {
      return { content: [{ type: 'text' as const, text: 'Error: API key required.' }] };
    }
    const response = await client.get(`/inventory/items/sku/${params.sku}`);
    if (!response.ok) return { content: [{ type: 'text' as const, text: `Error: ${response.error}` }] };
    return { content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }] };
  },
);

server.tool(
  'get_warehouse_locations',
  'List warehouse storage locations with hierarchy (zones, aisles, bins). Requires API key.',
  {},
  async () => {
    if (!client.isAuthenticated) {
      return { content: [{ type: 'text' as const, text: 'Error: API key required.' }] };
    }
    const response = await client.get('/inventory/locations/hierarchy');
    if (!response.ok) return { content: [{ type: 'text' as const, text: `Error: ${response.error}` }] };
    return { content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }] };
  },
);

// ── Orders ──

server.tool(
  'list_orders',
  'List and search orders with filters. Returns order ID, status, items, total value. Requires API key.',
  {
    status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional().describe('Filter by order status'),
    page: z.number().default(1).describe('Page number'),
    limit: z.number().max(100).default(20).describe('Orders per page'),
  },
  async (params) => {
    if (!client.isAuthenticated) {
      return { content: [{ type: 'text' as const, text: 'Error: API key required.' }] };
    }
    const query: Record<string, string> = {
      page: String(params.page),
      limit: String(params.limit),
    };
    if (params.status) query.status = params.status;

    const response = await client.get('/orders', query);
    if (!response.ok) return { content: [{ type: 'text' as const, text: `Error: ${response.error}` }] };
    return { content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }] };
  },
);

server.tool(
  'get_order_status',
  'Get detailed status and tracking for a specific order. Requires API key.',
  {
    order_id: z.string().describe('Order ID to look up'),
  },
  async (params) => {
    if (!client.isAuthenticated) {
      return { content: [{ type: 'text' as const, text: 'Error: API key required.' }] };
    }
    const response = await client.get(`/orders/${params.order_id}`);
    if (!response.ok) return { content: [{ type: 'text' as const, text: `Error: ${response.error}` }] };
    return { content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }] };
  },
);

server.tool(
  'get_order_statistics',
  'Get order statistics and KPIs — total orders, fulfillment rate, average value, trends. Requires API key.',
  {},
  async () => {
    if (!client.isAuthenticated) {
      return { content: [{ type: 'text' as const, text: 'Error: API key required.' }] };
    }
    const response = await client.get('/orders/statistics');
    if (!response.ok) return { content: [{ type: 'text' as const, text: `Error: ${response.error}` }] };
    return { content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }] };
  },
);

// ── Logistics ──

server.tool(
  'get_fleet_stats',
  'Get real-time fleet KPIs — active vehicles, utilization, fuel efficiency, maintenance status. Requires API key.',
  {},
  async () => {
    if (!client.isAuthenticated) {
      return { content: [{ type: 'text' as const, text: 'Error: API key required.' }] };
    }
    const response = await client.get('/logistics/fleet/stats');
    if (!response.ok) return { content: [{ type: 'text' as const, text: `Error: ${response.error}` }] };
    return { content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }] };
  },
);

server.tool(
  'list_vehicles',
  'List fleet vehicles with status, location, and capacity. Requires API key.',
  {
    status: z.enum(['active', 'inactive', 'maintenance', 'in-transit']).optional().describe('Filter by vehicle status'),
  },
  async (params) => {
    if (!client.isAuthenticated) {
      return { content: [{ type: 'text' as const, text: 'Error: API key required.' }] };
    }
    const query: Record<string, string> = {};
    if (params.status) query.status = params.status;

    const response = await client.get('/logistics/vehicles', query);
    if (!response.ok) return { content: [{ type: 'text' as const, text: `Error: ${response.error}` }] };
    return { content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }] };
  },
);

server.tool(
  'track_shipment',
  'Get real-time tracking for a shipment route — current location, progress, ETA, stops completed. Requires API key.',
  {
    route_id: z.string().describe('Route or shipment ID to track'),
  },
  async (params) => {
    if (!client.isAuthenticated) {
      return { content: [{ type: 'text' as const, text: 'Error: API key required.' }] };
    }
    const response = await client.get(`/logistics/routes/${params.route_id}`);
    if (!response.ok) return { content: [{ type: 'text' as const, text: `Error: ${response.error}` }] };
    return { content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }] };
  },
);

server.tool(
  'list_shipments',
  'Get shipment history with analytics — 90-day view of all shipments, delivery rates, carrier performance. Requires API key.',
  {},
  async () => {
    if (!client.isAuthenticated) {
      return { content: [{ type: 'text' as const, text: 'Error: API key required.' }] };
    }
    const response = await client.get('/logistics/shipments/history');
    if (!response.ok) return { content: [{ type: 'text' as const, text: `Error: ${response.error}` }] };
    return { content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }] };
  },
);

// ═══════════════════════════════════════════════════════════════
// TIER 3 — PREMIUM TOOLS (Subscription Required)
// ═══════════════════════════════════════════════════════════════

server.tool(
  'optimize_route',
  'AI-powered route optimization. Calculates optimal delivery route considering traffic, capacity, time windows, and fuel costs. Premium tool. Requires API key.',
  {
    stops: z.array(z.object({
      address: z.string().describe('Stop address or coordinates'),
      time_window_start: z.string().optional().describe('Earliest delivery time (ISO 8601)'),
      time_window_end: z.string().optional().describe('Latest delivery time (ISO 8601)'),
      priority: z.enum(['low', 'medium', 'high']).optional().describe('Stop priority'),
    })).min(2).describe('Delivery stops to optimize'),
    vehicle_capacity_lbs: z.number().optional().describe('Vehicle weight capacity in pounds'),
  },
  async (params) => {
    if (!client.isAuthenticated) {
      return { content: [{ type: 'text' as const, text: 'Error: API key required. Premium feature.' }] };
    }
    const response = await client.post('/logistics/route-optimization', {
      stops: params.stops,
      vehicleCapacity: params.vehicle_capacity_lbs,
    });
    if (!response.ok) return { content: [{ type: 'text' as const, text: `Error: ${response.error}` }] };
    return { content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }] };
  },
);

server.tool(
  'forecast_demand',
  'AI-powered demand forecasting. Ask natural language questions about future inventory needs, sales trends, and supply chain patterns. Premium tool. Requires API key.',
  {
    query: z.string().describe('Natural language forecast question (e.g., "What items will be out of stock in 30 days?")'),
    hemisphere: z.enum(['wms', 'logistics', 'executive']).default('wms').describe('Which hemisphere to query'),
  },
  async (params) => {
    if (!client.isAuthenticated) {
      return { content: [{ type: 'text' as const, text: 'Error: API key required. Premium feature.' }] };
    }
    const response = await client.post('/ai-forecast/query', {
      query: params.query,
      hemisphere: params.hemisphere,
    });
    if (!response.ok) return { content: [{ type: 'text' as const, text: `Error: ${response.error}` }] };
    return { content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }] };
  },
);

server.tool(
  'detect_bottlenecks',
  'AI-powered bottleneck detection. Identifies current and predicted supply chain bottlenecks with severity and recommendations. Premium tool. Requires API key.',
  {
    scope: z.enum(['warehouse', 'logistics', 'full-chain']).default('full-chain').describe('Analysis scope'),
  },
  async (params) => {
    if (!client.isAuthenticated) {
      return { content: [{ type: 'text' as const, text: 'Error: API key required. Premium feature.' }] };
    }
    const response = await client.post('/ai-forecast/bottleneck', { scope: params.scope });
    if (!response.ok) return { content: [{ type: 'text' as const, text: `Error: ${response.error}` }] };
    return { content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }] };
  },
);

server.tool(
  'get_optimization_recommendations',
  'Get AI-generated optimization recommendations for warehouse operations, logistics routes, or overall supply chain efficiency. Premium tool. Requires API key.',
  {
    area: z.enum(['inventory', 'picking', 'shipping', 'fleet', 'overall']).default('overall').describe('Area to optimize'),
  },
  async (params) => {
    if (!client.isAuthenticated) {
      return { content: [{ type: 'text' as const, text: 'Error: API key required. Premium feature.' }] };
    }
    const response = await client.post('/ai-forecast/optimize', { area: params.area });
    if (!response.ok) return { content: [{ type: 'text' as const, text: `Error: ${response.error}` }] };
    return { content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }] };
  },
);

server.tool(
  'get_financial_metrics',
  'Get real-time financial metrics — revenue, margins, cash flow, profit/loss. Premium tool. Requires API key.',
  {},
  async () => {
    if (!client.isAuthenticated) {
      return { content: [{ type: 'text' as const, text: 'Error: API key required. Premium feature.' }] };
    }
    const response = await client.get('/executive/financial-metrics');
    if (!response.ok) return { content: [{ type: 'text' as const, text: `Error: ${response.error}` }] };
    return { content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }] };
  },
);

server.tool(
  'get_kpi_dashboard',
  'Get KPI performance dashboard — targets vs actuals for all key supply chain metrics. Premium tool. Requires API key.',
  {},
  async () => {
    if (!client.isAuthenticated) {
      return { content: [{ type: 'text' as const, text: 'Error: API key required. Premium feature.' }] };
    }
    const response = await client.get('/executive/kpi-status');
    if (!response.ok) return { content: [{ type: 'text' as const, text: `Error: ${response.error}` }] };
    return { content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }] };
  },
);

server.tool(
  'natural_language_command',
  'Process a natural language command through CerebroChain AI Command Center. Supports queries like "show me all delayed shipments" or "reserve 50 units of SKU-1234". Premium tool. Requires API key.',
  {
    command: z.string().describe('Natural language command or query'),
  },
  async (params) => {
    if (!client.isAuthenticated) {
      return { content: [{ type: 'text' as const, text: 'Error: API key required. Premium feature.' }] };
    }
    const response = await client.post('/command-center/process', { command: params.command });
    if (!response.ok) return { content: [{ type: 'text' as const, text: `Error: ${response.error}` }] };
    return { content: [{ type: 'text' as const, text: JSON.stringify(response.data, null, 2) }] };
  },
);

// ═══════════════════════════════════════════════════════════════
// RESOURCES
// ═══════════════════════════════════════════════════════════════

server.resource(
  'inventory-summary',
  'cerebrochain://inventory/summary',
  async (uri) => {
    if (!client.isAuthenticated) {
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify({ error: 'API key required. Set CEREBROCHAIN_API_KEY environment variable.' }),
        }],
      };
    }
    const response = await client.get('/wms/inventory/summary');
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(response.ok ? response.data : { error: response.error }, null, 2),
      }],
    };
  },
);

server.resource(
  'fleet-status',
  'cerebrochain://logistics/fleet-status',
  async (uri) => {
    if (!client.isAuthenticated) {
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify({ error: 'API key required. Set CEREBROCHAIN_API_KEY environment variable.' }),
        }],
      };
    }
    const response = await client.get('/logistics/fleet/stats');
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(response.ok ? response.data : { error: response.error }, null, 2),
      }],
    };
  },
);

server.resource(
  'kpi-snapshot',
  'cerebrochain://executive/kpi-snapshot',
  async (uri) => {
    if (!client.isAuthenticated) {
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify({ error: 'API key required. Set CEREBROCHAIN_API_KEY environment variable.' }),
        }],
      };
    }
    const response = await client.get('/executive/kpi-status');
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(response.ok ? response.data : { error: response.error }, null, 2),
      }],
    };
  },
);

// ═══════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('CerebroChain MCP Server running on stdio');
  console.error(`API URL: ${process.env.CEREBROCHAIN_API_URL ?? 'https://cerebrochain.com/api'}`);
  console.error(`Authenticated: ${client.isAuthenticated ? 'Yes' : 'No (free tools only)'}`);
}

main().catch((err) => {
  console.error('Failed to start CerebroChain MCP Server:', err);
  process.exit(1);
});
