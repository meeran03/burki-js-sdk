// Recovered from the published @burki.dev/sdk 0.1.0 declarations.
/**
 * Authentication module for Burki SDK.
 */
declare class BurkiAuth {
    private apiKey;
    constructor(apiKey: string);
    /**
     * Get authentication headers for API requests.
     */
    get headers(): Record<string, string>;
    /**
     * Get the token for WebSocket authentication.
     */
    getWebSocketToken(): string;
}

/**
 * HTTP client module for Burki SDK.
 */

interface HTTPClientOptions {
    auth: BurkiAuth;
    baseUrl?: string;
    timeout?: number;
}
declare class HTTPClient {
    private auth;
    private baseUrl;
    private timeout;
    constructor(options: HTTPClientOptions);
    private handleResponse;
    private buildUrl;
    request<T>(method: string, path: string, options?: {
        params?: Record<string, unknown>;
        body?: unknown;
        headers?: Record<string, string>;
    }): Promise<T>;
    get<T>(path: string, params?: Record<string, unknown>): Promise<T>;
    post<T>(path: string, body?: unknown, params?: Record<string, unknown>): Promise<T>;
    put<T>(path: string, body?: unknown, params?: Record<string, unknown>): Promise<T>;
    patch<T>(path: string, body?: unknown, params?: Record<string, unknown>): Promise<T>;
    delete<T>(path: string, params?: Record<string, unknown>): Promise<T>;
    uploadFile<T>(path: string, file: File | Blob, filename: string, additionalData?: Record<string, string>): Promise<T>;
    /**
     * Get the base URL for constructing external URLs.
     */
    get baseUrlValue(): string;
}

/**
 * Base resource class for Burki SDK.
 */

declare class BaseResource {
    protected http: HTTPClient;
    constructor(httpClient: HTTPClient);
}

/**
 * Assistant models for the Burki SDK.
 */
interface LLMProviderConfig {
    apiKey?: string;
    baseUrl?: string;
    /** Exact provider model ID, including gpt-6.1-sol, gpt-6-sol, gpt-6-luna and gpt-6-astra. */
    model?: string;
    customConfig?: Record<string, unknown>;
}
interface LLMSettings {
    /** @deprecated Use llmProviderConfig.model. Kept for earlier README examples. */
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    welcomeMessage?: string;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stopSequences?: string[];
}
interface BackgroundSoundSettings {
    enabled?: boolean;
    storageKey?: string;
    soundUrl?: string;
    volume?: number;
    loop?: boolean;
}
/** Provider options are normalized only for documented option aliases. Unknown keys are preserved. */
interface TTSProviderConfig extends Record<string, unknown> {
    apiKey?: string;
    language?: string;
    customVoiceId?: string;
    pronunciationDictionaryLocators?: Array<{ pronunciation_dictionary_id: string; version_id?: string }>;
    pronunciationDictId?: string;
    pronunciationDictionary?: unknown;
    api_key?: string;
    custom_voice_id?: string;
    pronunciation_dictionary_locators?: Array<{ pronunciation_dictionary_id: string; version_id?: string }>;
}
interface STTProviderConfig extends Record<string, unknown> {
    apiKey?: string;
    /** AssemblyAI recognition context describing expected conversations. */
    prompt?: string;
    /** AssemblyAI language restrictions; for English and Urdu use ['en', 'ur']. */
    languageCodes?: string[];
    languageHints?: string[];
    phraseList?: string[];
    api_key?: string;
    language_codes?: string[];
    language_hints?: string[];
    phrase_list?: string[];
}
interface LiveVoiceSettings {
    model?: 'gpt-live-1';
    voice?: 'marin' | 'cedar';
    instructions?: string;
}
interface SpeculativeConfig {
    enableSpeculativeLlm?: boolean;
    speculativeStreamToTts?: boolean;
    speculativeDebounceMs?: number;
    speculativeMinWords?: number;
    speculativeSimilarityThreshold?: number;
}
interface SendSmsTool {
    enabled?: boolean;
    scenarios?: string[];
    defaultMessage?: string;
}
interface CallbackCollectionSettings { enabled?: boolean; }
interface BackchannelGenerationSettings { enabled?: boolean; frequency?: number; }
interface TTSSettings {
    provider?: string;
    voiceId?: string;
    modelId?: string;
    latency?: number;
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
    speed?: number;
    volume?: number;
    providerConfig?: TTSProviderConfig;
    backgroundSound?: BackgroundSoundSettings;
}
interface STTEndpointingSettings {
    silenceThreshold?: number;
    minSilenceDuration?: number;
}
interface Keyword {
    keyword: string;
    intensifier?: number;
}
/**
 * Configuration for Deepgram Flux models (AI-powered turn detection).
 */
interface FluxConfig {
    eotTimeoutMs?: number;
    eagerEotThreshold?: number;
    eotThreshold?: number;
    tag?: string;
    mipOptOut?: boolean;
    languageHints?: string[];
}
interface STTSettings {
    provider?: string;
    model?: string;
    language?: string;
    punctuate?: boolean;
    interimResults?: boolean;
    endpointing?: STTEndpointingSettings;
    utteranceEndMs?: number;
    vadTurnoff?: number;
    smartFormat?: boolean;
    keywords?: Keyword[];
    keyterms?: string[];
    audioDenoising?: boolean;
    fluxConfig?: FluxConfig;
    diarize?: boolean;
    detectEntities?: boolean;
    speculativeConfig?: SpeculativeConfig;
    utteranceTimeoutSeconds?: number;
    incompleteUtteranceDetection?: boolean;
    preferFluxForEnglish?: boolean;
    englishFluxConfig?: FluxConfig;
    providerConfig?: STTProviderConfig;
}
interface EndCallTool {
    enabled?: boolean;
    scenarios?: string[];
    customMessage?: string;
}
interface TransferCallTool {
    enabled?: boolean;
    scenarios?: string[];
    transferNumbers?: string[];
    configVersion?: 1;
    destinationMode?: 'fixed' | 'dynamic';
    dynamicPhonePrefixes?: string[];
    dynamicSipDomains?: string[];
    dynamicExtensions?: string[];
    transferType?: 'cold' | 'warm';
    handoffMode?: 'connect' | 'confirm_only';
    maxTransferAttempts?: number;
    warmTransferMode?: 'brief' | 'agentic';
    agenticTransferPrompt?: string;
    agenticTimeoutAction?: 'cancel' | 'bridge';
    agenticMaxTurns?: number;
    agenticIvrNavigation?: boolean;
    coldTransferMode?: 'sip_invite' | 'sip_refer';
    outboundPhoneNumberId?: number;
    ringTimeoutSeconds?: number;
    callerIdMode?: 'assistant' | 'caller' | 'custom';
    customCallerId?: string;
    sipHeaders?: Record<string, string>;
    sipHeaderVariables?: Record<string, string>;
    extensionDigits?: string;
    threeWayTone?: boolean;
    agentConfirmation?: boolean;
    unavailableMessage?: string;
    whisperMessage?: string;
    threeWayMessage?: string;
    agentAnswerTimeoutSeconds?: number;
    onHoldMusic?: 'default' | 'none' | 'relaxing' | 'uplifting';
    customMessage?: string;
}
/**
 * Configuration for the DTMF solver tool - allows AI to send DTMF tones.
 */
