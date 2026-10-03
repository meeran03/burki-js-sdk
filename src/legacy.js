// Recovered from the published @burki.dev/sdk 0.1.0 ESM artifact.
// Original source boundaries are retained below for compatibility review.
import { serializeAssistantParams } from "./serialization.js";

// src/auth.ts
var BurkiAuth = class {
  apiKey;
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error("API key is required");
    }
    this.apiKey = apiKey;
  }
  /**
   * Get authentication headers for API requests.
   */
  get headers() {
    return {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json"
    };
  }
  /**
   * Get the token for WebSocket authentication.
   */
  getWebSocketToken() {
    return this.apiKey;
  }
};

// src/errors.ts
var BurkiError = class extends Error {
  statusCode;
  responseBody;
  constructor(message, statusCode, responseBody) {
    super(message);
    this.name = "BurkiError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
};
var AuthenticationError = class extends BurkiError {
  constructor(message = "Authentication failed. Check your API key.", responseBody) {
    super(message, 401, responseBody);
    this.name = "AuthenticationError";
  }
};
var NotFoundError = class extends BurkiError {
  constructor(message = "Resource not found.", responseBody) {
    super(message, 404, responseBody);
    this.name = "NotFoundError";
  }
};
var ValidationError = class extends BurkiError {
  constructor(message = "Request validation failed.", statusCode = 400, responseBody) {
    super(message, statusCode, responseBody);
    this.name = "ValidationError";
  }
};
var RateLimitError = class extends BurkiError {
  retryAfter;
  constructor(message = "Rate limit exceeded.", responseBody, retryAfter) {
    super(message, 429, responseBody);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
};
var ServerError = class extends BurkiError {
  constructor(message = "Server error occurred.", statusCode = 500, responseBody) {
    super(message, statusCode, responseBody);
    this.name = "ServerError";
  }
};
var WebSocketError = class extends BurkiError {
  constructor(message = "WebSocket error occurred.", responseBody) {
    super(message, void 0, responseBody);
    this.name = "WebSocketError";
  }
};

// src/http-client.ts
var DEFAULT_BASE_URL = "https://api.burki.dev";
var DEFAULT_TIMEOUT = 3e4;
var HTTPClient = class {
  auth;
  baseUrl;
  timeout;
  constructor(options) {
    this.auth = options.auth;
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
  }
  async handleResponse(response) {
    let data;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (response.status === 401) {
      const message = data?.detail || "Authentication failed";
      throw new AuthenticationError(message, data);
    }
    if (response.status === 404) {
      const message = data?.detail || "Resource not found";
      throw new NotFoundError(message, data);
    }
    if (response.status === 400 || response.status === 422) {
      const message = data?.detail || "Validation error";
      throw new ValidationError(message, response.status, data);
    }
    if (response.status === 429) {
      const message = data?.detail || "Rate limit exceeded";
      const retryAfter = response.headers.get("Retry-After");
      throw new RateLimitError(message, data, retryAfter ? parseInt(retryAfter) : void 0);
    }
    if (response.status >= 500) {
      const message = data?.detail || "Server error";
      throw new ServerError(message, response.status, data);
    }
    if (!response.ok) {
      const message = data?.detail || `Request failed with status ${response.status}`;
      throw new BurkiError(message, response.status, data);
    }
    return data;
  }
  buildUrl(path, params) {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== void 0 && value !== null) {
          searchParams.append(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return url;
  }
  async request(method, path, options = {}) {
    const url = this.buildUrl(path, options.params);
    const headers = {
      ...this.auth.headers,
      ...options.headers
    };
    const fetchOptions = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeout)
    };
    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }
    const response = await fetch(url, fetchOptions);
    return this.handleResponse(response);
  }
  async get(path, params) {
    return this.request("GET", path, { params });
  }
  async post(path, body, params) {
    return this.request("POST", path, { body, params });
  }
  async put(path, body, params) {
    return this.request("PUT", path, { body, params });
  }
  async patch(path, body, params) {
    return this.request("PATCH", path, { body, params });
  }
  async delete(path, params) {
    return this.request("DELETE", path, { params });
  }
  async uploadFile(path, file, filename, additionalData) {
    const formData = new FormData();
    formData.append("file", file, filename);
    if (additionalData) {
      for (const [key, value] of Object.entries(additionalData)) {
        formData.append(key, value);
      }
    }
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": this.auth.headers["Authorization"]
        // Don't set Content-Type - let browser set it with boundary
      },
      body: formData,
      signal: AbortSignal.timeout(this.timeout)
    });
    return this.handleResponse(response);
  }
  /**
   * Get the base URL for constructing external URLs.
   */
  get baseUrlValue() {
    return this.baseUrl;
  }
};

