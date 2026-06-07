// ============================================
// NEXT-GEN HYPERLOCAL ROUTING ENGINE
// Production-Ready Geospatial Routing with AI-Agent Transparency
// ============================================

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ============================================
// TYPES & INTERFACES
// ============================================

export interface GeoCoordinate {
  latitude: number
  longitude: number
}

export interface PincodeCentroid {
  pincode: string
  latitude: number
  longitude: number
  city: string | null
  state: string | null
}

export interface DistributorProfile {
  id: string
  user_id: string
  role: string
  business_name: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  latitude: number | null
  longitude: number | null
  is_active: boolean
  verified_at: string | null
}

export interface DistributorServiceArea {
  id: string
  distributor_id: string
  pincode: string
  city: string | null
  state: string | null
  delivery_sla_hours: number
  priority: number
  is_active: boolean
  coverage_radius_km: number | null
}

export interface DistributorSLARecord {
  distributor_id: string
  sla_met_count: number
  sla_missed_count: number
  avg_delivery_time_hours: number | null
  on_time_delivery_rate: number
  last_updated: string
}

export interface SupplyPressureEntry {
  distributor_id: string
  overall_pressure_score: number
  stock_level_pressure: number | null
  lead_time_pressure: number | null
  reorder_frequency_pressure: number | null
  expiry_pressure: number | null
  demand_spike_pressure: number | null
  cached_at: string
}

export interface DistributorScoringFactors {
  distributorId: string
  distributorName: string
  haversineDistanceKm: number
  haversineScore: number
  supplyPressureScore: number
  slaScore: number
  priorityScore: number
  combinedScore: number
  weights: ScoringWeights
  factors: FactorBreakdown
}

export interface ScoringWeights {
  haversine: number
  supplyPressure: number
  sla: number
  priority: number
}

export interface FactorBreakdown {
  distanceContribution: number
  supplyPressureContribution: number
  slaContribution: number
  priorityContribution: number
  rawHaversineKm: number
  rawSupplyPressure: number
  rawSlaRate: number
  rawPriorityRank: number
}

export interface RoutingDecision {
  decisionId: string
  timestamp: string
  input: RoutingInput
  decision: Decision
  candidates: CandidateRanking[]
  reasoning: ReasoningBlock
  debug: DebugOutput | null
  performanceMetrics: PerformanceMetrics
}

export interface RoutingInput {
  customerPincode: string
  customerLatitude: number | null
  customerLongitude: number | null
  productIds: string[]
  orderValue?: number
}

export interface Decision {
  distributorId: string
  distributorName: string
  assignmentMode: AssignmentMode
  confidence: number
  estimatedDeliveryHours: number | null
}

export type AssignmentMode =
  | 'GPS_ROUTED'
  | 'PINCODE_CENTROID_ROUTED'
  | 'FALLBACK_ROUTED'
  | 'SLA_BASED_ROUTED'
  | 'PRIORITY_BASED_ROUTED'
  | 'PARTIAL_COVERAGE'
  | 'NO_COVERAGE'
  | 'GPS_DENIED'

export interface CandidateRanking {
  rank: number
  distributorId: string
  distributorName: string
  combinedScore: number
  haversineDistanceKm: number
  supplyPressureScore: number
  slaScore: number
  priorityRank: number
  assignmentMode: AssignmentMode
  isSelected: boolean
}

export interface ReasoningBlock {
  primaryReason: string
  secondaryReasons: string[]
  warnings: string[]
  constraintsApplied: string[]
  alternativeConsidered: string | null
  confidenceFactors: string[]
}

export interface DebugOutput {
  weights: ScoringWeights
  totalCandidatesEvaluated: number
  candidatesFilteredOut: number
  pincodeCentroidUsed: PincodeCentroid | null
  gpsCoordinatesUsed: boolean
  fallbackTriggered: boolean
  fallbackReason: string | null
  supplyPressureThresholdBreach: string[]
  slaDataFreshnessHours: number | null
  computationTimeMs: number
  scoringDetails: {
    distributorId: string
    rawScores: Record<string, number>
    weightedScores: Record<string, number>
    normalizationRange: { min: number; max: number }
  }[]
}

export interface PerformanceMetrics {
  totalCandidatesFound: number
  selectedCandidateRank: number
  averageCandidateScore: number
  scoreSpread: number
  routingMode: AssignmentMode
}

export interface RoutingEngineConfig {
  weights?: Partial<ScoringWeights>
  maxCandidates?: number
  gpsDenialFallbackKm?: number
  supplyPressureHighThreshold?: number
  supplyPressureFallbackKm?: number
  slaWeightMinimum?: number
  verbose?: boolean
  supabaseUrl?: string
  supabaseServiceKey?: string
}

export interface RoutingEngineResult {
  success: boolean
  routingDecision: RoutingDecision | null
  error: string | null
  errorId: string
}

// ============================================
// CONSTANTS
// ============================================

const EARTH_RADIUS_KM = 6371.0
const DEFAULT_WEIGHTS: ScoringWeights = {
  haversine: 0.35,
  supplyPressure: 0.30,
  sla: 0.20,
  priority: 0.15
}