interface DtmfSolverTool {
    enabled?: boolean;
    scenarios?: string[];
}
interface ToolsSettings {
    enabledTools?: string[];
    endCall?: EndCallTool;
    transferCall?: TransferCallTool;
    dtmfSolver?: DtmfSolverTool;
    sendSms?: SendSmsTool;
    callbackCollection?: CallbackCollectionSettings;
    customTools?: Record<string, unknown>[];
}
interface RAGSettings {
    enabled?: boolean;
    searchLimit?: number;
    similarityThreshold?: number;
    embeddingModel?: string;
    chunkingStrategy?: string;
    chunkSize?: number;
    chunkOverlap?: number;
    autoProcess?: boolean;
    includeMetadata?: boolean;
    contextWindowTokens?: number;
    ragInjectBeforeLlm?: boolean;
}
interface InterruptionSettings {
    interruptionThreshold?: number;
    minSpeakingTime?: number;
    interruptionCooldown?: number;
    interruptionMode?: string;
    minConfidence?: number;
    minSttConfidence?: number;
    tentativeWindowMs?: number;
    confirmationWindowMs?: number;
    tentativeConfirmWords?: number;
    backchannelFilter?: boolean;
    tailProtectionMs?: number;
}
interface RecordingSettings {
    enabled?: boolean;
    format?: string;
    channels?: string | number;
    sampleRate?: number;
    recordUserAudio?: boolean;
    recordAssistantAudio?: boolean;
    recordMixedAudio?: boolean;
    recordUserOnlyTrack?: boolean;
    autoSave?: boolean;
    recordingsDir?: string;
    createDatabaseRecords?: boolean;
    disclosureEnabled?: boolean;
    disclosureMessage?: string;
    disclosureMode?: string;
}
/**
 * Configuration for a single LLM fallback provider.
 */
interface LLMFallbackConfig {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    wsUrl?: string;
    headers?: Record<string, string>;
    customConfig?: Record<string, unknown>;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stopSequences?: string[];
}
interface LLMFallbackProvider extends LLMFallbackConfig {
    provider: string;
    enabled?: boolean;
    config?: LLMFallbackConfig;
}
/**
 * Settings for LLM fallback providers.
 */
interface LLMFallbackSettings {
    enabled?: boolean;
    fallbacks?: LLMFallbackProvider[];
}
interface Assistant {
    id: number;
    name: string;
    description?: string;
    organizationId?: number;
    isActive?: boolean;
    voiceMode?: 'cascade' | 'openai_live';
    liveSettings?: LiveVoiceSettings;
    backchannelGenerationSettings?: BackchannelGenerationSettings;
    llmProvider?: string;
    llmProviderConfig?: LLMProviderConfig;
    llmSettings?: LLMSettings;
    ttsSettings?: TTSSettings;
    sttSettings?: STTSettings;
    ragSettings?: RAGSettings;
    toolsSettings?: ToolsSettings;
    interruptionSettings?: InterruptionSettings;
    recordingSettings?: RecordingSettings;
    webhookUrl?: string;
    webhookHeaders?: Record<string, string>;
    smsWebhookUrl?: string;
    messagingServiceSid?: string;
    endCallMessage?: string;
    transferCallMessage?: string;
    idleMessage?: string;
    maxIdleMessages?: number;
    idleTimeout?: number;
    maxCallLength?: number;
    conversationContinuityEnabled?: boolean;
    llmFallbackProviders?: LLMFallbackSettings;
    customSettings?: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
    callCount?: number;
    totalDuration?: number;
    phoneNumbers?: string[];
}
interface CamelAssistantCreateParams {
    name: string;
    description?: string;
    voiceMode?: 'cascade' | 'openai_live';
    liveSettings?: LiveVoiceSettings;
    backchannelGenerationSettings?: BackchannelGenerationSettings;
    llmProvider?: string;
    llmProviderConfig?: LLMProviderConfig;
    llmSettings?: LLMSettings;
    ttsSettings?: TTSSettings;
    sttSettings?: STTSettings;
    ragSettings?: RAGSettings;
    toolsSettings?: ToolsSettings;
    interruptionSettings?: InterruptionSettings;
    recordingSettings?: RecordingSettings;
    webhookUrl?: string;
    webhookHeaders?: Record<string, string>;
    smsWebhookUrl?: string;
    messagingServiceSid?: string;
    endCallMessage?: string;
    transferCallMessage?: string;
    idleMessage?: string;
    maxIdleMessages?: number;
    idleTimeout?: number;
    maxCallLength?: number;
    conversationContinuityEnabled?: boolean;
    llmFallbackProviders?: LLMFallbackSettings;
    customSettings?: Record<string, unknown>;
    isActive?: boolean;
}
interface CamelAssistantUpdateParams {
    name?: string;
    description?: string | null;
    isActive?: boolean;
    voiceMode?: 'cascade' | 'openai_live';
    liveSettings?: LiveVoiceSettings;
    backchannelGenerationSettings?: BackchannelGenerationSettings;
    llmProvider?: string;
    llmProviderConfig?: LLMProviderConfig;
    llmSettings?: LLMSettings;
    ttsSettings?: TTSSettings;
    sttSettings?: STTSettings;
    ragSettings?: RAGSettings;
    toolsSettings?: ToolsSettings;
    interruptionSettings?: InterruptionSettings;
    recordingSettings?: RecordingSettings;
    webhookUrl?: string | null;
    webhookHeaders?: Record<string, string>;
    smsWebhookUrl?: string | null;
    messagingServiceSid?: string | null;
    endCallMessage?: string | null;
    transferCallMessage?: string | null;
    idleMessage?: string | null;
    maxIdleMessages?: number;
    idleTimeout?: number;
    maxCallLength?: number;
    conversationContinuityEnabled?: boolean;
    llmFallbackProviders?: LLMFallbackSettings;
    customSettings?: Record<string, unknown>;
}
type SnakeCase<S extends string> = S extends `${infer First}${infer Rest}`
    ? `${First extends Lowercase<First> ? First : `_${Lowercase<First>}`}${SnakeCase<Rest>}` : S;