// src/resources/base.ts
var BaseResource = class {
  http;
  constructor(httpClient) {
    this.http = httpClient;
  }
};

// src/resources/assistants.ts
var AssistantsResource = class extends BaseResource {
  /**
   * List all assistants in your organization.
   */
  async list(params = {}) {
    const queryParams = {
      skip: params.skip ?? 0,
      limit: params.limit ?? 100
    };
    if (params.activeOnly !== void 0) {
      queryParams.active_only = params.activeOnly;
    }
    if (params.myAssistantsOnly) {
      queryParams.my_assistants_only = params.myAssistantsOnly;
    }
    if (params.includeStats) {
      queryParams.include_stats = params.includeStats;
    }
    const response = await this.http.get(
      "/api/v1/assistants",
      queryParams
    );
    if (Array.isArray(response)) {
      return response;
    }
    return response.items || [];
  }
  /**
   * Get a specific assistant by ID.
   */
  async get(assistantId) {
    return this.http.get(`/api/v1/assistants/${assistantId}`);
  }
  /**
   * Get an assistant by its assigned phone number.
   */
  async getByPhone(phoneNumber) {
    return this.http.get(`/api/v1/assistants/by-phone/${encodeURIComponent(phoneNumber)}`);
  }
  /**
   * Create a new assistant.
   */
  async create(params) {
    const data = serializeAssistantParams(params, { create: true });
    return this.http.post("/api/v1/assistants", data);
  }
  /**
   * Update an existing assistant (PATCH - partial update with merge).
   */
  async update(assistantId, params) {
    const data = serializeAssistantParams(params);
    return this.http.patch(`/api/v1/assistants/${assistantId}`, data);
  }
  /**
   * Quick method to update just the active status of an assistant.
   */
  async updateStatus(assistantId, isActive) {
    return this.http.patch(
      `/api/v1/assistants/${assistantId}/status`,
      void 0,
      { is_active: isActive }
    );
  }
  /**
   * Delete an assistant.
   */
  async delete(assistantId) {
    await this.http.delete(`/api/v1/assistants/${assistantId}`);
  }
  /**
   * Get the total count of assistants.
   */
  async getCount(activeOnly = false) {
    const params = {};
    if (activeOnly) {
      params.active_only = activeOnly;
    }
    const response = await this.http.get("/api/v1/assistants/count", params);
    return response?.count || 0;
  }
  /**
   * Export assistants data in CSV or JSON format.
   */
  async export(params = {}) {
    const queryParams = {
      format: params.format ?? "csv"
    };
    if (params.assistantIds && params.assistantIds.length > 0) {
      queryParams.assistant_ids = params.assistantIds.join(",");
    }
    if (params.search) {
      queryParams.search = params.search;
    }
    if (params.status) {
      queryParams.status = params.status;
    }
    const response = await this.http.get("/api/v1/assistants/export", queryParams);
    return response;
  }
  /**
   * List cloned voices for your organization.
   */
  async getClonedVoices(params = {}) {
    const queryParams = {};
    if (params.status) {
      queryParams.status = params.status;
    }
    if (params.provider) {
      queryParams.provider = params.provider;
    }
    const response = await this.http.get(
      "/api/v1/assistants/cloned-voices",
      queryParams
    );
    if (Array.isArray(response)) {
      return response;
    }
    return response.cloned_voices || [];
  }
  /**
   * Get list of supported LLM providers.
   */
  async getProviders() {
    const response = await this.http.get(
      "/api/v1/assistants/providers"
    );
    return response?.providers || {};
  }
  /**
   * Get information about your organization.
   */
  async getOrganizationInfo() {
    return this.http.get("/api/v1/assistants/me/organization");
  }
};

