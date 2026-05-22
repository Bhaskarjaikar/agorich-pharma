import { UserRole } from './supabase-client'

export interface PricingEngineInput {
  mrp: number
}

export interface PricingEngineOutput {
  distributorBuyPrice: number
  appRetailerPrice: number
  distributorMargin: number
  distributorMarginPercentage: number
}

/**
 * PricingEngine utility class for dual-pricing & margin protection
 */
export class PricingEngine {
  private static readonly DISTRIBUTOR_BUY_PERCENTAGE = 0.6
  private static readonly APP_RETAILER_PERCENTAGE_MIN = 0.75
  private static readonly APP_RETAILER_PERCENTAGE_MAX = 0.78

  /**
   * Calculate all pricing components based on MRP
   */
  static calculate(input: PricingEngineInput, appRetailerPercentage: number = 0.77): PricingEngineOutput {
    const { mrp } = input

    if (appRetailerPercentage < this.APP_RETAILER_PERCENTAGE_MIN || appRetailerPercentage > this.APP_RETAILER_PERCENTAGE_MAX) {
      throw new Error(`App retailer percentage must be between ${this.APP_RETAILER_PERCENTAGE_MIN * 100}% and ${this.APP_RETAILER_PERCENTAGE_MAX * 100}%`)
    }

    const distributorBuyPrice = mrp * this.DISTRIBUTOR_BUY_PERCENTAGE
    const appRetailerPrice = mrp * appRetailerPercentage
    const distributorMargin = appRetailerPrice - distributorBuyPrice
    const distributorMarginPercentage = (distributorMargin / appRetailerPrice) * 100

    return {
      distributorBuyPrice: Math.round(distributorBuyPrice * 100) / 100,
      appRetailerPrice: Math.round(appRetailerPrice * 100) / 100,
      distributorMargin: Math.round(distributorMargin * 100) / 100,
      distributorMarginPercentage: Math.round(distributorMarginPercentage * 100) / 100
    }
  }

  /**
   * Get price for a specific user role
   */
  static getPriceForRole(input: PricingEngineInput, role: UserRole, appRetailerPercentage: number = 0.77): number {
    const pricing = this.calculate(input, appRetailerPercentage)

    switch (role) {
      case 'DISTRIBUTOR':
        return pricing.distributorBuyPrice
      case 'RETAILER':
      default:
        return pricing.appRetailerPrice
    }
  }
}
