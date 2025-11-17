<div align="center">
  <img src="./logo.png" alt="Schwaizer Logo" width="100"/>
  <h1>Schwaizer</h1>
  <h2>MCP Server: OpenData MCP</h2>
  <p>
    <strong>An unofficial MCP server for interacting with Switzerland's open data portal (opendata.swiss, CKAN).</strong>
  </p>
  <p>
    <em>This is a community project by Schwaizer and is not an official implementation by the Swiss government.</em>
  </p>
</div>

---

## About Schwaizer

> **SHAPING SWITZERLAND'S AI FUTURE**
> 
> Empowering Swiss businesses and society through responsible AI adoption.
> 
> Founded in 2025, Schwaizer is a non-profit organization dedicated to accelerating the responsible adoption of artificial intelligence across Switzerland.

Website: https://www.schwaizer.ch

---

## Overview

The Schwaizer OpenData MCP Server provides read‑only access to the Swiss open data portal (opendata.swiss), which is powered by CKAN. The server exposes safe, validated MCP tools that map to CKAN’s public Action API: dataset search/show, organizations/groups/tags, resources/views, and datastore queries. Limits and sensible defaults are enforced for performance and safety.

## Features

- MCP tools for core CKAN actions:
  - Catalog
    - `package_search` — search datasets with facets, pagination, sorting
    - `package_show` — get a dataset by id/name
  - Organizations / Groups / Tags
    - `organization_list`, `organization_show`
    - `group_list`, `group_show`
    - `tag_list`, `tag_autocomplete`
  - Resources & Views
    - `resource_show`, `resource_view_show`
  - Datastore
    - `datastore_info`
    - `datastore_search` — GET/POST with safe defaults and defensive limits
    - `datastore_search_sql` — disabled by default (guarded by config)
  - Status / Help
    - `status_show`
    - `help_show`
- Safety and performance guardrails:
  - Server‑side clamped row limits via `MAX_ROWS` / `DEFAULT_ROWS`
  - `include_total` defaults to false to avoid expensive counts
  - `datastore_search_sql` disabled by default; guarded from DDL/DML
- Input validation using Zod (schemas exported as JSON Schemas for tools)
- ky‑based HTTP client with sensible timeouts and structured logging via pino

## Installation

### Prerequisites

- Node.js 20.0.0 or higher
- npm or pnpm

### Install Dependencies

```bash
npm install
```

### Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Then adjust values in `.env` as needed.

#### Environment Variables

| Name          | Default                                                                 | Description                                                                                  |
|---------------|-------------------------------------------------------------------------|----------------------------------------------------------------------------------------------|
| `BASE_URL`    | `https://opendata.swiss/api/3/action`                                   | CKAN Action API base URL (no trailing slash).                                                |
| `ENABLE_SQL`  | `false`                                                                 | Enable `datastore_search_sql`. Disabled by default for safety.                               |
| `TIMEOUT_MS`  | `15000`                                                                 | HTTP client timeout in milliseconds.                                                         |
| `USER_AGENT`  | `schwaizer-opendata-mcp/0.1.0 (+https://opendata.swiss)`               | User‑Agent header sent to the CKAN API.                                                      |
| `MAX_ROWS`    | `1000`                                                                  | Absolute cap the server allows for rows/limit parameters.                                    |
| `DEFAULT_ROWS`| `25`                                                                    | Default rows/limit when a client does not specify a value.                                   |

Environment variables are read in `src/config.js`.

## Usage

Run the server via stdio:

```bash
# Production mode
npm start

# Development mode (auto-reload)
npm run dev
```

This MCP server communicates over stdio. Configure your MCP‑enabled client/tooling to spawn the command (e.g., `node src/index.js` or the package bin) and connect via stdio.  
The package also installs a bin:

```json
"bin": { "schwaizer-opendata-mcp": "src/index.js" }
```

You can therefore run:

```bash
schwaizer-opendata-mcp
```

## Available Tools

- Catalog
  - `package_search` (args: `q`, `fq`, `sort`, `rows`, `start`, `facetField`, `facetLimit`, `includeTotal`)
  - `package_show` (args: `id`)
- Organizations / Groups / Tags
  - `organization_list` (args: `all_fields`, `limit`, `offset`)
  - `organization_show` (args: `id`)
  - `group_list` (args: `order_by`, `limit`, `offset`, `all_fields`)
  - `group_show` (args: `id`)
  - `tag_list` (args: `query`)
  - `tag_autocomplete` (args: `q`, `limit`)
- Resources & Views
  - `resource_show` (args: `id`)
  - `resource_view_show` (args: `id`)
- Datastore
  - `datastore_info` (args: `id`, `include_private`)
  - `datastore_search` (args: `resource_id`, `q`, `filters`, `fields`, `sort`, `language`, `include_total`, `limit`, `offset`, `distinct`, `plain`, `full_text`)
  - `datastore_search_sql` (args: `sql`) — requires `ENABLE_SQL=true`