// src/resources/calls.ts
var CallsResource = class extends BaseResource {
  /**
   * Initiate an outbound call from an assistant.
   */
  async initiate(params) {
    const data = {
      from_phone_number: params.fromPhoneNumber,
      to_phone_number: params.toPhoneNumber
    };
    if (params.welcomeMessage) data.welcome_message = params.welcomeMessage;
    if (params.agenda) data.agenda = params.agenda;
    if (params.assistantId) data.assistant_id = params.assistantId;
    if (params.variables) data.variables = params.variables;
    return this.http.post("/calls/initiate", data);
  }
  /**
   * List calls with filtering options.
   */
  async list(params = {}) {
    const queryParams = {
      skip: params.skip ?? 0,
      limit: params.limit ?? 100
    };
    if (params.status) queryParams.status = params.status;
    if (params.assistantId) queryParams.assistant_id = params.assistantId;
    if (params.customerPhone) queryParams.customer_phone = params.customerPhone;
    if (params.dateFrom) queryParams.date_from = params.dateFrom;
    if (params.dateTo) queryParams.date_to = params.dateTo;
    if (params.minDuration !== void 0) queryParams.min_duration = params.minDuration;
    if (params.maxDuration !== void 0) queryParams.max_duration = params.maxDuration;
    const response = await this.http.get(
      "/api/v1/calls",
      queryParams
    );
    if (Array.isArray(response)) {
      return response;
    }
    return response.items || [];
  }
  /**
   * Get a specific call by ID.
   */
  async get(callId) {
    return this.http.get(`/api/v1/calls/${callId}`);
  }
  /**
   * Get a specific call by SID.
   */
  async getBySid(callSid) {
    return this.http.get(`/api/v1/calls/sid/${callSid}`);
  }
  /**
   * Update the metadata for a specific call.
   */
  async updateMetadata(callId, metadata) {
    return this.http.patch(`/api/v1/calls/${callId}/metadata`, { metadata });
  }
  /**
   * Get transcripts for a call.
   */
  async getTranscripts(callId, params = {}) {
    const queryParams = {
      include_interim: params.includeInterim ?? false
    };
    if (params.speaker) queryParams.speaker = params.speaker;
    return this.http.get(
      `/api/v1/calls/${callId}/transcripts`,
      queryParams
    );
  }
  /**
   * Get transcripts for a call by SID.
   */
  async getTranscriptsBySid(callSid, params = {}) {
    const queryParams = {
      include_interim: params.includeInterim ?? false
    };
    if (params.speaker) queryParams.speaker = params.speaker;
    return this.http.get(
      `/api/v1/calls/sid/${callSid}/transcripts`,
      queryParams
    );
  }
  /**
   * Export call transcripts in various formats.
   */
  async exportTranscripts(callId, params = {}) {
    const queryParams = {
      format: params.format ?? "txt"
    };
    if (params.speaker) queryParams.speaker = params.speaker;
    return this.http.get(
      `/api/v1/calls/${callId}/transcripts/export`,
      queryParams
    );
  }
  /**
   * Get recordings for a call.
   */
  async getRecordings(callId, params = {}) {
    const queryParams = {};
    if (params.recordingType) queryParams.recording_type = params.recordingType;
    return this.http.get(
      `/api/v1/calls/${callId}/recordings`,
      queryParams
    );
  }
  /**
   * Get recordings for a call by SID.
   */
  async getRecordingsBySid(callSid, params = {}) {
    const queryParams = {};
    if (params.recordingType) queryParams.recording_type = params.recordingType;
    return this.http.get(
      `/api/v1/calls/sid/${callSid}/recordings`,
      queryParams
    );
  }
  /**
   * Get the streaming URL for a recording.
   */
  getRecordingUrl(callId, recordingId) {
    return `${this.http.baseUrlValue}/api/v1/calls/${callId}/recording/${recordingId}/play`;
  }
  /**
   * Get calculated metrics for a call.
   */
  async getMetrics(callId) {
    return this.http.get(`/api/v1/calls/${callId}/metrics`);
  }
  /**
   * Get chat messages (LLM conversation) for a call.
   */
  async getMessages(callId, params = {}) {
    const queryParams = {};
    if (params.role) queryParams.role = params.role;
    return this.http.get(
      `/api/v1/calls/${callId}/messages`,
      queryParams
    );
  }
  /**
   * Get webhook logs for a call.
   */
  async getWebhookLogs(callId, params = {}) {
    const queryParams = {};
    if (params.webhookType) queryParams.webhook_type = params.webhookType;
    return this.http.get(
      `/api/v1/calls/${callId}/webhook-logs`,
      queryParams
    );
  }
  /**
   * Terminate an ongoing call.
   */
  async terminate(callSid) {
    return this.http.post(`/api/v1/calls/${callSid}/terminate`);
  }
  /**
   * Get call analytics for your organization.
   */
  async getAnalytics(period = "7d") {
    return this.http.get("/api/v1/calls/analytics", { period });
  }
  /**
   * Get basic call statistics.
   */
  async getStats() {
    return this.http.get("/api/v1/calls/stats");
  }
  /**
   * Get the count of calls with optional filters.
   */
  async getCount(params = {}) {
    const queryParams = {};
    if (params.status) queryParams.status = params.status;
    if (params.assistantId) queryParams.assistant_id = params.assistantId;
    if (params.dateFrom) queryParams.date_from = params.dateFrom;
    if (params.dateTo) queryParams.date_to = params.dateTo;
    const response = await this.http.get(
      "/api/v1/calls/count",
      queryParams
    );
    return response?.count || 0;
  }
  /**
   * Search calls by various criteria.
   */
  async search(query, limit = 50) {
    return this.http.get("/api/v1/calls/search", { q: query, limit });
  }
  /**
   * Export calls data.
   */
  async export(params = {}) {
    const queryParams = {
      format: params.format ?? "csv"
    };
    if (params.status) queryParams.status = params.status;
    if (params.assistantId) queryParams.assistant_id = params.assistantId;
    if (params.dateFrom) queryParams.date_from = params.dateFrom;
    if (params.dateTo) queryParams.date_to = params.dateTo;
    return this.http.get("/api/v1/calls/export", queryParams);
  }
};