type WithSnakeAliases<T> = T extends readonly (infer Item)[] ? WithSnakeAliases<Item>[]
    : T extends object ? string extends keyof T ? T
    : { [Key in keyof T]: WithSnakeAliases<T[Key]> } & {
        [Key in keyof T as Key extends string ? SnakeCase<Key> : Key]: WithSnakeAliases<T[Key]>
    } : T;
/** Both input spellings are accepted; an explicit snake_case field wins alias collisions. */
type AssistantCreateParams = WithSnakeAliases<CamelAssistantCreateParams>;
type AssistantUpdateParams = WithSnakeAliases<CamelAssistantUpdateParams>;

interface AssistantListParams {
    skip?: number;
    limit?: number;
    activeOnly?: boolean;
    myAssistantsOnly?: boolean;
    includeStats?: boolean;
}
interface AssistantList {
    items: Assistant[];
    total: number;
    skip: number;
    limit: number;
}
/**
 * Cloned voice information.
 */
interface ClonedVoice {
    id: string;
    name: string;
    provider: string;
    status: string;
    createdAt?: string;
}
/**
 * Provider configuration information.
 */
interface ProviderInfo {
    name: string;
    models: string[];
    defaultModel?: string;
    supportsStreaming?: boolean;
}

/**
 * Assistants resource for the Burki SDK.
 */

interface AssistantExportParams {
    format?: 'csv' | 'json';
    assistantIds?: number[];
    search?: string;
    status?: 'active' | 'inactive' | 'all';
}
declare class AssistantsResource extends BaseResource {
    /**
     * List all assistants in your organization.
     */
    list(params?: AssistantListParams): Promise<Assistant[]>;
    /**
     * Get a specific assistant by ID.
     */
    get(assistantId: number): Promise<Assistant>;
    /**
     * Get an assistant by its assigned phone number.
     */
    getByPhone(phoneNumber: string): Promise<Assistant>;
    /**
     * Create a new assistant.
     */
    create(params: AssistantCreateParams): Promise<Assistant>;
    /**
     * Update an existing assistant (PATCH - partial update with merge).
     */
    update(assistantId: number, params: AssistantUpdateParams): Promise<Assistant>;
    /**
     * Quick method to update just the active status of an assistant.
     */
    updateStatus(assistantId: number, isActive: boolean): Promise<Assistant>;
    /**
     * Delete an assistant.
     */
    delete(assistantId: number): Promise<void>;
    /**
     * Get the total count of assistants.
     */
    getCount(activeOnly?: boolean): Promise<number>;
    /**
     * Export assistants data in CSV or JSON format.
     */
    export(params?: AssistantExportParams): Promise<Blob>;
    /**
     * List cloned voices for your organization.
     */
    getClonedVoices(params?: {
        status?: string;
        provider?: string;
    }): Promise<ClonedVoice[]>;
    /**
     * Get list of supported LLM providers.
     */
    getProviders(): Promise<Record<string, ProviderInfo>>;
    /**
     * Get information about your organization.
     */
    getOrganizationInfo(): Promise<Record<string, unknown>>;
}

/**
 * Call models for the Burki SDK.
 */
interface Call {
    id: number;
    organizationId?: number;
    assistantId?: number;
    callSid?: string;
    streamSid?: string;
    status: string;
    direction: string;
    customerPhone?: string;
    twilioPhone?: string;
    telephonyProvider?: string;
    duration?: number;
    startedAt?: string;
    endedAt?: string;
    createdAt?: string;
    updatedAt?: string;
    welcomeMessage?: string;
    agenda?: string;
    metadata?: Record<string, unknown>;
    errorMessage?: string;
    endReason?: string;
    transferredTo?: string;
    assistantName?: string;
    transcriptCount?: number;
    recordingCount?: number;
    cost?: number;
    costBreakdown?: {
        llm?: number;
        tts?: number;
        stt?: number;
        telephony?: number;
    };
}
interface PaginatedCalls {
    items: Call[];
    total: number;
    skip: number;
    limit: number;
}
interface CallTranscript {
    id: number;
    callId: number;
    speaker: string;
    text: string;
    timestamp?: string;
    isFinal: boolean;
    confidence?: number;
    language?: string;
    createdAt?: string;
}
interface CallRecording {
    id: number;
    callId: number;
    recordingType: string;
    url?: string;
    duration?: number;
    sizeBytes?: number;
    format?: string;
    createdAt?: string;
}
interface CallMetrics {
    callId: number;
    durationSeconds?: number;
    talkTimeUser?: number;
    talkTimeAssistant?: number;
    silenceTime?: number;
    interruptions?: number;
    averageResponseTime?: number;
    sentimentScore?: number;
    emotionDetected?: string;
    topicsDiscussed?: string[];
    summary?: string;
    costEstimate?: number;
    tokensUsed?: number;
    avgResponseTime?: number;
    fastestResponseTime?: number;
    responseTimeStd?: number;
    avgCustomerResponseTime?: number;
    avgAiResponseTime?: number;
    conversationFlowScore?: number;
    engagementScore?: number;
    userPercentage?: number;
    aiPercentage?: number;
    userTurns?: number;
    aiTurns?: number;
    avgSilenceDuration?: number;
    awkwardSilencesCount?: number;
    totalSilenceTime?: number;
    silencePercentage?: number;
    totalCustomerWords?: number;
    totalAiWords?: number;
    speakingTimeRatio?: number;
    interruptionCount?: number;
    avgUserFrustration?: number;
    avgUserStress?: number;
    primaryIntent?: string;
    intentResolved?: boolean;
    aiResponseAccuracy?: number;
}
interface ChatMessage {
    id: number;
    callId: number;
    role: string;
    content: string;
    name?: string;
    toolCallId?: string;
    toolCalls?: Array<Record<string, unknown>>;
    timestamp?: string;
    createdAt?: string;
}
interface WebhookLog {
    id: number;
    callId: number;
    webhookType: string;
    url: string;
    requestBody?: Record<string, unknown>;
    responseStatus?: number;
    responseBody?: string;
    error?: string;
    latencyMs?: number;
    createdAt?: string;
}
interface CallAnalytics {
    period: string;
    totalCalls: number;
    completedCalls: number;
    failedCalls: number;
    ongoingCalls?: number;
    averageDuration?: number;
    totalDuration?: number;
    totalCost?: number;
    successRate?: number;
    callsByDay?: Array<Record<string, unknown>>;
    callsByAssistant?: Array<Record<string, unknown>>;
    callsByStatus?: Record<string, number>;
    sentimentDistribution?: Record<string, number>;
    averageSentiment?: number;
    topTopics?: Array<Record<string, unknown>>;
    peakHours?: Array<Record<string, unknown>>;
    dailyStats?: Record<string, {
        total: number;
        completed: number;
        failed: number;
    }>;
    topAssistants?: Array<{
        assistantId: number;
        assistantName: string;
        calls: number;
        duration: number;
    }>;
}
interface CallStats {
    totalCalls: number;
    ongoingCalls?: number;
    completedCalls?: number;
    failedCalls?: number;
    averageDuration?: number;
    totalDuration?: number;
}
interface CallListParams {
    skip?: number;
    limit?: number;
    status?: string;
    assistantId?: number;
    customerPhone?: string;
    dateFrom?: string;
    dateTo?: string;
    minDuration?: number;
    maxDuration?: number;
}
/**
 * Response from initiating an outbound call.
 */
