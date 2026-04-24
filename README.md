<p align="center">
  <img src="assets/logo.svg" width="120" alt="CerebroChain Logo">
</p>

# @cerebrochain/mcp-server

[![npm version](https://img.shields.io/npm/v/@cerebrochain/mcp-server)](https://www.npmjs.com/package/@cerebrochain/mcp-server)
[![license](https://img.shields.io/npm/l/@cerebrochain/mcp-server)](https://opensource.org/licenses/MIT)
[![Glama Score](https://glama.ai/mcp/servers/CerebroChain/cerebrochain-mcp-server/badges/score.svg)](https://glama.ai/mcp/servers/CerebroChain/cerebrochain-mcp-server)

The first logistics/WMS MCP server for AI agents. Connect Claude, Cursor, or any MCP-compatible AI to CerebroChain's supply chain APIs.

## Installation

```bash
npm install -g @cerebrochain/mcp-server
```

## Configuration

### Claude Desktop

Add to `~/.config/claude-desktop/claude_desktop_config.json` (Linux) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "cerebrochain": {
      "command": "cerebrochain-mcp",
      "env": {
        "CEREBROCHAIN_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "cerebrochain": {
      "command": "cerebrochain-mcp",
      "env": {
        "CEREBROCHAIN_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CEREBROCHAIN_API_KEY` | For Tier 2/3 | Your CerebroChain API key |
| `CEREBROCHAIN_API_URL` | No | Custom API URL (default: `https://cerebrochain.com/api`) |
| `CEREBROCHAIN_JWT_TOKEN` | No | Alternative auth via JWT token |

## Available Tools

### Tier 1 — Free (No API Key)

| Tool | Description |
|------|-------------|
| `compare_shipping_rates` | Compare rates across UPS, FedEx, USPS, DHL |
| `get_platform_status` | Check platform health |

### Tier 2 — Authenticated (API Key Required)

| Tool | Description |
|------|-------------|
| `search_inventory` | Search inventory items with filters |
| `check_stock_levels` | Get stock levels for an item |
| `lookup_sku` | Look up item by SKU |
| `get_warehouse_locations` | List warehouse storage locations |
| `list_orders` | List and search orders |
| `get_order_status` | Get order details and tracking |
| `get_order_statistics` | Get order KPIs |
| `get_fleet_stats` | Get fleet utilization metrics |
| `list_vehicles` | List fleet vehicles |
| `track_shipment` | Track a shipment route |
| `list_shipments` | Get shipment history |

### Tier 3 — Premium (Subscription Required)

| Tool | Description |
|------|-------------|
| `optimize_route` | AI-powered route optimization |
| `forecast_demand` | AI demand forecasting |
| `detect_bottlenecks` | AI bottleneck detection |
| `get_optimization_recommendations` | AI optimization suggestions |
| `get_financial_metrics` | Revenue, margins, cash flow |
| `get_kpi_dashboard` | KPI targets vs actuals |
| `natural_language_command` | Natural language commands |

## Resources

| URI | Description |
|-----|-------------|
| `cerebrochain://inventory/summary` | Inventory overview |
| `cerebrochain://logistics/fleet-status` | Fleet status snapshot |
| `cerebrochain://executive/kpi-snapshot` | Executive KPIs |

## Example Usage

Once configured, ask your AI:

- "Compare shipping rates from 90210 to 10001 for a 5lb package"
- "Search inventory for items containing 'widget'"
- "What's the status of order ORD-12345?"
- "Optimize delivery route for these 10 stops"
- "What items will be out of stock in 30 days?"

## Get an API Key

Visit [cerebrochain.com](https://cerebrochain.com) to create an account and generate an API key.

## License

MIT