// src/resources/phone-numbers.ts
var PhoneNumbersResource = class extends BaseResource {
  /**
   * List all phone numbers in your organization.
   */
  async list() {
    const response = await this.http.get(
      "/api/v1/phone-numbers"
    );
    if (Array.isArray(response)) {
      return response;
    }
    return response.items || [];
  }
  /**
   * Search for available phone numbers to purchase.
   */
  async search(params) {
    const data = {
      provider: params.provider,
      country_code: params.countryCode ?? "US",
      limit: params.limit ?? 20
    };
    if (params.areaCode) data.area_code = params.areaCode;
    if (params.contains) data.contains = params.contains;
    if (params.locality) data.locality = params.locality;
    if (params.region) data.region = params.region;
    return this.http.post("/api/v1/phone-numbers/search", data);
  }
  /**
   * Purchase a phone number.
   */
  async purchase(params) {
    const data = {
      phone_number: params.phoneNumber,
      provider: params.provider
    };
    if (params.friendlyName) data.friendly_name = params.friendlyName;
    if (params.assistantId) data.assistant_id = params.assistantId;
    if (params.countryCode) data.country_code = params.countryCode;
    return this.http.post("/api/v1/phone-numbers/purchase", data);
  }
  /**
   * Release a phone number.
   */
  async release(phoneNumber, provider) {
    const data = {
      phone_number: phoneNumber
    };
    if (provider) data.provider = provider;
    return this.http.post("/api/v1/phone-numbers/release", data);
  }
  /**
   * Assign a phone number to an assistant.
   */
  async assign(phoneNumberId, params) {
    return this.http.post(
      `/api/v1/assistants/phonenumbers/${phoneNumberId}/assign`,
      params
    );
  }
  /**
   * Unassign a phone number from its assistant.
   */
  async unassign(phoneNumberId) {
    return this.http.post(
      `/api/v1/assistants/phonenumbers/${phoneNumberId}/unassign`
    );
  }
  /**
   * Get available country codes for phone number search.
   */
  async getCountries(provider = "telnyx") {
    return this.http.get(
      "/api/v1/phone-numbers/countries",
      { provider }
    );
  }
  /**
   * Diagnose the connection status of a phone number (Telnyx).
   */
  async diagnose(phoneNumber) {
    return this.http.get(
      `/api/v1/phone-numbers/${encodeURIComponent(phoneNumber)}/diagnose`
    );
  }
  /**
   * Get current webhook configuration for a phone number.
   */
  async getWebhooks(phoneNumber, provider) {
    const queryParams = {};
    if (provider) queryParams.provider = provider;
    return this.http.get(
      `/api/v1/phone-numbers/${encodeURIComponent(phoneNumber)}/webhooks`,
      queryParams
    );
  }
  /**
   * Update voice webhook URL and/or SMS settings for a phone number.
   */
  async updateWebhooks(params) {
    const data = {
      phone_number: params.phoneNumber
    };
    if (params.voiceWebhookUrl) data.voice_webhook_url = params.voiceWebhookUrl;
    if (params.disableSms) data.disable_sms = params.disableSms;
    if (params.enableSms) data.enable_sms = params.enableSms;
    if (params.provider) data.provider = params.provider;
    return this.http.put("/api/v1/phone-numbers/webhooks", data);
  }
  /**
   * Sync verified caller IDs from Twilio for your organization.
   */
  async syncVerifiedCallerIds() {
    return this.http.post(
      "/api/v1/phone-numbers/organization/sync-verified-caller-ids"
    );
  }
  /**
   * Add a new verified caller ID (for outbound calls with unowned numbers).
   */
  async addVerifiedCallerId(params) {
    const data = {
      phone_number: params.phoneNumber
    };
    if (params.friendlyName) data.friendly_name = params.friendlyName;
    return this.http.post(
      "/api/v1/phone-numbers/organization/add-verified-caller-id",
      data
    );
  }
  /**
   * Sync phone numbers from telephony providers.
   */
  async sync() {
    return this.http.post("/api/v1/organization/phone-numbers/sync");
  }
};