interface InitiateCallResponse {
    success: boolean;
    message: string;
    callSid?: string;
    callId?: number;
    status?: string;
    fromNumber?: string;
    toNumber?: string;
}
/**
 * Parameters for initiating an outbound call.
 */
interface InitiateCallParams {
    fromPhoneNumber: string;
    toPhoneNumber: string;
    welcomeMessage?: string;
    agenda?: string;
    assistantId?: number;
    variables?: Record<string, unknown>;
}
/**
 * Parameters for exporting calls.
 */
interface CallExportParams {
    format?: 'csv' | 'json';
    status?: string;
    assistantId?: number;
    dateFrom?: string;
    dateTo?: string;
}

/**
 * Calls resource for the Burki SDK.
 */

declare class CallsResource extends BaseResource {
    /**
     * Initiate an outbound call from an assistant.
     */
    initiate(params: InitiateCallParams): Promise<InitiateCallResponse>;
    /**
     * List calls with filtering options.
     */
    list(params?: CallListParams): Promise<Call[]>;
    /**
     * Get a specific call by ID.
     */
    get(callId: number): Promise<Call>;
    /**
     * Get a specific call by SID.
     */
    getBySid(callSid: string): Promise<Call>;
    /**
     * Update the metadata for a specific call.
     */
    updateMetadata(callId: number, metadata: Record<string, unknown>): Promise<Call>;
    /**
     * Get transcripts for a call.
     */
    getTranscripts(callId: number, params?: {
        speaker?: string;
        includeInterim?: boolean;
    }): Promise<CallTranscript[]>;
    /**
     * Get transcripts for a call by SID.
     */
    getTranscriptsBySid(callSid: string, params?: {
        speaker?: string;
        includeInterim?: boolean;
    }): Promise<CallTranscript[]>;
    /**
     * Export call transcripts in various formats.
     */
    exportTranscripts(callId: number, params?: {
        format?: 'txt' | 'json' | 'csv';
        speaker?: string;
    }): Promise<Blob>;
    /**
     * Get recordings for a call.
     */
    getRecordings(callId: number, params?: {
        recordingType?: string;
    }): Promise<CallRecording[]>;
    /**
     * Get recordings for a call by SID.
     */
    getRecordingsBySid(callSid: string, params?: {
        recordingType?: string;
    }): Promise<CallRecording[]>;
    /**
     * Get the streaming URL for a recording.
     */
    getRecordingUrl(callId: number, recordingId: number): string;
    /**
     * Get calculated metrics for a call.
     */
    getMetrics(callId: number): Promise<CallMetrics>;
    /**
     * Get chat messages (LLM conversation) for a call.
     */
    getMessages(callId: number, params?: {
        role?: string;
    }): Promise<ChatMessage[]>;
    /**
     * Get webhook logs for a call.
     */
    getWebhookLogs(callId: number, params?: {
        webhookType?: string;
    }): Promise<WebhookLog[]>;
    /**
     * Terminate an ongoing call.
     */
    terminate(callSid: string): Promise<Record<string, unknown>>;
    /**
     * Get call analytics for your organization.
     */
    getAnalytics(period?: string): Promise<CallAnalytics>;
    /**
     * Get basic call statistics.
     */
    getStats(): Promise<CallStats>;
    /**
     * Get the count of calls with optional filters.
     */
    getCount(params?: Partial<CallListParams>): Promise<number>;
    /**
     * Search calls by various criteria.
     */
    search(query: string, limit?: number): Promise<Call[]>;
    /**
     * Export calls data.
     */
    export(params?: CallExportParams): Promise<Blob>;
}

/**
 * Phone number models for the Burki SDK.
 */
interface PhoneNumberCapabilities {
    voice?: boolean;
    sms?: boolean;
    mms?: boolean;
    fax?: boolean;
}
interface PhoneNumber {
    id: number;
    organizationId?: number;
    assistantId?: number;
    phoneNumber: string;
    friendlyName?: string;
    provider: string;
    providerPhoneId?: string;
    capabilities?: PhoneNumberCapabilities;
    phoneMetadata?: Record<string, unknown>;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
    assistantName?: string;
}
interface AvailableNumber {
    phoneNumber: string;
    friendlyName?: string;
    region?: string;
    locality?: string;
    isoCountry?: string;
    capabilities?: PhoneNumberCapabilities;
    monthlyCost?: number;
    setupCost?: number;
    provider?: string;
}
interface PhoneNumberSearchParams {
    provider: string;
    countryCode?: string;
    areaCode?: string;
    contains?: string;
    locality?: string;
    region?: string;
    limit?: number;
}
interface PhoneNumberPurchaseParams {
    phoneNumber: string;
    provider: string;
    friendlyName?: string;
    assistantId?: number;
    countryCode?: string;
}
interface PhoneNumberAssignParams {
    assistantId?: number;
    assistantGraphId?: number;
}
interface CountryInfo {
    code: string;
    name: string;
    phoneCode?: string;
}
/**
 * Response from searching for available phone numbers.
 */
