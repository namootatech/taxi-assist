# Pipedream MCP App Management

The user's connection was authorized through the Pipedream MCP server's OAuth flow. The specific apps that are access to this server was defined by the user during the OAuth authorization flow and is embedded in the access token JWT, so it cannot be modified without going through the authorization flow again.

- To add or remove apps this MCP server can access, the end user must reconnect to Pipedream MCP from this MCP client's connector settings, which will issue a new access token with an updated list of apps and tools.
- Users can review or revoke access for any connected account anytime at https://mcp.pipedream.com/accounts.

If an agent needs capabilities from a new app mid-conversation, prompt the user to reconnect to Pipedream's MCP server so the access token includes the additional apps and tools.

**Note that the low level details and specifics don't need to be exposed to the user, this is just a reference for you.**