// src/resources/documents.ts
var DocumentsResource = class extends BaseResource {
  /**
   * List all documents for an assistant.
   */
  async list(assistantId) {
    const response = await this.http.get(
      `/api/v1/assistants/${assistantId}/documents`
    );
    if (Array.isArray(response)) {
      return response;
    }
    return response.items || [];
  }
  /**
   * Upload a document to an assistant's knowledge base.
   *
   * Note: For browser usage, pass a File object. For Node.js, use uploadFromUrl instead.
   */
  async upload(assistantId, file, filename, autoProcess = true) {
    return this.http.uploadFile(
      `/api/v1/assistants/${assistantId}/documents`,
      file,
      filename,
      { auto_process: String(autoProcess) }
    );
  }
  /**
   * Upload a document from a URL.
   */
  async uploadFromUrl(params) {
    return this.http.post(
      `/api/v1/assistants/${params.assistantId}/documents/url`,
      {
        url: params.url,
        filename: params.filename,
        auto_process: params.autoProcess ?? true
      }
    );
  }
  /**
   * Get the processing status of a document.
   */
  async getStatus(documentId) {
    return this.http.get(
      `/api/v1/assistants/documents/${documentId}/status`
    );
  }
  /**
   * Delete a document.
   */
  async delete(documentId) {
    await this.http.delete(`/api/v1/assistants/documents/${documentId}`);
  }
  /**
   * Reprocess a document.
   */
  async reprocess(documentId) {
    return this.http.post(
      `/api/v1/assistants/documents/${documentId}/reprocess`
    );
  }
};

// src/resources/tools.ts
var ToolsResource = class extends BaseResource {
  /**
   * List all tools in your organization.
   */
  async list() {
    const response = await this.http.get("/api/v1/tools");
    if (Array.isArray(response)) {
      return response;
    }
    return response.items || [];
  }
  /**
   * Get a specific tool by ID.
   */
  async get(toolId) {
    return this.http.get(`/api/v1/tools/${toolId}`);
  }
  /**
   * Create a new tool.
   */
  async create(params) {
    return this.http.post("/api/v1/tools", params);
  }
  /**
   * Update an existing tool.
   */
  async update(toolId, params) {
    return this.http.patch(`/api/v1/tools/${toolId}`, params);
  }
  /**
   * Delete a tool.
   */
  async delete(toolId) {
    await this.http.delete(`/api/v1/tools/${toolId}`);
  }
  /**
   * Assign a tool to an assistant.
   */
  async assign(toolId, assistantId) {
    return this.http.post(`/api/v1/tools/${toolId}/assign`, {
      assistant_id: assistantId
    });
  }
  /**
   * Unassign a tool from an assistant.
   */
  async unassign(toolId, assistantId) {
    return this.http.post(`/api/v1/tools/${toolId}/unassign`, {
      assistant_id: assistantId
    });
  }
  /**
   * Discover AWS Lambda functions for creating Lambda tools.
   */
  async discoverLambda(region = "us-east-1") {
    const response = await this.http.get("/api/v1/tools/discover-lambda", { region });
    if (Array.isArray(response)) {
      return response;
    }
    return response.functions || [];
  }
};

// src/resources/sms.ts
var SMSResource = class extends BaseResource {
  /**
   * Send an SMS message through an assistant.
   *
   * The system will automatically:
   * 1. Find the assistant associated with the from_phone_number
   * 2. Use the assistant's configured telephony provider
   * 3. Queue the SMS for delivery with per-provider rate limiting (default)
   * 4. Persist the outbound message to the SMS conversation
   */
  async send(params) {
    const data = {
      from_phone_number: params.fromPhoneNumber,
      to_phone_number: params.toPhoneNumber,
      message: params.message,
      queue: params.queue ?? true
    };
    if (params.mediaUrls && params.mediaUrls.length > 0) {
      data.media_urls = params.mediaUrls;
    }
    if (params.idempotencyKey) {
      data.idempotency_key = params.idempotencyKey;
    }
    return this.http.post("/sms/send", data);
  }
  /**
   * Get the status of a sent SMS message.
   */
  async getStatus(messageId) {
    return this.http.get(`/sms/status/${messageId}`);
  }
  /**
   * Cancel a queued SMS message (before it's sent).
   */
  async cancel(messageId) {
    return this.http.post(`/sms/cancel/${messageId}`);
  }
  /**
   * Get SMS queue statistics.
   */
  async getQueueStats() {
    return this.http.get("/sms/queue/stats");
  }
  // SMS Conversations API
  /**
   * List SMS conversations.
   */
  async listConversations(params = {}) {
    const queryParams = {
      skip: params.skip ?? 0,
      limit: params.limit ?? 50
    };
    if (params.status) queryParams.status = params.status;
    if (params.assistantId) queryParams.assistant_id = params.assistantId;
    if (params.customerPhone) queryParams.customer_phone = params.customerPhone;
    if (params.dateFrom) queryParams.date_from = params.dateFrom;
    if (params.dateTo) queryParams.date_to = params.dateTo;
    return this.http.get("/api/v1/sms-conversations/", queryParams);
  }
  /**
   * Get a specific SMS conversation by ID.
   */
  async getConversation(conversationId) {
    return this.http.get(
      `/api/v1/sms-conversations/${conversationId}`
    );
  }
  /**
   * Get all messages in an SMS conversation.
   */
  async getMessages(conversationId) {
    return this.http.get(
      `/api/v1/sms-conversations/${conversationId}/messages`
    );
  }
  /**
   * Get related calls and SMS conversations that share the same unified session.
   */
  async getRelatedConversations(conversationId) {
    return this.http.get(
      `/api/v1/sms-conversations/${conversationId}/related`
    );
  }
  /**
   * Archive an SMS conversation and purge associated data.
   */
  async deleteConversation(conversationId) {
    return this.http.delete(
      `/api/v1/sms-conversations/${conversationId}`
    );
  }
  /**
   * Export an SMS conversation in various formats.
   */
  async exportConversation(conversationId, params = {}) {
    return this.http.get(
      `/api/v1/sms-conversations/${conversationId}/export`,
      { format: params.format ?? "txt" }
    );
  }
  // Backward compatibility aliases
  /**
   * @deprecated Use listConversations() instead
   */
  async getConversations(params = {}) {
    return this.listConversations(params);
  }
};