interface SearchPhoneNumbersResponse {
    success: boolean;
    numbers: AvailableNumber[];
    totalFound: number;
    provider: string;
}
/**
 * Response from purchasing a phone number.
 */
interface PurchasePhoneNumberResponse {
    success: boolean;
    phoneNumber: string;
    provider: string;
    purchaseDetails?: Record<string, unknown>;
    message: string;
}
/**
 * Response from releasing a phone number.
 */
interface ReleasePhoneNumberResponse {
    success: boolean;
    phoneNumber: string;
    provider: string;
    message: string;
}
/**
 * Response from listing available country codes.
 */
interface CountryCodesResponse {
    success: boolean;
    countryCodes: Array<Record<string, unknown>>;
    provider: string;
}
/**
 * Webhook configuration for a phone number.
 */
interface WebhookConfig {
    success: boolean;
    phoneNumber: string;
    provider: string;
    voiceWebhookUrl?: string;
    smsWebhookUrl?: string;
    configuration?: Record<string, unknown>;
}
/**
 * Parameters for updating webhooks.
 */
interface UpdateWebhooksParams {
    phoneNumber: string;
    voiceWebhookUrl?: string;
    disableSms?: boolean;
    enableSms?: boolean;
    provider?: string;
}
/**
 * Response from updating phone number webhooks.
 */
interface UpdateWebhookResponse {
    success: boolean;
    phoneNumber: string;
    provider: string;
    updatedWebhooks: Record<string, string>;
    message: string;
}
/**
 * Parameters for adding a verified caller ID.
 */
interface AddVerifiedCallerIdParams {
    phoneNumber: string;
    friendlyName?: string;
}

/**
 * Phone Numbers resource for the Burki SDK.
 */

declare class PhoneNumbersResource extends BaseResource {
    /**
     * List all phone numbers in your organization.
     */
    list(): Promise<PhoneNumber[]>;
    /**
     * Search for available phone numbers to purchase.
     */
    search(params: PhoneNumberSearchParams): Promise<SearchPhoneNumbersResponse>;
    /**
     * Purchase a phone number.
     */
    purchase(params: PhoneNumberPurchaseParams): Promise<PurchasePhoneNumberResponse>;
    /**
     * Release a phone number.
     */
    release(phoneNumber: string, provider?: string): Promise<ReleasePhoneNumberResponse>;
    /**
     * Assign a phone number to an assistant.
     */
    assign(phoneNumberId: number, params: PhoneNumberAssignParams): Promise<PhoneNumber>;
    /**
     * Unassign a phone number from its assistant.
     */
    unassign(phoneNumberId: number): Promise<PhoneNumber>;
    /**
     * Get available country codes for phone number search.
     */
    getCountries(provider?: string): Promise<CountryCodesResponse>;
    /**
     * Diagnose the connection status of a phone number (Telnyx).
     */
    diagnose(phoneNumber: string): Promise<Record<string, unknown>>;
    /**
     * Get current webhook configuration for a phone number.
     */
    getWebhooks(phoneNumber: string, provider?: string): Promise<WebhookConfig>;
    /**
     * Update voice webhook URL and/or SMS settings for a phone number.
     */
    updateWebhooks(params: UpdateWebhooksParams): Promise<Record<string, unknown>>;
    /**
     * Sync verified caller IDs from Twilio for your organization.
     */
    syncVerifiedCallerIds(): Promise<Record<string, unknown>>;
    /**
     * Add a new verified caller ID (for outbound calls with unowned numbers).
     */
    addVerifiedCallerId(params: AddVerifiedCallerIdParams): Promise<Record<string, unknown>>;
    /**
     * Sync phone numbers from telephony providers.
     */
    sync(): Promise<Record<string, unknown>>;
}

/**
 * Document models for the Burki SDK (RAG).
 */
interface Document {
    id: number;
    assistantId: number;
    organizationId: number;
    filename: string;
    originalFilename?: string;
    fileType?: string;
    fileSize?: number;
    status: string;
    processingProgress: number;
    errorMessage?: string;
    chunkCount?: number;
    totalTokens?: number;
    storageKey?: string;
    createdAt?: string;
    updatedAt?: string;
}
interface DocumentStatus {
    id: number;
    status: string;
    processingProgress: number;
    errorMessage?: string;
    chunkCount?: number;
    totalTokens?: number;
}
interface DocumentUploadParams {
    assistantId: number;
    autoProcess?: boolean;
}
interface DocumentUrlUploadParams {
    assistantId: number;
    url: string;
    filename?: string;
    autoProcess?: boolean;
}

/**
 * Documents resource for the Burki SDK (RAG).
 */

declare class DocumentsResource extends BaseResource {
    /**
     * List all documents for an assistant.
     */
    list(assistantId: number): Promise<Document[]>;
    /**
     * Upload a document to an assistant's knowledge base.
     *
     * Note: For browser usage, pass a File object. For Node.js, use uploadFromUrl instead.
     */
    upload(assistantId: number, file: File | Blob, filename: string, autoProcess?: boolean): Promise<Document>;
    /**
     * Upload a document from a URL.
     */
    uploadFromUrl(params: DocumentUrlUploadParams): Promise<Document>;
    /**
     * Get the processing status of a document.
     */
    getStatus(documentId: number): Promise<DocumentStatus>;
    /**
     * Delete a document.
     */
    delete(documentId: number): Promise<void>;
    /**
     * Reprocess a document.
     */
    reprocess(documentId: number): Promise<Document>;
}

/**
 * Tool models for the Burki SDK.
 */