- Status / Help
  - `status_show` (no args)
  - `help_show` (args: `name`)

## API Documentation

- CKAN Action API base (opendata.swiss): `https://opendata.swiss/api/3/action`  
- CKAN API reference: https://docs.ckan.org/en/latest/api/index.html

## Integration Tests

Integration tests make real API calls to opendata.swiss to verify the MCP server works correctly with the live CKAN instance. These tests:

- Use real API calls (no mocks) to test actual behavior
- Respect rate limits with small delays between tests
- Use stable test data from known datasets (e.g., BFS statistical data)
- Handle unavailable features gracefully (e.g., SQL search disabled, no datastore resources)
- Can be disabled via environment variable for CI/CD environments with restricted network access

### Running Integration Tests

```bash
# Run integration tests
npm run test:integration

# Skip integration tests (useful in CI/CD)
SKIP_INTEGRATION_TESTS=true npm test

# Run with verbose output
npm run test:integration -- --reporter=verbose
```

### Integration Test Coverage

- **Catalog** (`tests/integration/catalog.integration.test.js`): search with filters/pagination/sorting, dataset retrieval, lists/autocomplete, activity feeds
- **Datastore** (`tests/integration/datastore.integration.test.js`): info/search, fields/sorting, SQL (if enabled), dynamic discovery of resources
- **Resources** (`tests/integration/resources.integration.test.js`): resource metadata and views
- **Org/Taxonomy** (`tests/integration/org-taxonomy.integration.test.js`): organizations, groups, tags, vocabularies and licenses, autocomplete
- **Status** (`tests/integration/status.integration.test.js`): platform status and API help

## Development

### Project Structure

```
schwaizer-opendata-mcp/
├── src/
│   ├── index.js              # MCP server entry (stdio)
│   ├── config.js             # Configuration loader (.env)
│   ├── api/
│   │   └── ckan-client.js    # CKAN HTTP client
│   ├── tools/                # MCP tool handlers
│   │   ├── catalog.js
│   │   ├── org-taxonomy.js
│   │   ├── resources.js
│   │   ├── datastore.js
│   │   └── status.js
│   └── utils/
│       └── logger.js         # pino logger
├── tests/
│   ├── unit/
│   └── integration/
├── docs/
├── .env.example
└── package.json
```

### Scripts

- `npm start` — Start the MCP server  
- `npm run dev` — Start with auto‑reload on file changes  
- `npm test` — Run all tests  
- `npm run test:unit` — Run unit tests  
- `npm run test:integration` — Run integration tests  
- `npm run test:watch` — Watch mode for tests  
- `npm run test:coverage` — Generate coverage report  
- `npm run lint` — Run ESLint  
- `npm run format` — Format with Prettier  
- `npm run docs` — Build API docs with JSDoc (destination: `docs/`)

## Caching

The server does not implement caching by default. All requests are forwarded directly to the CKAN API at opendata.swiss. Consider implementing client-side caching if needed for your use case.

## Error Handling

The server provides comprehensive error handling:

- **Input Validation**: All tool inputs are validated using Zod schemas before making API calls
- **API Errors**: CKAN API errors are caught and returned with descriptive messages
- **Rate Limiting**: The server respects CKAN's rate limits; consider adding delays between requests if needed
- **Timeout Handling**: Configurable timeout (default 15 seconds) prevents hanging requests
- **SQL Safety**: `datastore_search_sql` is disabled by default and includes DDL/DML guards when enabled

Common error scenarios:
- **404 Not Found**: Dataset or resource doesn't exist
- **400 Bad Request**: Invalid query parameters or filters
- **403 Forbidden**: Access denied (rare for public API)
- **500 Server Error**: CKAN platform issue
- **Timeout**: Request exceeded `TIMEOUT_MS` limit

## Typical Workflow

### 1. Search for Datasets

Start by searching for datasets related to your topic:

```javascript
// Search for datasets about education
package_search({
  "q": "education",
  "fq": "organization:bundesamt-fur-statistik-bfs",
  "rows": 10
})
```

### 2. Get Dataset Details

Once you find a relevant dataset, get its full details:

```javascript
// Get complete dataset information
package_show({
  "id": "bildungsabschlusse"
})
```

### 3. Explore Datastore Resources

Check if the dataset has datastore-enabled resources:

```javascript
// Get datastore info for a resource
datastore_info({
  "id": "resource-id-from-package-show"
})
```

### 4. Query Data

Finally, query the actual data with filters:

```javascript
// Search datastore with filters
datastore_search({
  "resource_id": "resource-id",
  "filters": {
    "Jahr": "2023",
    "Kanton": "ZH"
  },
  "limit": 100
})
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT License — see `LICENSE`.

## Support

For issues with this MCP server, please open an issue on the project’s GitHub repository.  
For CKAN/opendata.swiss platform specifics, refer to the official documentation linked above.