// src/resources/campaigns.ts
var CampaignsResource = class extends BaseResource {
  /**
   * List campaigns.
   */
  async list(params = {}) {
    const response = await this.http.get(
      "/api/v1/campaigns",
      params
    );
    if (Array.isArray(response)) {
      return response;
    }
    return response.items || [];
  }
  /**
   * Get a specific campaign by ID.
   */
  async get(campaignId) {
    return this.http.get(`/api/v1/campaigns/${campaignId}`);
  }
  /**
   * Create a new campaign.
   */
  async create(params) {
    return this.http.post("/api/v1/campaigns", {
      name: params.name,
      description: params.description,
      assistant_id: params.assistantId,
      campaign_type: params.campaignType || "call",
      contacts: params.contacts,
      phone_number_id: params.phoneNumberId,
      schedule: params.schedule,
      settings: params.settings
    });
  }
  /**
   * Update a campaign.
   */
  async update(campaignId, params) {
    return this.http.patch(`/api/v1/campaigns/${campaignId}`, params);
  }
  /**
   * Delete a campaign.
   */
  async delete(campaignId) {
    await this.http.delete(`/api/v1/campaigns/${campaignId}`);
  }
  /**
   * Start a campaign.
   */
  async start(campaignId) {
    return this.http.post(`/api/v1/campaigns/${campaignId}/start`);
  }
  /**
   * Pause a running campaign.
   */
  async pause(campaignId) {
    return this.http.post(`/api/v1/campaigns/${campaignId}/pause`);
  }
  /**
   * Resume a paused campaign.
   */
  async resume(campaignId) {
    return this.http.post(`/api/v1/campaigns/${campaignId}/resume`);
  }
  /**
   * Cancel a campaign.
   */
  async cancel(campaignId) {
    return this.http.post(`/api/v1/campaigns/${campaignId}/cancel`);
  }
  /**
   * Get the progress of a campaign.
   */
  async getProgress(campaignId) {
    return this.http.get(`/api/v1/campaigns/${campaignId}/progress`);
  }
  /**
   * Get contacts in a campaign.
   */
  async getContacts(campaignId, params = {}) {
    const response = await this.http.get(`/api/v1/campaigns/${campaignId}/contacts`, params);
    if (Array.isArray(response)) {
      return response;
    }
    return response.items || [];
  }
  /**
   * Add contacts to a campaign.
   */
  async addContacts(campaignId, contacts) {
    return this.http.post(
      `/api/v1/campaigns/${campaignId}/contacts`,
      { contacts }
    );
  }
};