interface HTTPToolConfig {
    method: string;
    url: string;
    headers?: Record<string, string>;
    bodyTemplate?: string;
    timeout?: number;
}
interface PythonToolConfig {
    code: string;
    requirements?: string[];
    timeout?: number;
}
interface LambdaToolConfig {
    functionArn: string;
    region?: string;
    invocationType?: string;
    timeout?: number;
}
interface ToolParameter {
    name: string;
    type?: string;
    description?: string;
    required?: boolean;
    default?: unknown;
    enum?: string[];
}
interface Tool {
    id: number;
    organizationId: number;
    name: string;
    description?: string;
    toolType: string;
    parameters: ToolParameter[];
    httpConfig?: HTTPToolConfig;
    pythonConfig?: PythonToolConfig;
    lambdaConfig?: LambdaToolConfig;
    isActive: boolean;
    executionCount: number;
    successCount: number;
    failureCount: number;
    avgExecutionTime?: number;
    createdAt?: string;
    updatedAt?: string;
}
interface ToolCreateParams {
    name: string;
    toolType: string;
    description?: string;
    parameters?: ToolParameter[];
    httpConfig?: HTTPToolConfig;
    pythonConfig?: PythonToolConfig;
    lambdaConfig?: LambdaToolConfig;
}
interface ToolUpdateParams {
    name?: string;
    description?: string;
    isActive?: boolean;
    parameters?: ToolParameter[];
    httpConfig?: HTTPToolConfig;
    pythonConfig?: PythonToolConfig;
    lambdaConfig?: LambdaToolConfig;
}
interface LambdaFunction {
    functionName: string;
    functionArn: string;
    description?: string;
    runtime?: string;
    handler?: string;
    memorySize?: number;
    timeout?: number;
    lastModified?: string;
}

/**
 * Tools resource for the Burki SDK.
 */

declare class ToolsResource extends BaseResource {
    /**
     * List all tools in your organization.
     */
    list(): Promise<Tool[]>;
    /**
     * Get a specific tool by ID.
     */
    get(toolId: number): Promise<Tool>;
    /**
     * Create a new tool.
     */
    create(params: ToolCreateParams): Promise<Tool>;
    /**
     * Update an existing tool.
     */
    update(toolId: number, params: ToolUpdateParams): Promise<Tool>;
    /**
     * Delete a tool.
     */
    delete(toolId: number): Promise<void>;
    /**
     * Assign a tool to an assistant.
     */
    assign(toolId: number, assistantId: number): Promise<Record<string, unknown>>;
    /**
     * Unassign a tool from an assistant.
     */
    unassign(toolId: number, assistantId: number): Promise<Record<string, unknown>>;
    /**
     * Discover AWS Lambda functions for creating Lambda tools.
     */
    discoverLambda(region?: string): Promise<LambdaFunction[]>;
}

/**
 * SMS models for the Burki SDK.
 */
interface SMSMessage {
    id: number;
    conversationId?: number;
    messageSid?: string;
    direction: string;
    sender: string;
    body: string;
    status?: string;
    mediaUrls?: string[];
    createdAt?: string;
}
interface SMSConversation {
    id: number;
    organizationId?: number;
    assistantId?: number;
    customerPhone: string;
    twilioPhone: string;
    status: string;
    messageCount?: number;
    lastMessageAt?: string;
    createdAt?: string;
    updatedAt?: string;
    assistantName?: string;
}
interface SMSConversationDetail extends SMSConversation {
    messages?: SMSMessage[];
}
interface SMSSendParams {
    fromPhoneNumber: string;
    toPhoneNumber: string;
    message: string;
    mediaUrls?: string[];
    queue?: boolean;
    idempotencyKey?: string;
}
/**
 * Response from sending an SMS.
 */
interface SMSSendResponse {
    success: boolean;
    message: string;
    messageId?: string;
    status?: string;
    queuedAt?: string;
}
/**
 * Response from getting SMS status.
 */
interface SMSStatusResponse {
    messageId: string;
    status: string;
    deliveredAt?: string;
    errorCode?: string;
    errorMessage?: string;
    provider?: string;
}
/**
 * SMS queue statistics.
 */
interface SMSQueueStats {
    pending: number;
    processing: number;
    failed: number;
    totalQueued: number;
    averageWaitTime?: number;
    oldestMessageAge?: number;
    providerStats?: Record<string, {
        pending: number;
        rateLimit: number;
    }>;
}
interface SMSConversationListParams {
    skip?: number;
    limit?: number;
    status?: string;
    assistantId?: number;
    customerPhone?: string;
    dateFrom?: string;
    dateTo?: string;
}
/**
 * Parameters for exporting a conversation.
 */
interface SMSExportParams {
    format?: 'txt' | 'csv' | 'json';
}

/**
 * SMS resource for the Burki SDK.
 */

declare class SMSResource extends BaseResource {
    /**
     * Send an SMS message through an assistant.
     *
     * The system will automatically:
     * 1. Find the assistant associated with the from_phone_number
     * 2. Use the assistant's configured telephony provider
     * 3. Queue the SMS for delivery with per-provider rate limiting (default)
     * 4. Persist the outbound message to the SMS conversation
     */
    send(params: SMSSendParams): Promise<SMSSendResponse>;
    /**
     * Get the status of a sent SMS message.
     */
    getStatus(messageId: string): Promise<SMSStatusResponse>;
    /**
     * Cancel a queued SMS message (before it's sent).
     */
    cancel(messageId: string): Promise<Record<string, unknown>>;
    /**
     * Get SMS queue statistics.
     */
    getQueueStats(): Promise<SMSQueueStats>;
    /**
     * List SMS conversations.
     */
    listConversations(params?: SMSConversationListParams): Promise<SMSConversation[]>;
    /**
     * Get a specific SMS conversation by ID.
     */
    getConversation(conversationId: string): Promise<SMSConversationDetail>;
    /**
     * Get all messages in an SMS conversation.
     */
    getMessages(conversationId: string): Promise<SMSMessage[]>;
    /**
     * Get related calls and SMS conversations that share the same unified session.
     */
    getRelatedConversations(conversationId: string): Promise<Array<Record<string, unknown>>>;
    /**
     * Archive an SMS conversation and purge associated data.
     */
    deleteConversation(conversationId: string): Promise<Record<string, unknown>>;
    /**
     * Export an SMS conversation in various formats.
     */
    exportConversation(conversationId: string, params?: SMSExportParams): Promise<Blob>;
    /**
     * @deprecated Use listConversations() instead
     */
    getConversations(params?: SMSConversationListParams): Promise<SMSConversation[]>;
}