const MAX_DISTANCE_KM_PRIMARY = 5
const MAX_DISTANCE_KM_FALLBACK = 10
const MAX_DISTANCE_KM_ABSOLUTE = 50
const SUPPLY_PRESSURE_HIGH_THRESHOLD = 0.8
const MIN_SLA_DATA_FRESHNESS_HOURS = 24
const MAX_CANDIDATES = 20

// ============================================
// GEOSPATIAL MATH — NATIVE IMPLEMENTATIONS
// ============================================

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180.0)
}

function toDegrees(radians: number): number {
  return radians * (180.0 / Math.PI)
}

export function haversineDistanceKm(
  coord1: GeoCoordinate,
  coord2: GeoCoordinate
): number {
  const lat1Rad = toRadians(coord1.latitude)
  const lat2Rad = toRadians(coord2.latitude)
  const deltaLatRad = toRadians(coord2.latitude - coord1.latitude)
  const deltaLonRad = toRadians(coord2.longitude - coord1.longitude)

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLonRad / 2) *
      Math.sin(deltaLonRad / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  const distance = EARTH_RADIUS_KM * c
  return Math.round(distance * 100) / 100
}

function normalHaversine(
  distanceKm: number,
  maxDistanceKm: number
): number {
  if (maxDistanceKm <= 0) return 0
  const normalized = 1 - Math.min(distanceKm / maxDistanceKm, 1)
  return Math.max(0, Math.min(1, normalized))
}

function normalSupplyPressure(
  pressureScore: number,
  maxScore: number = 100
): number {
  if (maxScore <= 0) return 0
  const normalized = 1 - Math.min(pressureScore / maxScore, 1)
  return Math.max(0, Math.min(1, normalized))
}

function normalSLA(
  onTimeDeliveryRate: number,
  avgDeliveryTimeHours: number | null,
  slaTargetHours: number = 8
): number {
  const rateScore = Math.max(0, Math.min(1, onTimeDeliveryRate))
  let timeScore = 1.0
  if (avgDeliveryTimeHours !== null && avgDeliveryTimeHours > 0) {
    timeScore = Math.max(0, Math.min(1, slaTargetHours / avgDeliveryTimeHours))
  }
  return (rateScore * 0.6) + (timeScore * 0.4)
}

function normalPriority(rank: number): number {
  if (rank <= 0) return 0
  return Math.max(0, Math.min(1, 1 / Math.log2(rank + 1)))
}

function combinedScore(
  haversineScore: number,
  supplyPressureScore: number,
  slaScore: number,
  priorityScore: number,
  weights: ScoringWeights
): number {
  const totalWeight =
    weights.haversine +
    weights.supplyPressure +
    weights.sla +
    weights.priority

  if (totalWeight <= 0) return 0

  const score =
    (haversineScore * weights.haversine) +
    (supplyPressureScore * weights.supplyPressure) +
    (slaScore * weights.sla) +
    (priorityScore * weights.priority)

  return Math.round(score * 10000) / 10000
}