// src/realtime/live-transcript.ts
var LiveTranscriptStream = class {
  wsUrl;
  token;
  websocket = null;
  running = false;
  constructor(wsUrl, token) {
    this.wsUrl = wsUrl;
    this.token = token;
  }
  /**
   * Connect to the WebSocket.
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        const url = `${this.wsUrl}?token=${this.token}`;
        this.websocket = new WebSocket(url);
        this.running = true;
        this.websocket.onopen = () => {
          resolve();
        };
        this.websocket.onerror = (error) => {
          reject(new WebSocketError(`Failed to connect to transcript stream: ${error}`));
        };
      } catch (error) {
        reject(new WebSocketError(`Failed to connect to transcript stream: ${error}`));
      }
    });
  }
  /**
   * Disconnect from the WebSocket.
   */
  disconnect() {
    this.running = false;
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }
  /**
   * Iterate over incoming events using async iteration.
   */
  async *[Symbol.asyncIterator]() {
    if (!this.websocket) {
      throw new WebSocketError("Not connected. Call connect() first.");
    }
    const messageQueue = [];
    let resolveMessage = null;
    let closed = false;
    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const parsedEvent = this.parseEvent(data);
        if (parsedEvent) {
          if (resolveMessage) {
            resolveMessage(parsedEvent);
            resolveMessage = null;
          } else {
            messageQueue.push(parsedEvent);
          }
        }
      } catch {
      }
    };
    this.websocket.onclose = () => {
      closed = true;
      if (resolveMessage) {
        resolveMessage(null);
      }
    };
    this.websocket.onerror = () => {
      closed = true;
      if (resolveMessage) {
        resolveMessage(null);
      }
    };
    while (this.running && !closed) {
      if (messageQueue.length > 0) {
        const event = messageQueue.shift();
        yield event;
      } else {
        const event = await new Promise((resolve) => {
          resolveMessage = resolve;
        });
        if (event === null) {
          break;
        }
        yield event;
      }
    }
  }
  parseEvent(data) {
    const eventType = data.type;
    if (eventType === "transcript") {
      const transcriptData = data.data || {};
      return {
        type: "transcript",
        callSid: data.call_sid || "",
        timestamp: data.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
        content: transcriptData.content || "",
        speaker: transcriptData.speaker || "user",
        isFinal: transcriptData.is_final ?? true,
        confidence: transcriptData.confidence,
        segmentStart: transcriptData.segment_start,
        segmentEnd: transcriptData.segment_end
      };
    } else if (eventType === "call_status") {
      return {
        type: "call_status",
        callSid: data.call_sid || "",
        timestamp: data.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
        status: data.status || "",
        metadata: data.metadata || {}
      };
    }
    return null;
  }
  /**
   * Check if the WebSocket is connected.
   */
  get connected() {
    return this.websocket !== null && this.running;
  }
};

// src/realtime/campaign-progress.ts
var CampaignProgressStream = class {
  wsUrl;
  token;
  websocket = null;
  running = false;
  constructor(wsUrl, token) {
    this.wsUrl = wsUrl;
    this.token = token;
  }
  /**
   * Connect to the WebSocket.
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        const url = `${this.wsUrl}?token=${this.token}`;
        this.websocket = new WebSocket(url);
        this.running = true;
        this.websocket.onopen = () => {
          resolve();
        };
        this.websocket.onerror = (error) => {
          reject(new WebSocketError(`Failed to connect to campaign progress stream: ${error}`));
        };
      } catch (error) {
        reject(new WebSocketError(`Failed to connect to campaign progress stream: ${error}`));
      }
    });
  }
  /**
   * Disconnect from the WebSocket.
   */
  disconnect() {
    this.running = false;
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }
  /**
   * Iterate over incoming events using async iteration.
   */
  async *[Symbol.asyncIterator]() {
    if (!this.websocket) {
      throw new WebSocketError("Not connected. Call connect() first.");
    }
    const messageQueue = [];
    let resolveMessage = null;
    let closed = false;
    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const parsedEvent = this.parseEvent(data);
        if (parsedEvent) {
          if (resolveMessage) {
            resolveMessage(parsedEvent);
            resolveMessage = null;
          } else {
            messageQueue.push(parsedEvent);
          }
        }
      } catch {
      }
    };
    this.websocket.onclose = () => {
      closed = true;
      if (resolveMessage) {
        resolveMessage(null);
      }
    };
    this.websocket.onerror = () => {
      closed = true;
      if (resolveMessage) {
        resolveMessage(null);
      }
    };
    while (this.running && !closed) {
      if (messageQueue.length > 0) {
        const event = messageQueue.shift();
        yield event;
      } else {
        const event = await new Promise((resolve) => {
          resolveMessage = resolve;
        });
        if (event === null) {
          break;
        }
        yield event;
      }
    }
  }
  parseEvent(data) {
    const eventType = data.type;
    const timestamp = data.timestamp || (/* @__PURE__ */ new Date()).toISOString();
    const campaignId = data.campaign_id || 0;
    if (eventType === "progress") {
      return {
        type: "progress",
        campaignId,
        timestamp,
        totalContacts: data.total_contacts || 0,
        completedContacts: data.completed_contacts || 0,
        failedContacts: data.failed_contacts || 0,
        pendingContacts: data.pending_contacts || 0,
        inProgressContacts: data.in_progress_contacts || 0,
        completionPercentage: data.completion_percentage || 0,
        contactId: data.contact_id,
        contactPhone: data.contact_phone,
        contactStatus: data.contact_status,
        contactError: data.contact_error
      };
    } else if (eventType === "contact_update") {
      return {
        type: "contact_update",
        campaignId,
        timestamp,
        contactId: data.contact_id || 0,
        phoneNumber: data.phone_number || "",
        status: data.status || "",
        callSid: data.call_sid,
        callDuration: data.call_duration,
        errorMessage: data.error_message
      };
    } else if (eventType === "campaign_completed") {
      return {
        type: "campaign_completed",
        campaignId,
        timestamp,
        totalContacts: data.total_contacts || 0,
        completedContacts: data.completed_contacts || 0,
        failedContacts: data.failed_contacts || 0,
        successRate: data.success_rate || 0,
        totalDuration: data.total_duration || 0,
        totalCost: data.total_cost || 0
      };
    }
    return null;
  }
  /**
   * Send a ping message to keep the connection alive.
   */
  sendPing() {
    if (this.websocket) {
      this.websocket.send(JSON.stringify({ type: "ping" }));
    }
  }
  /**
   * Check if the WebSocket is connected.
   */
  get connected() {
    return this.websocket !== null && this.running;
  }
};

