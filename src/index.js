/**
 * MCP server entry point for schwaizer-opendata-mcp.
 * - Bootstraps configuration and logging
 * - Registers tool definitions and request handlers
 * - Starts the stdio transport and wires graceful shutdown
 *
 * This file uses JSDoc to document the public surface and lifecycle hooks.
 */
import 'dotenv/config.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { logger } from './utils/logger.js';
import './config.js'; // ensure env/config side-effects are loaded

// Tool modules
import { getCatalogTools, getCatalogHandlers } from './tools/catalog.js';
import { getOrgTaxonomyTools, getOrgTaxonomyHandlers } from './tools/org-taxonomy.js';
import { getStatusTools, getStatusHandlers } from './tools/status.js';
import { getDatastoreTools, getDatastoreHandlers } from './tools/datastore.js';
import { getResourcesTools, getResourcesHandlers } from './tools/resources.js';

// Aggregate tool definitions and handlers
const toolDefs = [
  ...getCatalogTools(),
  ...getOrgTaxonomyTools(),
  ...getDatastoreTools(),
  ...getResourcesTools(),
  ...getStatusTools(),
];

const handlers = {
  ...getCatalogHandlers(),
  ...getOrgTaxonomyHandlers(),
  ...getDatastoreHandlers(),
  ...getResourcesHandlers(),
  ...getStatusHandlers(),
};

// Create MCP server
const server = new Server(
  {
    name: 'schwaizer-opendata-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
      // resources: {} // reserved for future resource templates
    },
  }
);

/**
 * ListTools handler.
 * Returns the list of MCP tools exposed by this server.
 * @returns {{ tools: Array<object> }} A response object with the tool descriptors.
 */
 // List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  try {
    logger.info({ count: toolDefs.length }, 'ListTools');
    return { tools: toolDefs };
  } catch (err) {
    logger.error({ err }, 'ListTools failed');
    // As per MCP spec, errors are propagated via exceptions in request handlers
    throw new Error(`Failed to list tools: ${String(err)}`);
  }
});

/**
 * CallTool handler.
 * Dispatches a tool invocation by name to the registered handler.
 * @param {{ params: { name: string, arguments?: object } }} req - MCP request with tool name and arguments.
 * @returns {Promise<{content: Array<{type: string, text: string}>, isError?: boolean}>} Tool execution result.
 */
 // Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const name = req.params.name;
  const args = req.params.arguments ?? {};
  const handler = handlers[name];

  logger.info({ name, args }, 'CallTool request');

  if (!handler || typeof handler !== 'function') {
    const msg = `Tool not found: ${name}`;
    logger.warn({ name }, msg);
    return {
      isError: true,
      content: [{ type: 'text', text: msg }],
    };
  }

  try {
    const result = await handler(args);
    // Handlers already return { content, isError? }. Ensure shape.
    if (!result || !Array.isArray(result.content)) {
      const msg = `Tool "${name}" returned invalid result`;
      logger.error({ name, result }, msg);
      return { isError: true, content: [{ type: 'text', text: msg }] };
    }
    logger.info({ name, isError: !!result.isError }, 'CallTool response');
    return result;
  } catch (err) {
    logger.error({ name, err }, 'CallTool handler error');
    return {
      isError: true,
      content: [{ type: 'text', text: `Tool "${name}" failed: ${String(err)}` }],
    };
  }
});

// Transport lifecycle
/**
 * Starts the MCP server over stdio transport and wires process signal handlers.
 * @returns {Promise<void>}
 */
async function main() {
  const transport = new StdioServerTransport();

  // Graceful shutdown
  /**
   * Gracefully shut down the transport and exit the process.
   * @param {"SIGINT"|"SIGTERM"} signal - The OS signal that initiated shutdown.
   * @returns {Promise<void>}
   */
  const shutdown = async (signal) => {
    try {
      logger.info({ signal }, 'Shutting down MCP server');
      await transport.close?.();
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
  });
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection');
  });

  await server.connect(transport);
  logger.info('schwaizer-opendata-mcp server started (stdio transport)');
}

// Execute if run as CLI
main().catch((err) => {
  logger.error({ err }, 'Failed to start MCP server');
  process.exit(1);
});