function generateDecisionId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function generateErrorId(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// ============================================
// SUPABASE CLIENT FACTORY
// ============================================

function createSupabaseAdminClient(
  url?: string,
  key?: string
): SupabaseClient | null {
  const supabaseUrl = url || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    key ||
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return null
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

// ============================================
// PINCODE CENTROID LOOKUP
// ============================================

async function getPincodeCentroid(
  supabase: SupabaseClient,
  pincode: string
): Promise<PincodeCentroid | null> {
  const { data, error } = await supabase
    .from('pincode_centroids')
    .select('pincode, latitude, longitude, city, state')
    .eq('pincode', pincode)
    .single()

  if (error || !data) {
    return null
  }

  return {
    pincode: data.pincode,
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    city: data.city || null,
    state: data.state || null
  }
}

async function createPincodeCentroidFromServiceArea(
  supabase: SupabaseClient,
  pincode: string
): Promise<PincodeCentroid | null> {
  const { data, error } = await supabase
    .from('distributor_service_areas')
    .select('pincode, city, state')
    .eq('pincode', pincode)
    .eq('is_active', true)
    .limit(1)

  if (error || !data || data.length === 0) {
    return null
  }

  return {
    pincode,
    latitude: 0,
    longitude: 0,
    city: data[0].city || null,
    state: data[0].state || null
  }
}

// ============================================
// DISTRIBUTOR DATA FETCHING
// ============================================

async function fetchActiveDistributorsForPincode(
  supabase: SupabaseClient,
  pincode: string,
  productIds: string[],
  maxCandidates: number
): Promise<DistributorProfile[]> {
  const { data: serviceAreas, error: saError } = await supabase
    .from('distributor_service_areas')
    .select('distributor_id, priority, delivery_sla_hours, coverage_radius_km')
    .eq('pincode', pincode)
    .eq('is_active', true)
    .order('priority', { ascending: true })
    .limit(maxCandidates)

  if (saError || !serviceAreas || serviceAreas.length === 0) {
    return []
  }

  const distributorIds = serviceAreas.map(sa => sa.distributor_id)

  const { data: distributors, error: distError } = await supabase
    .from('profiles')
    .select(
      'id, user_id, role, business_name, address, city, state, pincode, latitude, longitude, is_active, verified_at'
    )
    .in('id', distributorIds)
    .eq('role', 'DISTRIBUTOR')
    .eq('is_active', true)
    .limit(maxCandidates)

  if (distError || !distributors) {
    return []
  }

  return distributors.map(d => ({
    ...d,
    latitude: d.latitude !== null ? Number(d.latitude) : null,
    longitude: d.longitude !== null ? Number(d.longitude) : null
  }))
}

async function fetchSLARecords(
  supabase: SupabaseClient,
  distributorIds: string[]
): Promise<Map<string, DistributorSLARecord>> {
  const slaMap = new Map<string, DistributorSLARecord>()

  if (distributorIds.length === 0) return slaMap

  const cutoff = new Date()
  cutoff.setHours(cutoff.getHours() - MIN_SLA_DATA_FRESHNESS_HOURS * 2)
  const cutoffStr = cutoff.toISOString()

  const { data, error } = await supabase
    .from('distributor_sla_metrics')
    .select(
      'distributor_id, sla_met_count, sla_missed_count, avg_delivery_time_hours, on_time_delivery_rate, last_updated'
    )
    .in('distributor_id', distributorIds)
    .gte('last_updated', cutoffStr)

  if (error || !data) {
    return slaMap
  }

  for (const record of data) {
    slaMap.set(record.distributor_id, {
      distributor_id: record.distributor_id,
      sla_met_count: Number(record.sla_met_count) || 0,
      sla_missed_count: Number(record.sla_missed_count) || 0,
      avg_delivery_time_hours:
        record.avg_delivery_time_hours !== null
          ? Number(record.avg_delivery_time_hours)
          : null,
      on_time_delivery_rate: Number(record.on_time_delivery_rate) || 0.5,
      last_updated: record.last_updated
    })
  }

  return slaMap
}

async function fetchSupplyPressureForDistributors(
  supabase: SupabaseClient,
  distributorIds: string[],
  productIds: string[]
): Promise<Map<string, SupplyPressureEntry>> {
  const pressureMap = new Map<string, SupplyPressureEntry>()

  if (distributorIds.length === 0) return pressureMap

  const cutoff = new Date()
  cutoff.setHours(cutoff.getHours() - 2)
  const cutoffStr = cutoff.toISOString()

  let query = supabase
    .from('distributor_supply_pressure')
    .select(
      'distributor_id, overall_pressure_score, stock_level_pressure, lead_time_pressure, reorder_frequency_pressure, expiry_pressure, demand_spike_pressure, cached_at'
    )
    .in('distributor_id', distributorIds)
    .gte('cached_at', cutoffStr)

  if (productIds.length > 0) {
    query = query.in('product_id', productIds.slice(0, 10))
  }

  const { data, error } = await query

  if (error || !data) {
    const fallback = await supabase
      .from('distributor_supply_pressure')
      .select(
        'distributor_id, overall_pressure_score, stock_level_pressure, lead_time_pressure, reorder_frequency_pressure, expiry_pressure, demand_spike_pressure, cached_at'
      )
      .in('distributor_id', distributorIds)
      .is('product_id', null)
      .gte('cached_at', cutoffStr)
      .limit(MAX_CANDIDATES)

    if (fallback.error || !fallback.data) {
      return pressureMap
    }

    for (const record of fallback.data) {
      if (!pressureMap.has(record.distributor_id)) {
        pressureMap.set(record.distributor_id, {
          distributor_id: record.distributor_id,
          overall_pressure_score: Number(record.overall_pressure_score) || 50,
          stock_level_pressure:
            record.stock_level_pressure !== null
              ? Number(record.stock_level_pressure)
              : null,
          lead_time_pressure:
            record.lead_time_pressure !== null
              ? Number(record.lead_time_pressure)
              : null,
          reorder_frequency_pressure:
            record.reorder_frequency_pressure !== null
              ? Number(record.reorder_frequency_pressure)
              : null,
          expiry_pressure:
            record.expiry_pressure !== null
              ? Number(record.expiry_pressure)
              : null,
          demand_spike_pressure:
            record.demand_spike_pressure !== null
              ? Number(record.demand_spike_pressure)
              : null,
          cached_at: record.cached_at
        })
      }
    }
    return pressureMap
  }

  const aggregatedPressure = new Map<string, { sum: number; count: number }>()

  for (const record of data) {
    const existing = aggregatedPressure.get(record.distributor_id) || {
      sum: 0,
      count: 0
    }
    existing.sum += Number(record.overall_pressure_score) || 50
    existing.count += 1
    aggregatedPressure.set(record.distributor_id, existing)
  }

  for (const [distributorId, agg] of aggregatedPressure) {
    const avgPressure = agg.sum / agg.count
    const latestRecord = data.find(
      r => r.distributor_id === distributorId
    )
    pressureMap.set(distributorId, {
      distributor_id: distributorId,
      overall_pressure_score: Math.round(avgPressure),
      stock_level_pressure:
        latestRecord && latestRecord.stock_level_pressure !== null
          ? Number(latestRecord.stock_level_pressure)
          : null,
      lead_time_pressure:
        latestRecord && latestRecord.lead_time_pressure !== null
          ? Number(latestRecord.lead_time_pressure)
          : null,
      reorder_frequency_pressure:
        latestRecord && latestRecord.reorder_frequency_pressure !== null
          ? Number(latestRecord.reorder_frequency_pressure)
          : null,
      expiry_pressure:
        latestRecord && latestRecord.expiry_pressure !== null
          ? Number(latestRecord.expiry_pressure)
          : null,
      demand_spike_pressure:
        latestRecord && latestRecord.demand_spike_pressure !== null
          ? Number(latestRecord.demand_spike_pressure)
          : null,
      cached_at: latestRecord?.cached_at || new Date().toISOString()
    })
  }

  return pressureMap
}

// ============================================
// SCORING ENGINE
// ============================================

function scoreAllDistributors(
  distributors: DistributorProfile[],
  slaMap: Map<string, DistributorSLARecord>,
  pressureMap: Map<string, SupplyPressureEntry>,
  serviceAreaMap: Map<string, { priority: number; delivery_sla_hours: number }>,
  customerCoord: GeoCoordinate | null,
  weights: ScoringWeights,
  maxDistanceKm: number,
  supplyPressureThreshold: number,
  verbose: boolean
): {
  scored: DistributorScoringFactors[]
  filteredOut: string[]
  fallbackTriggered: boolean
  fallbackReason: string
  supplyPressureThresholdBreaches: string[]
  debugScoring: DebugOutput['scoringDetails']
} {
  const scored: DistributorScoringFactors[] = []
  const filteredOut: string[] = []
  const supplyPressureThresholdBreaches: string[] = []
  const debugScoring: DebugOutput['scoringDetails'] = []

  let minScore = Infinity
  let maxScore = -Infinity
  let fallbackTriggered = false
  let fallbackReason = ''

  for (const distributor of distributors) {
    const hasGPS =
      distributor.latitude !== null &&
      distributor.longitude !== null &&
      distributor.latitude !== 0 &&
      distributor.longitude !== 0

    let distanceKm: number
    let actualCustomerCoord: GeoCoordinate | null = customerCoord

    if (!hasGPS || actualCustomerCoord === null) {
      if (customerCoord === null) {
        filteredOut.push(distributor.id)
        fallbackReason = 'No GPS coordinates provided and no customer coordinates'
        fallbackTriggered = true
        continue
      }
      distanceKm = maxDistanceKm
      actualCustomerCoord = customerCoord
    } else {
      distanceKm = haversineDistanceKm(actualCustomerCoord, {
        latitude: distributor.latitude,
        longitude: distributor.longitude
      })
    }

    if (distanceKm > MAX_DISTANCE_KM_ABSOLUTE) {
      filteredOut.push(distributor.id)
      continue
    }

    const serviceArea = serviceAreaMap.get(distributor.id)
    const rawPriorityRank = serviceArea?.priority ?? 999
    const rawSlaRate = slaMap.get(distributor.id)?.on_time_delivery_rate ?? 0.5
    const avgDeliveryHours =
      slaMap.get(distributor.id)?.avg_delivery_time_hours ?? null
    const rawSupplyPressure =
      pressureMap.get(distributor.id)?.overall_pressure_score ?? 50

    const normalizedSupplyPressure = rawSupplyPressure / 100

    if (normalizedSupplyPressure > supplyPressureThreshold) {
      supplyPressureThresholdBreaches.push(distributor.id)
    }

    const haversineScore = normalHaversine(distanceKm, maxDistanceKm)
    const supplyPressureScore = normalSupplyPressure(rawSupplyPressure, 100)
    const slaScore = normalSLA(rawSlaRate, avgDeliveryHours)
    const priorityScore = normalPriority(rawPriorityRank)

    const score = combinedScore(
      haversineScore,
      supplyPressureScore,
      slaScore,
      priorityScore,
      weights
    )

    minScore = Math.min(minScore, score)
    maxScore = Math.max(maxScore, score)

    const factor: DistributorScoringFactors = {
      distributorId: distributor.id,
      distributorName: distributor.business_name || distributor.user_id || 'Unknown',
      haversineDistanceKm: distanceKm,
      haversineScore,
      supplyPressureScore,
      slaScore,
      priorityScore,
      combinedScore: score,
      weights,
      factors: {
        distanceContribution: Math.round(haversineScore * weights.haversine * 10000) / 10000,
        supplyPressureContribution:
          Math.round(supplyPressureScore * weights.supplyPressure * 10000) / 10000,
        slaContribution: Math.round(slaScore * weights.sla * 10000) / 10000,
        priorityContribution:
          Math.round(priorityScore * weights.priority * 10000) / 10000,
        rawHaversineKm: distanceKm,
        rawSupplyPressure,
        rawSlaRate,
        rawPriorityRank
      }
    }

    scored.push(factor)

    if (verbose) {
      debugScoring.push({
        distributorId: distributor.id,
        rawScores: {
          haversineScore: Math.round(haversineScore * 10000) / 10000,
          supplyPressureScore: Math.round(supplyPressureScore * 10000) / 10000,
          slaScore: Math.round(slaScore * 10000) / 10000,
          priorityScore: Math.round(priorityScore * 10000) / 10000
        },
        weightedScores: {
          haversine: Math.round(haversineScore * weights.haversine * 10000) / 10000,
          supplyPressure: Math.round(supplyPressureScore * weights.supplyPressure * 10000) / 10000,
          sla: Math.round(slaScore * weights.sla * 10000) / 10000,
          priority: Math.round(priorityScore * weights.priority * 10000) / 10000
        },
        normalizationRange: { min: 0, max: 1 }
      })
    }
  }

  scored.sort((a, b) => b.combinedScore - a.combinedScore)

  return {
    scored,
    filteredOut,
    fallbackTriggered,
    fallbackReason,
    supplyPressureThresholdBreaches,
    debugScoring
  }
}

// ============================================
// ASSIGNMENT MODE DETERMINATION
// ============================================

function determineAssignmentMode(
  customerLat: number | null,
  customerLon: number | null,
  centroidUsed: PincodeCentroid | null,
  fallbackTriggered: boolean,
  bestDistanceKm: number,
  bestSupplyPressure: number,
  bestSlaRate: number,
  priorityRank: number
): AssignmentMode {
  if (!customerLat || !customerLon) {
    return centroidUsed ? 'PINCODE_CENTROID_ROUTED' : 'GPS_DENIED'
  }

  if (fallbackTriggered) {
    return 'FALLBACK_ROUTED'
  }

  if (bestSupplyPressure > SUPPLY_PRESSURE_HIGH_THRESHOLD) {
    return 'SLA_BASED_ROUTED'
  }

  if (priorityRank <= 2 && bestDistanceKm <= MAX_DISTANCE_KM_PRIMARY) {
    return 'GPS_ROUTED'
  }

  if (bestDistanceKm <= MAX_DISTANCE_KM_PRIMARY) {
    return 'GPS_ROUTED'
  }

  if (bestDistanceKm <= MAX_DISTANCE_KM_FALLBACK) {
    return 'FALLBACK_ROUTED'
  }

  if (priorityRank <= 3) {
    return 'PRIORITY_BASED_ROUTED'
  }

  return 'PARTIAL_COVERAGE'
}

// ============================================
// REASONING GENERATION
// ============================================

function generateReasoning(
  candidates: DistributorScoringFactors[],
  selected: DistributorScoringFactors,
  mode: AssignmentMode,
  supplyPressureBreaches: string[],
  supplyPressureThreshold: number,
  fallbackTriggered: boolean,
  fallbackReason: string,
  centroidUsed: PincodeCentroid | null,
  gpsAvailable: boolean
): ReasoningBlock {
  const primaryReasons: string[] = []
  const secondaryReasons: string[] = []
  const warnings: string[] = []
  const constraintsApplied: string[] = []
  const confidenceFactors: string[] = []

  const selectedPressureNormalized = selected.factors.rawSupplyPressure / 100

  if (mode === 'GPS_ROUTED') {
    primaryReasons.push(
      `Selected distributor ${selected.distributorName} is ${selected.haversineDistanceKm}km away (within ${MAX_DISTANCE_KM_PRIMARY}km primary zone)`
    )
    confidenceFactors.push('GPS-based distance calculation')
  } else if (mode === 'PINCODE_CENTROID_ROUTED') {
    primaryReasons.push(
      `No customer GPS coordinates provided. Pincode ${centroidUsed?.pincode} centroid used for distance estimation`
    )
    confidenceFactors.push('Pincode centroid fallback')
    warnings.push('Pincode centroid may have up to 2-5km variance from actual address')
  } else if (mode === 'FALLBACK_ROUTED') {
    primaryReasons.push(
      `Primary distributor(s) unavailable. Best available distributor ${selected.distributorName} is ${selected.haversineDistanceKm}km away`
    )
    if (fallbackTriggered) {
      primaryReasons.push(`Fallback reason: ${fallbackReason}`)
    }
    confidenceFactors.push('Fallback distance-based selection')
  } else if (mode === 'SLA_BASED_ROUTED') {
    primaryReasons.push(
      `Distributor ${selected.distributorName} selected for SLA performance despite ${selected.haversineDistanceKm}km distance`
    )
    confidenceFactors.push('SLA-weighted scoring')
  } else if (mode === 'PRIORITY_BASED_ROUTED') {
    primaryReasons.push(
      `Distributor ${selected.distributorName} selected due to high priority rank (#${selected.factors.rawPriorityRank})`
    )
    confidenceFactors.push('Priority-based assignment')
  } else if (mode === 'PARTIAL_COVERAGE') {
    primaryReasons.push(
      `Distributor ${selected.distributorName} is the only available option at ${selected.haversineDistanceKm}km`
    )
    warnings.push(`Distance exceeds standard coverage (${selected.haversineDistanceKm}km > ${MAX_DISTANCE_KM_FALLBACK}km)`)
    confidenceFactors.push('Last-resort partial coverage')
  } else {
    primaryReasons.push(
      `Distributor ${selected.distributorName} has the highest composite score: ${selected.combinedScore}`
    )
    confidenceFactors.push('Composite scoring algorithm')
  }

  if (selectedPressureNormalized > supplyPressureThreshold) {
    secondaryReasons.push(
      `Supply pressure ${(selectedPressureNormalized * 100).toFixed(0)}% exceeds threshold ${(supplyPressureThreshold * 100).toFixed(0)}% — reduced weight applied`
    )
    warnings.push(
      `Distributor ${selected.distributorName} has HIGH supply pressure — monitor fulfillment capacity`
    )
  }

  if (selected.factors.rawSlaRate >= 0.9) {
    secondaryReasons.push(
      `Excellent SLA performance: ${(selected.factors.rawSlaRate * 100).toFixed(0)}% on-time delivery`
    )
    confidenceFactors.push('High SLA reliability')
  } else if (selected.factors.rawSlaRate < 0.7) {
    warnings.push(
      `SLA performance below target: ${(selected.factors.rawSlaRate * 100).toFixed(0)}% on-time delivery rate`
    )
  }

  if (selected.haversineDistanceKm <= MAX_DISTANCE_KM_PRIMARY) {
    constraintsApplied.push(
      `Distance constraint: ${selected.haversineDistanceKm}km ≤ ${MAX_DISTANCE_KM_PRIMARY}km primary zone`
    )
  } else if (selected.haversineDistanceKm <= MAX_DISTANCE_KM_FALLBACK) {
    constraintsApplied.push(
      `Distance constraint: ${selected.haversineDistanceKm}km ≤ ${MAX_DISTANCE_KM_FALLBACK}km fallback zone`
    )
  }

  if (supplyPressureBreaches.length > 0) {
    constraintsApplied.push(
      `Supply pressure threshold applied: ${supplyPressureBreaches.length} distributor(s) filtered due to pressure > ${(supplyPressureThreshold * 100).toFixed(0)}%`
    )
  }

  const alternative =
    candidates.length > 1 && candidates[1]
      ? `Alternative distributor ${candidates[1].distributorName} (score: ${candidates[1].combinedScore}) at ${candidates[1].haversineDistanceKm}km`
      : null

  return {
    primaryReason: primaryReasons[0] || 'Distributor selected by composite scoring',
    secondaryReasons,
    warnings,
    constraintsApplied,
    alternativeConsidered: alternative,
    confidenceFactors
  }
}

// ============================================
// MAIN ROUTING ENGINE
// ============================================

export async function findBestDistributorForPincode(
  input:
    | { pincode: string; customerLat?: number; customerLon?: number; productIds?: string[] }
    | SupabaseClient,
  customerLat?: number,
  customerLon?: number,
  productIds?: string[],
  config?: RoutingEngineConfig
): Promise<RoutingEngineResult> {
  const errorId = generateErrorId()
  const startTime = performance.now()

  let supabase: SupabaseClient
  let pincode: string
  let actualCustomerLat: number | null = null
  let actualCustomerLon: number | null = null
  let actualProductIds: string[] = []

  if (typeof input === 'object' && 'pincode' in input) {
    pincode = input.pincode
    actualCustomerLat = input.customerLat ?? null
    actualCustomerLon = input.customerLon ?? null
    actualProductIds = input.productIds ?? []
    supabase = createSupabaseAdminClient()!
  } else {
    return {
      success: false,
      routingDecision: null,
      error: 'Invalid input parameters',
      errorId
    }
  }

  if (!supabase) {
    return {
      success: false,
      routingDecision: null,
      error: 'Supabase admin client not initialized. Check environment variables.',
      errorId
    }
  }

  const verbose = config?.verbose ?? false
  const weights: ScoringWeights = {
    haversine: config?.weights?.haversine ?? DEFAULT_WEIGHTS.haversine,
    supplyPressure:
      config?.weights?.supplyPressure ?? DEFAULT_WEIGHTS.supplyPressure,
    sla: config?.weights?.sla ?? DEFAULT_WEIGHTS.sla,
    priority: config?.weights?.priority ?? DEFAULT_WEIGHTS.priority
  }
  const maxCandidates = config?.maxCandidates ?? MAX_CANDIDATES
  const gpsDenialFallbackKm =
    config?.gpsDenialFallbackKm ?? MAX_DISTANCE_KM_PRIMARY
  const supplyPressureThreshold =
    config?.supplyPressureHighThreshold ?? SUPPLY_PRESSURE_HIGH_THRESHOLD
  const supplyPressureFallbackKm =
    config?.supplyPressureFallbackKm ?? MAX_DISTANCE_KM_FALLBACK

  if (verbose) {
    console.log(JSON.stringify({
      engine: 'NEXT_GEN_ROUTING',
      errorId,
      input: { pincode, actualCustomerLat, actualCustomerLon, productIds: actualProductIds },
      config: { weights, maxCandidates, supplyPressureThreshold, verbose }
    }))
  }

  let customerCoord: GeoCoordinate | null =
    actualCustomerLat !== null &&
    actualCustomerLon !== null
      ? { latitude: actualCustomerLat, longitude: actualCustomerLon }
      : null

  let centroidUsed: PincodeCentroid | null = null
  let gpsFallbackTriggered = false

  if (customerCoord === null) {
    centroidUsed = await getPincodeCentroid(supabase, pincode)
    if (!centroidUsed) {
      centroidUsed = await createPincodeCentroidFromServiceArea(supabase, pincode)
    }
    if (centroidUsed && centroidUsed.latitude !== 0) {
      customerCoord = {
        latitude: centroidUsed.latitude,
        longitude: centroidUsed.longitude
      }
      gpsFallbackTriggered = true
    }
  }

  const distributors = await fetchActiveDistributorsForPincode(
    supabase,
    pincode,
    actualProductIds,
    maxCandidates
  )

  if (distributors.length === 0) {
    return {
      success: false,
      routingDecision: null,
      error: `No active distributors found for pincode ${pincode}`,
      errorId
    }
  }

  const distributorIds = distributors.map(d => d.id)
  const [slaMap, pressureMap] = await Promise.all([
    fetchSLARecords(supabase, distributorIds),
    fetchSupplyPressureForDistributors(supabase, distributorIds, actualProductIds)
  ])

  const serviceAreaMap = new Map<
    string,
    { priority: number; delivery_sla_hours: number }
  >()
  for (const dist of distributors) {
    const { data: saData } = await supabase
      .from('distributor_service_areas')
      .select('priority, delivery_sla_hours')
      .eq('distributor_id', dist.id)
      .eq('pincode', pincode)
      .eq('is_active', true)
      .single()

    if (saData) {
      serviceAreaMap.set(dist.id, {
        priority: saData.priority,
        delivery_sla_hours: saData.delivery_sla_hours
      })
    }
  }

  const primaryResult = scoreAllDistributors(
    distributors,
    slaMap,
    pressureMap,
    serviceAreaMap,
    customerCoord,
    weights,
    gpsDenialFallbackKm,
    supplyPressureThreshold,
    verbose
  )

  let finalCandidates = primaryResult.scored
  let supplyPressureFiltered = false

  if (primaryResult.supplyPressureThresholdBreaches.length > 0) {
    const filteredCandidates = primaryResult.scored.filter(
      c => c.factors.rawSupplyPressure / 100 <= supplyPressureThreshold
    )

    if (filteredCandidates.length > 0) {
      finalCandidates = filteredCandidates
      supplyPressureFiltered = true
    }
  }

  let selected: DistributorScoringFactors | null =
    finalCandidates.length > 0 ? finalCandidates[0] : null

  if (!selected && primaryResult.scored.length > 0) {
    selected = primaryResult.scored[0]
  }

  if (!selected) {
    return {
      success: false,
      routingDecision: null,
      error: 'No viable distributor found after scoring',
      errorId
    }
  }

  const mode = determineAssignmentMode(
    actualCustomerLat,
    actualCustomerLon,
    centroidUsed,
    primaryResult.fallbackTriggered,
    selected.haversineDistanceKm,
    selected.factors.rawSupplyPressure / 100,
    selected.factors.rawSlaRate,
    selected.factors.rawPriorityRank
  )

  const reasoning = generateReasoning(
    primaryResult.scored,
    selected,
    mode,
    primaryResult.supplyPressureThresholdBreaches,
    supplyPressureThreshold,
    primaryResult.fallbackTriggered,
    primaryResult.fallbackReason,
    centroidUsed,
    customerCoord !== null
  )

  const avgCandidateScore =
    primaryResult.scored.length > 0
      ? primaryResult.scored.reduce((s, c) => s + c.combinedScore, 0) /
        primaryResult.scored.length
      : 0
  const scoreSpread =
    primaryResult.scored.length > 1
      ? primaryResult.scored[0].combinedScore -
        primaryResult.scored[primaryResult.scored.length - 1].combinedScore
      : 0

  const selectedIndex = finalCandidates.findIndex(
    c => c.distributorId === selected!.distributorId
  )

  const candidateRankings: CandidateRanking[] = primaryResult.scored.map(
    (c, idx) => ({
      rank: idx + 1,
      distributorId: c.distributorId,
      distributorName: c.distributorName,
      combinedScore: c.combinedScore,
      haversineDistanceKm: c.haversineDistanceKm,
      supplyPressureScore: c.factors.rawSupplyPressure,
      slaScore: c.factors.rawSlaRate * 100,
      priorityRank: c.factors.rawPriorityRank,
      assignmentMode:
        idx === selectedIndex
          ? mode
          : determineAssignmentMode(
              actualCustomerLat,
              actualCustomerLon,
              centroidUsed,
              primaryResult.fallbackTriggered,
              c.haversineDistanceKm,
              c.factors.rawSupplyPressure / 100,
              c.factors.rawSlaRate,
              c.factors.rawPriorityRank
            ),
      isSelected: idx === selectedIndex
    })
  )

  const selectedServiceArea = serviceAreaMap.get(selected.distributorId)
  const estimatedDeliveryHours = selectedServiceArea?.delivery_sla_hours ?? null

  const debugOutput: DebugOutput | null = verbose
    ? {
        weights,
        totalCandidatesEvaluated: distributors.length,
        candidatesFilteredOut:
          primaryResult.filteredOut.length + distributors.length - finalCandidates.length,
        pincodeCentroidUsed: centroidUsed,
        gpsCoordinatesUsed: customerCoord !== null,
        fallbackTriggered: gpsFallbackTriggered || primaryResult.fallbackTriggered,
        fallbackReason:
          gpsFallbackTriggered
            ? 'GPS coordinates not provided, using pincode centroid'
            : primaryResult.fallbackReason || null,
        supplyPressureThresholdBreach: primaryResult.supplyPressureThresholdBreaches,
        slaDataFreshnessHours: (() => {
          const firstSla = slaMap.values().next().value
          if (!firstSla) return null
          const diffMs =
            Date.now() - new Date(firstSla.last_updated).getTime()
          return Math.round(diffMs / (1000 * 60 * 60) * 10) / 10
        })(),
        computationTimeMs: Math.round(performance.now() - startTime),
        scoringDetails: primaryResult.debugScoring
      }
    : null

  const routingDecision: RoutingDecision = {
    decisionId: generateDecisionId(),
    timestamp: new Date().toISOString(),
    input: {
      customerPincode: pincode,
      customerLatitude: actualCustomerLat,
      customerLongitude: actualCustomerLon,
      productIds: actualProductIds
    },
    decision: {
      distributorId: selected.distributorId,
      distributorName: selected.distributorName,
      assignmentMode: mode,
      confidence:
        selected.combinedScore >= 0.7
          ? 0.95
          : selected.combinedScore >= 0.5
          ? 0.8
          : 0.6,
      estimatedDeliveryHours
    },
    candidates: candidateRankings,
    reasoning,
    debug: debugOutput,
    performanceMetrics: {
      totalCandidatesFound: distributors.length,
      selectedCandidateRank: selectedIndex + 1,
      averageCandidateScore: Math.round(avgCandidateScore * 10000) / 10000,
      scoreSpread: Math.round(scoreSpread * 10000) / 10000,
      routingMode: mode
    }
  }

  const endTime = performance.now()

  if (verbose) {
    console.log(JSON.stringify({
      engine: 'NEXT_GEN_ROUTING_COMPLETE',
      errorId,
      decisionId: routingDecision.decisionId,
      selected: {
        distributorId: selected.distributorId,
        distributorName: selected.distributorName,
        mode,
        score: selected.combinedScore,
        distanceKm: selected.haversineDistanceKm,
        supplyPressure: selected.factors.rawSupplyPressure,
        slaRate: (selected.factors.rawSlaRate * 100).toFixed(0) + '%'
      },
      reasoning: routingDecision.reasoning.primaryReason,
      computationTimeMs: Math.round(endTime - startTime)
    }))
  }

  return {
    success: true,
    routingDecision,
    error: null,
    errorId
  }
}

// ============================================
// LEGACY COMPATIBILITY EXPORT
// ============================================

export async function findBestDistributorForPincodeLegacy(
  supabase: SupabaseClient,
  pincode: string,
  productIds: string[] = []
): Promise<{
  success: boolean
  result?: {
    distributor_id: string
    distributor_name: string
    decision: string
    reasoning: string
  }
  error?: string
}> {
  const result = await findBestDistributorForPincode(
    { pincode, productIds },
    undefined,
    undefined,
    productIds,
    { verbose: false }
  )

  if (!result.success || !result.routingDecision) {
    return { success: false, error: result.error || 'Routing failed' }
  }

  return {
    success: true,
    result: {
      distributor_id: result.routingDecision.decision.distributorId,
      distributor_name: result.routingDecision.decision.distributorName,
      decision: result.routingDecision.decision.assignmentMode,
      reasoning: result.routingDecision.reasoning.primaryReason
    }
  }
}

// ============================================
// LOGGING HELPER (FOR AI AGENT AUDIT TRAIL)
// ============================================

export async function logRoutingDecision(
  supabase: SupabaseClient,
  orderId: string,
  routingResult: RoutingEngineResult
): Promise<void> {
  if (!routingResult.routingDecision) return

  const decision = routingResult.routingDecision

  await supabase.from('routing_decision_log').insert({
    order_id: orderId,
    decision_id: decision.decisionId,
    distributor_id: decision.decision.distributorId,
    distributor_name: decision.decision.distributorName,
    assignment_mode: decision.decision.assignmentMode,
    confidence: decision.decision.confidence,
    estimated_delivery_hours: decision.decision.estimatedDeliveryHours,
    reasoning: decision.reasoning.primaryReason,
    reasoning_warnings: decision.reasoning.warnings,
    reasoning_constraints: decision.reasoning.constraintsApplied,
    alternatives_considered: decision.reasoning.alternativeConsidered,
    input_pincode: decision.input.customerPincode,
    input_latitude: decision.input.customerLatitude,
    input_longitude: decision.input.customerLongitude,
    candidates_count: decision.candidates.length,
    selected_rank: decision.performanceMetrics.selectedCandidateRank,
    score_spread: decision.performanceMetrics.scoreSpread,
    routing_decision_json: decision as unknown as Record<string, unknown>,
    created_at: new Date().toISOString()
  })
}