/**
 * Campaign models for the Burki SDK.
 */
interface CampaignContact {
    id?: number;
    campaignId?: number;
    phoneNumber: string;
    name?: string;
    email?: string;
    variables?: Record<string, unknown>;
    status?: string;
    callSid?: string;
    callDuration?: number;
    callStatus?: string;
    attempts?: number;
    lastAttemptAt?: string;
    completedAt?: string;
    errorMessage?: string;
}
interface CampaignSchedule {
    scheduleType?: string;
    scheduledAt?: string;
    timezone?: string;
    daysOfWeek?: number[];
    startTime?: string;
    endTime?: string;
}
interface CampaignSettings {
    maxConcurrentCalls?: number;
    callsPerMinute?: number;
    maxAttempts?: number;
    retryDelayMinutes?: number;
    leaveVoicemail?: boolean;
    voicemailMessage?: string;
    welcomeTemplate?: string;
    agendaTemplate?: string;
}
interface Campaign {
    id: number;
    organizationId: number;
    assistantId: number;
    name: string;
    description?: string;
    campaignType: string;
    status: string;
    totalContacts: number;
    completedContacts: number;
    failedContacts: number;
    schedule: CampaignSchedule;
    settings: CampaignSettings;
    phoneNumberId?: number;
    fromPhoneNumber?: string;
    startedAt?: string;
    completedAt?: string;
    createdAt?: string;
    updatedAt?: string;
}
interface CampaignCreateParams {
    name: string;
    assistantId: number;
    contacts: CampaignContact[];
    description?: string;
    campaignType?: string;
    phoneNumberId?: number;
    schedule?: CampaignSchedule;
    settings?: CampaignSettings;
}
interface CampaignUpdateParams {
    name?: string;
    description?: string;
    schedule?: CampaignSchedule;
    settings?: CampaignSettings;
}
interface CampaignProgress {
    campaignId: number;
    status: string;
    totalContacts: number;
    completedContacts: number;
    failedContacts: number;
    pendingContacts: number;
    inProgressContacts: number;
    completionPercentage: number;
    successRate: number;
    totalCost: number;
    startedAt?: string;
    estimatedCompletion?: string;
}
interface CampaignListParams {
    status?: string;
    skip?: number;
    limit?: number;
}
interface CampaignContactListParams {
    status?: string;
    skip?: number;
    limit?: number;
}

/**
 * Campaigns resource for the Burki SDK.
 */

declare class CampaignsResource extends BaseResource {
    /**
     * List campaigns.
     */
    list(params?: CampaignListParams): Promise<Campaign[]>;
    /**
     * Get a specific campaign by ID.
     */
    get(campaignId: number): Promise<Campaign>;
    /**
     * Create a new campaign.
     */
    create(params: CampaignCreateParams): Promise<Campaign>;
    /**
     * Update a campaign.
     */
    update(campaignId: number, params: CampaignUpdateParams): Promise<Campaign>;
    /**
     * Delete a campaign.
     */
    delete(campaignId: number): Promise<void>;
    /**
     * Start a campaign.
     */
    start(campaignId: number): Promise<Campaign>;
    /**
     * Pause a running campaign.
     */
    pause(campaignId: number): Promise<Campaign>;
    /**
     * Resume a paused campaign.
     */
    resume(campaignId: number): Promise<Campaign>;
    /**
     * Cancel a campaign.
     */
    cancel(campaignId: number): Promise<Campaign>;
    /**
     * Get the progress of a campaign.
     */
    getProgress(campaignId: number): Promise<CampaignProgress>;
    /**
     * Get contacts in a campaign.
     */
    getContacts(campaignId: number, params?: CampaignContactListParams): Promise<CampaignContact[]>;
    /**
     * Add contacts to a campaign.
     */
    addContacts(campaignId: number, contacts: CampaignContact[]): Promise<Record<string, unknown>>;
}

/**
 * Realtime event models for the Burki SDK.
 */
interface TranscriptEvent {
    type: 'transcript';
    callSid: string;
    timestamp: string;
    content: string;
    speaker: string;
    isFinal: boolean;
    confidence?: number;
    segmentStart?: number;
    segmentEnd?: number;
}
interface CallStatusEvent {
    type: 'call_status';
    callSid: string;
    timestamp: string;
    status: string;
    metadata: Record<string, unknown>;
}
interface CampaignProgressEvent {
    type: 'progress';
    campaignId: number;
    timestamp: string;
    totalContacts: number;
    completedContacts: number;
    failedContacts: number;
    pendingContacts: number;
    inProgressContacts: number;
    completionPercentage: number;
    contactId?: number;
    contactPhone?: string;
    contactStatus?: string;
    contactError?: string;
}
interface CampaignContactEvent {
    type: 'contact_update';
    campaignId: number;
    timestamp: string;
    contactId: number;
    phoneNumber: string;
    status: string;
    callSid?: string;
    callDuration?: number;
    errorMessage?: string;
}
interface CampaignCompletedEvent {
    type: 'campaign_completed';
    campaignId: number;
    timestamp: string;
    totalContacts: number;
    completedContacts: number;
    failedContacts: number;
    successRate: number;
    totalDuration: number;
    totalCost: number;
}
type RealtimeEvent = TranscriptEvent | CallStatusEvent | CampaignProgressEvent | CampaignContactEvent | CampaignCompletedEvent;

/**
 * Live transcript WebSocket stream.
 */

type LiveTranscriptEvent = TranscriptEvent | CallStatusEvent;
declare class LiveTranscriptStream {
    private wsUrl;
    private token;
    private websocket;
    private running;
    constructor(wsUrl: string, token: string);
    /**
     * Connect to the WebSocket.
     */
    connect(): Promise<void>;
    /**
     * Disconnect from the WebSocket.
     */
    disconnect(): void;
    /**
     * Iterate over incoming events using async iteration.
     */
    [Symbol.asyncIterator](): AsyncIterator<LiveTranscriptEvent>;
    private parseEvent;
    /**
     * Check if the WebSocket is connected.
     */
    get connected(): boolean;
}

/**
 * Campaign progress WebSocket stream.
 */

