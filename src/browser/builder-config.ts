// V2: Quality preference options
export type QualityPreference = "ultra_realistic" | "balanced" | "fast" | "budget";
export type ComplexityLevel = "simple" | "moderate" | "complex";
export type LatencyPriority = "ultra_low" | "normal" | "not_critical";

// V3: Voice preference type
export type VoicePreference = "own_voice" | "preset";

// V4: New types for voice style, idle, interruption
export type VoiceSpeed = "fast" | "normal" | "slow";
export type VoiceEnergy = "high" | "medium" | "low";
export type IdleBehavior = "patient" | "prompt" | "efficient";
export type InterruptionSensitivity = "responsive" | "balanced" | "thorough";

export interface BuilderConfig {
  stage?: BuilderStage;
  system_prompt?: string;
  welcome_message?: string;
  name?: string;
  description?: string;
  purpose?: string;
  // V2: New requirement fields
  quality_preference?: QualityPreference;
  languages?: string[];
  conversation_complexity?: ComplexityLevel;
  latency_priority?: LatencyPriority;
  // Existing fields
  personality_traits?: string[];
  // V3: Voice preference (own voice cloning or preset)
  voice_preference?: VoicePreference;
  voice_gender?: "male" | "female" | "neutral";
  voice_tone?: string;
  // V4: Voice style
  voice_speed?: VoiceSpeed;
  voice_energy?: VoiceEnergy;
  // Call behavior
  end_call_scenarios?: string[];
  transfer_enabled?: boolean;
  transfer_scenarios?: string[];
  transfer_phone_numbers?: string[];  // V4: Actual phone numbers
  // V4: Idle and interruption
  idle_behavior?: IdleBehavior;
  interruption_sensitivity?: InterruptionSensitivity;
  // Knowledge
  knowledge_enabled?: boolean;
  knowledge_description?: string;
  // V4: Webhook
  webhook_enabled?: boolean;
  ready_to_create?: boolean;
}

// V2: Provider recommendation from backend
export interface ProviderRecommendation {
  provider: string;
  model_id?: string;
  voice_id?: string;
  reason: string;
  cost_per_minute: number;
  latency_ms: number;
}

export interface ProviderRecommendations {
  tts: ProviderRecommendation;
  stt: ProviderRecommendation;
  llm: ProviderRecommendation;
  total_cost_per_minute: number;
  summary: string;
}

export interface BuilderProgress {
  basic_info: boolean;
  requirements: boolean;  // V2: New section for quality/language/complexity
  personality: boolean;
  voice_preference: boolean;  // V3: Own voice or preset
  voice: boolean;
  voice_style: boolean;  // V4
  call_behavior: boolean;
  idle_behavior: boolean;  // V4
  interruption: boolean;  // V4
  knowledge: boolean;
  webhook: boolean;  // V4
}

export interface TranscriptMessage {
  id: string;
  speaker: "user" | "assistant";
  content: string;
  timestamp: Date;
  is_final: boolean;
}

export interface FinalAssistantConfig {
  name: string;
  description: string;
  is_active: boolean;
  llm_provider: string;
  llm_provider_config: Record<string, unknown>;
  llm_settings: {
    system_prompt: string;
    welcome_message: string;
    temperature: number;
    max_tokens: number;
  };
  tts_settings: {
    provider: string;
    voice_id: string;
    model_id: string;
    is_cloned_voice?: boolean;
    voice_clone_failed?: boolean;
  };
  stt_settings: Record<string, unknown>;
  // V4: Interruption settings
  interruption_settings?: {
    interruption_threshold: number;
    min_speaking_time: number;
    interruption_cooldown: number;
    tail_protection_ms?: number;
  };
  // V4: Recording settings
  recording_settings?: {
    enabled: boolean;
    format: string;
    record_user_audio: boolean;
    record_assistant_audio: boolean;
    record_mixed_audio: boolean;
    // Two-party consent settings
    disclosure_enabled?: boolean;
    disclosure_message?: string;
    disclosure_mode?: 'every_call' | 'first_call_only';
  };
  // V4: Idle/timeout
  idle_timeout?: number;
  max_idle_messages?: number;
  idle_message?: string;
  // V4: Webhook
  webhook_url?: string | null;
  rag_settings: {
    enabled: boolean;
    search_limit: number;
    similarity_threshold: number;
  };
  tools_settings: Record<string, unknown>;
  _provider_recommendations?: ProviderRecommendations;
}

export type BuilderStage =
  | "greeting"
  | "name"
  | "purpose"
  | "quality"      // V2
  | "language"     // V2
  | "complexity"   // V2
  | "personality"
  | "voice_preference"  // V3: Own voice or preset
  | "voice"
  | "voice_style"       // V4
  | "call_behavior"
  | "transfer_details"  // V4
  | "idle_behavior"     // V4
  | "interruption"      // V4
  | "knowledge"
  | "webhook"           // V4
  | "review"
  | "complete";

export type BuilderSnapshot = {
  builder_session_id: string;
  revision: number;
  status: "draft" | "ready" | "finalized";
  draft: BuilderConfig;
  final_config: FinalAssistantConfig;
  assistant_id?: number | null;
  voice_cloning_available: false;
  warnings?: string[];
};
