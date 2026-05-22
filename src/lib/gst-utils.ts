/**
 * GST Utilities for Agorich Pharma
 * Handles GSTIN validation, B2B/B2C determination, and tax logic
 */

export type GSTType = 'B2B' | 'B2C';

export interface CustomerGSTInfo {
  gstin?: string | null;
  state: string;
  businessName?: string | null;
  isValid: boolean;
}

/**
 * Validates GSTIN format
 * GSTIN format: 2 digits (state code) + 10 chars (PAN) + 1 (entity number) + 1 (checksum char) + Z + 1 (checksum digit)
 * Example: 10ABCDE1234F1Z5 (Bihar GSTIN)
 */
export function validateGSTIN(gstin: string | null | undefined): boolean {
  if (!gstin || typeof gstin !== 'string') {
    return false;
  }

  // Remove spaces and convert to uppercase
  const cleanGSTIN = gstin.trim().toUpperCase();

  // GSTIN must be 15 characters
  if (cleanGSTIN.length !== 15) {
    return false;
  }

  // GSTIN format regex
  // 2 digits (state code) + 10 chars (PAN: 5 letters + 4 digits + 1 letter) + 1 digit/letter + Z + 1 digit/letter
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  if (!gstinRegex.test(cleanGSTIN)) {
    return false;
  }

  // Validate state code (01-37 are valid Indian state codes)
  const stateCode = parseInt(cleanGSTIN.substring(0, 2), 10);
  if (stateCode < 1 || stateCode > 37) {
    return false;
  }

  return true;
}

/**
 * Determines if a customer is B2B (has valid GSTIN) or B2C (no GSTIN or invalid)
 */
export function determineGSTType(customerGstin?: string | null): GSTType {
  return validateGSTIN(customerGstin) ? 'B2B' : 'B2C';
}

/**
 * Extracts state code from GSTIN
 * Returns the 2-digit state code
 */
export function extractStateCodeFromGSTIN(gstin: string): string {
  if (!validateGSTIN(gstin)) {
    return '';
  }
  return gstin.substring(0, 2);
}

/**
 * Gets state name from state code
 */
const STATE_CODE_MAP: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman and Diu',
  '26': 'Dadra and Nagar Haveli',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
};

export function getStateNameFromCode(stateCode: string): string {
  return STATE_CODE_MAP[stateCode] || 'Unknown';
}

/**
 * Gets state code from state name
 */
export function getStateCodeFromName(stateName: string): string | null {
  const normalizedName = stateName.trim().toLowerCase();
  
  for (const [code, name] of Object.entries(STATE_CODE_MAP)) {
    if (name.toLowerCase() === normalizedName) {
      return code;
    }
  }
  
  // Handle special cases
  const specialCases: Record<string, string> = {
    'bihar': '10',
    'br': '10',
    'delhi': '07',
    'dl': '07',
    'up': '09',
    'uttar pradesh': '09',
    'mp': '23',
    'madhya pradesh': '23',
    'gujarat': '24',
    'gj': '24',
    'maharashtra': '27',
    'mh': '27',
    'karnataka': '29',
    'ka': '29',
    'telangana': '36',
    'tg': '36',
    'tamil nadu': '33',
    'tn': '33',
    'kerala': '32',
    'kl': '32',
    'west bengal': '19',
    'wb': '19',
    'odisha': '21',
    'orissa': '21',
    'od': '21',
    'rajasthan': '08',
    'rj': '08',
    'haryana': '06',
    'hr': '06',
    'punjab': '03',
    'pb': '03',
    'himachal pradesh': '02',
    'hp': '02',
    'jharkhand': '20',
    'jh': '20',
    'chhattisgarh': '22',
    'cg': '22',
    'assam': '18',
    'as': '18',
  };
  
  return specialCases[normalizedName] || null;
}

/**
 * Determines if transaction is intra-state or inter-state
 * Intra-state: SGST + CGST applies
 * Inter-state: IGST applies
 */
export function isIntraStateTransaction(
  placeOfSupply: string,
  companyState: string = 'Bihar'
): boolean {
  const normalizedPOS = placeOfSupply.trim().toLowerCase();
  const normalizedCompany = companyState.trim().toLowerCase();
  
  return normalizedPOS === normalizedCompany;
}

/**
 * Gets place of supply based on customer state
 * For B2B: Use customer's state
 * For B2C: Use customer's state (same logic)
 */