// src/realtime/client.ts
var RealtimeClient = class {
  auth;
  wsBaseUrl;
  constructor(auth, baseUrl) {
    this.auth = auth;
    this.wsBaseUrl = baseUrl.replace("https://", "wss://").replace("http://", "ws://").replace(/\/$/, "");
  }
  /**
   * Create a live transcript stream for a call.
   */
  liveTranscript(callSid) {
    return new LiveTranscriptStream(
      `${this.wsBaseUrl}/live-transcript/${callSid}`,
      this.auth.getWebSocketToken()
    );
  }
  /**
   * Create a campaign progress stream.
   */
  campaignProgress(campaignId) {
    return new CampaignProgressStream(
      `${this.wsBaseUrl}/ws/campaigns/${campaignId}/progress`,
      this.auth.getWebSocketToken()
    );
  }
};

// src/client.ts
var BurkiClient = class {
  auth;
  httpClient;
  baseUrl;
  _assistants;
  _calls;
  _phoneNumbers;
  _documents;
  _tools;
  _sms;
  _campaigns;
  _realtime;
  constructor(options) {
    this.auth = new BurkiAuth(options.apiKey);
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    this.httpClient = new HTTPClient({
      auth: this.auth,
      baseUrl: this.baseUrl,
      timeout: options.timeout || DEFAULT_TIMEOUT
    });
  }
  /**
   * Access the Assistants resource.
   */
  get assistants() {
    if (!this._assistants) {
      this._assistants = new AssistantsResource(this.httpClient);
    }
    return this._assistants;
  }
  /**
   * Access the Calls resource.
   */
  get calls() {
    if (!this._calls) {
      this._calls = new CallsResource(this.httpClient);
    }
    return this._calls;
  }
  /**
   * Access the Phone Numbers resource.
   */
  get phoneNumbers() {
    if (!this._phoneNumbers) {
      this._phoneNumbers = new PhoneNumbersResource(this.httpClient);
    }
    return this._phoneNumbers;
  }
  /**
   * Access the Documents resource.
   */
  get documents() {
    if (!this._documents) {
      this._documents = new DocumentsResource(this.httpClient);
    }
    return this._documents;
  }
  /**
   * Access the Tools resource.
   */
  get tools() {
    if (!this._tools) {
      this._tools = new ToolsResource(this.httpClient);
    }
    return this._tools;
  }
  /**
   * Access the SMS resource.
   */
  get sms() {
    if (!this._sms) {
      this._sms = new SMSResource(this.httpClient);
    }
    return this._sms;
  }
  /**
   * Access the Campaigns resource.
   */
  get campaigns() {
    if (!this._campaigns) {
      this._campaigns = new CampaignsResource(this.httpClient);
    }
    return this._campaigns;
  }
  /**
   * Access the Realtime (WebSocket) client.
   */
  get realtime() {
    if (!this._realtime) {
      this._realtime = new RealtimeClient(this.auth, this.baseUrl);
    }
    return this._realtime;
  }
};
export {
  AssistantsResource,
  AuthenticationError,
  BurkiAuth,
  BurkiClient,
  BurkiError,
  CallsResource,
  CampaignProgressStream,
  CampaignsResource,
  DocumentsResource,
  LiveTranscriptStream,
  NotFoundError,
  PhoneNumbersResource,
  RateLimitError,
  RealtimeClient,
  SMSResource,
  ServerError,
  ToolsResource,
  ValidationError,
  WebSocketError
};
