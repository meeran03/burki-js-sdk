/** Normalize only Burki's documented configuration fields, leaving application JSON intact. */
type Schema = {
  aliases: readonly string[];
  children?: Readonly<Record<string, Schema>>;
  arrays?: Readonly<Record<string, Schema>>;
};

const snake = (key: string): string => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
const fields = (aliases: string): Schema => ({ aliases: aliases.split(' ').filter(Boolean) });
const providerOptions = fields(
  'apiKey baseUrl wsUrl customConfig modelId voiceId customVoiceId languageCodes languageHints ' +
  'reasoningEffort reasoningOptions textVerbosity maxTokens topP frequencyPenalty presencePenalty stopSequences ' +
  'similarityBoost useSpeakerBoost pronunciationDictionaryLocators pronunciationDictId pronunciationDictionary ' +
  'interimResults smartFormat utteranceEndMs eagerEotThreshold eotThreshold eotTimeoutMs mipOptOut phraseList',
);
const llmProvider = fields('apiKey baseUrl customConfig');
const llmSettings = fields('maxTokens systemPrompt welcomeMessage topP frequencyPenalty presencePenalty stopSequences');
const background = fields('storageKey soundUrl');
const flux = fields('eotTimeoutMs eagerEotThreshold eotThreshold languageHints mipOptOut');
const speculative = fields('enableSpeculativeLlm speculativeStreamToTts speculativeDebounceMs speculativeMinWords speculativeSimilarityThreshold');
const transfer = fields(
  'transferNumbers customMessage configVersion destinationMode dynamicPhonePrefixes dynamicSipDomains dynamicExtensions ' +
  'transferType handoffMode maxTransferAttempts warmTransferMode agenticTransferPrompt agenticTimeoutAction ' +
  'agenticMaxTurns agenticIvrNavigation coldTransferMode outboundPhoneNumberId ringTimeoutSeconds callerIdMode ' +
  'customCallerId sipHeaders sipHeaderVariables extensionDigits threeWayTone agentConfirmation unavailableMessage ' +
  'whisperMessage threeWayMessage agentAnswerTimeoutSeconds onHoldMusic',
);
const fallbackProvider: Schema = {
  aliases: ['apiKey', 'baseUrl', 'wsUrl', 'customConfig', ...llmSettings.aliases.filter((key) => !['systemPrompt', 'welcomeMessage'].includes(key))],
  children: { config: {
    aliases: ['apiKey', 'baseUrl', 'wsUrl', 'customConfig', ...llmSettings.aliases.filter((key) => !['systemPrompt', 'welcomeMessage'].includes(key))],
  } },
};
const assistant: Schema = {
  aliases: (
    'organizationId isActive voiceMode liveSettings llmProvider llmProviderConfig llmSettings ttsSettings sttSettings ' +
    'ragSettings toolsSettings interruptionSettings recordingSettings webhookUrl webhookHeaders smsWebhookUrl ' +
    'messagingServiceSid endCallMessage transferCallMessage idleMessage maxIdleMessages idleTimeout maxCallLength ' +
    'conversationContinuityEnabled llmFallbackProviders customSettings backchannelGenerationSettings'
  ).split(' '),
  children: {
    live_settings: fields(''),
    llm_provider_config: llmProvider,
    llm_settings: llmSettings,
    tts_settings: {
      aliases: ['voiceId', 'modelId', 'similarityBoost', 'useSpeakerBoost', 'providerConfig', 'backgroundSound'],
      children: { provider_config: providerOptions, background_sound: background },
    },
    stt_settings: {
      aliases: (
        'interimResults utteranceEndMs vadTurnoff smartFormat audioDenoising fluxConfig providerConfig detectEntities ' +
        'speculativeConfig utteranceTimeoutSeconds incompleteUtteranceDetection preferFluxForEnglish englishFluxConfig'
      ).split(' '),
      children: {
        endpointing: fields('silenceThreshold minSilenceDuration'),
        flux_config: flux,
        english_flux_config: flux,
        speculative_config: speculative,
        provider_config: providerOptions,
      },
    },
    rag_settings: fields('ragInjectBeforeLlm searchLimit similarityThreshold embeddingModel chunkingStrategy chunkSize chunkOverlap autoProcess includeMetadata contextWindowTokens'),
    tools_settings: {
      aliases: ['enabledTools', 'endCall', 'transferCall', 'dtmfSolver', 'customTools', 'sendSms', 'callbackCollection'],
      children: {
        end_call: fields('customMessage'), transfer_call: transfer, dtmf_solver: fields(''),
        send_sms: fields('defaultMessage'), callback_collection: fields(''),
      },
    },
    interruption_settings: fields('interruptionThreshold minSpeakingTime interruptionCooldown interruptionMode minConfidence minSttConfidence tentativeWindowMs confirmationWindowMs tentativeConfirmWords backchannelFilter tailProtectionMs'),
    recording_settings: fields('sampleRate recordUserAudio recordAssistantAudio recordMixedAudio recordUserOnlyTrack autoSave recordingsDir createDatabaseRecords disclosureEnabled disclosureMessage disclosureMode'),
    llm_fallback_providers: { aliases: [], arrays: { fallbacks: fallbackProvider } },
    backchannel_generation_settings: fields(''),
  },
};

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalize(value: unknown, schema: Schema): unknown {
  if (!isObject(value)) return value;
  const aliases = new Map(schema.aliases.map((key) => [key, snake(key)]));
  const entries = new Map<string, unknown>();
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined) continue;
    const canonical = aliases.get(key) ?? key;
    // An explicit canonical snake_case property wins, independent of insertion order.
    if (canonical !== key && Object.hasOwn(value, canonical) && value[canonical] !== undefined) continue;
    const child = schema.children?.[canonical];
    const arrayChild = schema.arrays?.[canonical];
    entries.set(canonical, child ? normalize(item, child)
      : arrayChild && Array.isArray(item) ? item.map((entry) => normalize(entry, arrayChild)) : item);
  }
  return Object.fromEntries(entries);
}

/**
 * CamelCase and snake_case inputs are accepted. When both are supplied, snake_case wins.
 * Undefined fields are omitted; false, zero, empty strings and explicit null are preserved.
 * Custom settings, tool JSON schemas, headers and provider custom_config are opaque.
 */
export function serializeAssistantInput(value: Record<string, unknown>): Record<string, unknown> {
  const result = normalize(value, assistant);
  if (!isObject(result)) throw new TypeError('Assistant configuration must be an object');
  // Earlier README examples put the model in llmSettings. Migrate that known alias
  // instead of letting the API ignore it and silently choose a default model.
  const settings = result.llm_settings;
  if (isObject(settings) && Object.hasOwn(settings, 'model')) {
    const model = settings.model;
    const provider = result.llm_provider_config;
    if (model !== undefined && provider === undefined) result.llm_provider_config = { model };
    else if (model !== undefined && isObject(provider) && provider.model === undefined) {
      result.llm_provider_config = { ...provider, model };
    }
    const { model: _legacyModel, ...rest } = settings;
    result.llm_settings = rest;
  }
  return result;
}

export function serializeAssistantParams(
  value: Record<string, unknown>, options: { create?: boolean } = {},
): Record<string, unknown> {
  const result = serializeAssistantInput(value);
  if (options.create && result.llm_provider === undefined) result.llm_provider = 'openai';
  return result;
}