export function getPlaceOfSupply(customerState: string): string {
  // Normalize the state name
  const normalizedState = customerState.trim();
  
  // Check if it's already a valid state name
  const stateCode = getStateCodeFromName(normalizedState);
  
  if (stateCode) {
    return normalizedState;
  }
  
  // Try to match common variations
  const stateMappings: Record<string, string> = {
    'bihar': 'Bihar',
    'br': 'Bihar',
    'delhi': 'Delhi',
    'new delhi': 'Delhi',
    'dl': 'Delhi',
    'up': 'Uttar Pradesh',
    'uttar pradesh': 'Uttar Pradesh',
    'mp': 'Madhya Pradesh',
    'madhya pradesh': 'Madhya Pradesh',
    'gujarat': 'Gujarat',
    'gujrat': 'Gujarat',
    'gj': 'Gujarat',
    'maharashtra': 'Maharashtra',
    'mh': 'Maharashtra',
    'karnataka': 'Karnataka',
    'ka': 'Karnataka',
    'telangana': 'Telangana',
    'tg': 'Telangana',
    'tamil nadu': 'Tamil Nadu',
    'tn': 'Tamil Nadu',
    'kerala': 'Kerala',
    'kl': 'Kerala',
    'west bengal': 'West Bengal',
    'wb': 'West Bengal',
    'odisha': 'Odisha',
    'orissa': 'Odisha',
    'od': 'Odisha',
    'rajasthan': 'Rajasthan',
    'rj': 'Rajasthan',
    'haryana': 'Haryana',
    'hr': 'Haryana',
    'punjab': 'Punjab',
    'pb': 'Punjab',
    'himachal pradesh': 'Himachal Pradesh',
    'hp': 'Himachal Pradesh',
    'jharkhand': 'Jharkhand',
    'jh': 'Jharkhand',
    'chhattisgarh': 'Chhattisgarh',
    'cg': 'Chhattisgarh',
    'assam': 'Assam',
    'as': 'Assam',
    'uttarakhand': 'Uttarakhand',
    'uk': 'Uttarakhand',
    'jammu and kashmir': 'Jammu and Kashmir',
    'jk': 'Jammu and Kashmir',
    'chandigarh': 'Chandigarh',
    'ch': 'Chandigarh',
    'goa': 'Goa',
    'ga': 'Goa',
  };
  
  const mappedState = stateMappings[normalizedState.toLowerCase()];
  return mappedState || normalizedState;
}

/**
 * Gets customer display name for invoice
 * For B2B: Business name
 * For B2C: Individual name with "(URP)" suffix
 */
export function getCustomerDisplayName(
  gstType: GSTType,
  businessName?: string | null,
  userName?: string | null
): string {
  if (gstType === 'B2B' && businessName) {
    return businessName;
  }
  
  const name = businessName || userName || 'Unregistered Person';
  return gstType === 'B2C' ? `${name} (URP - Unregistered Person)` : name;
}

/**
 * Formats GSTIN for display (adds spaces for readability)
 */
export function formatGSTINForDisplay(gstin: string): string {
  if (!validateGSTIN(gstin)) {
    return gstin;
  }
  
  const clean = gstin.toUpperCase();
  // Format: 10 ABCDE 1234 F 1 Z 5
  return `${clean.substring(0, 2)} ${clean.substring(2, 7)} ${clean.substring(7, 11)} ${clean.substring(11, 12)} ${clean.substring(12, 13)} ${clean.substring(13, 14)} ${clean.substring(14, 15)}`;
}

/**
 * Gets company GSTIN from environment or settings
 */
export function getCompanyGSTIN(): string {
  return process.env.COMPANY_GSTIN || '10XXXXXXXXXXXXX';
}

/**
 * Gets company state from environment or settings
 */
export function getCompanyState(): string {
  return process.env.COMPANY_STATE || 'Bihar';
}

/**
 * Gets company name from environment or settings
 */
export function getCompanyName(): string {
  return process.env.COMPANY_NAME || 'Agorich Pharma';
}

/**
 * Validates if customer data is sufficient for B2C invoice
 * Required: Name, State, Address
 */
export function validateB2CCustomerData(
  customerName: string,
  state: string,
  address?: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!customerName || customerName.trim().length === 0) {
    errors.push('Customer name is required');
  }
  
  if (!state || state.trim().length === 0) {
    errors.push('State is required for Place of Supply determination');
  }
  
  if (!address || address.trim().length === 0) {
    errors.push('Address is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