type CampaignEvent = CampaignProgressEvent | CampaignContactEvent | CampaignCompletedEvent;
declare class CampaignProgressStream {
    private wsUrl;
    private token;
    private websocket;
    private running;
    constructor(wsUrl: string, token: string);
    /**
     * Connect to the WebSocket.
     */
    connect(): Promise<void>;
    /**
     * Disconnect from the WebSocket.
     */
    disconnect(): void;
    /**
     * Iterate over incoming events using async iteration.
     */
    [Symbol.asyncIterator](): AsyncIterator<CampaignEvent>;
    private parseEvent;
    /**
     * Send a ping message to keep the connection alive.
     */
    sendPing(): void;
    /**
     * Check if the WebSocket is connected.
     */
    get connected(): boolean;
}

/**
 * Realtime client for WebSocket connections.
 */

declare class RealtimeClient {
    private auth;
    private wsBaseUrl;
    constructor(auth: BurkiAuth, baseUrl: string);
    /**
     * Create a live transcript stream for a call.
     */
    liveTranscript(callSid: string): LiveTranscriptStream;
    /**
     * Create a campaign progress stream.
     */
    campaignProgress(campaignId: number): CampaignProgressStream;
}

/**
 * Main Burki client module.
 */

interface BurkiClientOptions {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
}
/**
 * Main client for interacting with the Burki Voice AI API.
 *
 * @example
 * ```typescript
 * import { BurkiClient } from '@burki/sdk';
 *
 * const client = new BurkiClient({ apiKey: 'your-api-key' });
 *
 * // List assistants
 * const assistants = await client.assistants.list();
 *
 * // Create an assistant
 * const assistant = await client.assistants.create({
 *   name: 'My Bot',
 *   llmSettings: { model: 'gpt-4o-mini' }
 * });
 * ```
 */
declare class BurkiClient {
    private auth;
    private httpClient;
    private baseUrl;
    private _assistants?;
    private _calls?;
    private _phoneNumbers?;
    private _documents?;
    private _tools?;
    private _sms?;
    private _campaigns?;
    private _realtime?;
    constructor(options: BurkiClientOptions);
    /**
     * Access the Assistants resource.
     */
    get assistants(): AssistantsResource;
    /**
     * Access the Calls resource.
     */
    get calls(): CallsResource;
    /**
     * Access the Phone Numbers resource.
     */
    get phoneNumbers(): PhoneNumbersResource;
    /**
     * Access the Documents resource.
     */
    get documents(): DocumentsResource;
    /**
     * Access the Tools resource.
     */
    get tools(): ToolsResource;
    /**
     * Access the SMS resource.
     */
    get sms(): SMSResource;
    /**
     * Access the Campaigns resource.
     */
    get campaigns(): CampaignsResource;
    /**
     * Access the Realtime (WebSocket) client.
     */
    get realtime(): RealtimeClient;
}

/**
 * Burki SDK Error classes.
 */
declare class BurkiError extends Error {
    statusCode?: number;
    responseBody?: unknown;
    constructor(message: string, statusCode?: number, responseBody?: unknown);
}
declare class AuthenticationError extends BurkiError {
    constructor(message?: string, responseBody?: unknown);
}
declare class NotFoundError extends BurkiError {
    constructor(message?: string, responseBody?: unknown);
}
declare class ValidationError extends BurkiError {
    constructor(message?: string, statusCode?: number, responseBody?: unknown);
}
declare class RateLimitError extends BurkiError {
    retryAfter?: number;
    constructor(message?: string, responseBody?: unknown, retryAfter?: number);
}
declare class ServerError extends BurkiError {
    constructor(message?: string, statusCode?: number, responseBody?: unknown);
}
declare class WebSocketError extends BurkiError {
    constructor(message?: string, responseBody?: unknown);
}

export { type TTSProviderConfig, type STTProviderConfig, type LiveVoiceSettings, type SpeculativeConfig, type SendSmsTool, type CallbackCollectionSettings, type BackchannelGenerationSettings, type LLMFallbackConfig, type AddVerifiedCallerIdParams, type Assistant, type AssistantCreateParams, type AssistantList, type AssistantListParams, type AssistantUpdateParams, AssistantsResource, AuthenticationError, type AvailableNumber, type BackgroundSoundSettings, BurkiAuth, BurkiClient, type BurkiClientOptions, BurkiError, type Call, type CallAnalytics, type CallExportParams, type CallListParams, type CallMetrics, type CallRecording, type CallStats, type CallStatusEvent, type CallTranscript, CallsResource, type Campaign, type CampaignCompletedEvent, type CampaignContact, type CampaignContactEvent, type CampaignContactListParams, type CampaignCreateParams, type CampaignListParams, type CampaignProgress, type CampaignProgressEvent, CampaignProgressStream, type CampaignSchedule, type CampaignSettings, type CampaignUpdateParams, CampaignsResource, type ChatMessage, type ClonedVoice, type CountryCodesResponse, type CountryInfo, type Document, type DocumentStatus, type DocumentUploadParams, type DocumentUrlUploadParams, DocumentsResource, type DtmfSolverTool, type EndCallTool, type FluxConfig, type HTTPToolConfig, type InitiateCallParams, type InitiateCallResponse, type InterruptionSettings, type Keyword, type LLMFallbackProvider, type LLMFallbackSettings, type LLMProviderConfig, type LLMSettings, type LambdaFunction, type LambdaToolConfig, LiveTranscriptStream, NotFoundError, type PaginatedCalls, type PhoneNumber, type PhoneNumberAssignParams, type PhoneNumberCapabilities, type PhoneNumberPurchaseParams, type PhoneNumberSearchParams, PhoneNumbersResource, type ProviderInfo, type PurchasePhoneNumberResponse, type PythonToolConfig, type RAGSettings, RateLimitError, RealtimeClient, type RealtimeEvent, type RecordingSettings, type ReleasePhoneNumberResponse, type SMSConversation, type SMSConversationDetail, type SMSConversationListParams, type SMSExportParams, type SMSMessage, type SMSQueueStats, SMSResource, type SMSSendParams, type SMSSendResponse, type SMSStatusResponse, type STTEndpointingSettings, type STTSettings, type SearchPhoneNumbersResponse, ServerError, type TTSSettings, type Tool, type ToolCreateParams, type ToolParameter, type ToolUpdateParams, ToolsResource, type ToolsSettings, type TranscriptEvent, type TransferCallTool, type UpdateWebhookResponse, type UpdateWebhooksParams, ValidationError, WebSocketError, type WebhookConfig, type WebhookLog };
