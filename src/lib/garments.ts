import type { GarmentType } from './types'

export const GARMENT_TYPES: GarmentType[] = ['pant', 'shirt', 'suit', 'blouse', 'other']

// Typed measurement fields per garment (spec); `other` is free-text instructions only.
export const GARMENT_FIELDS: Record<GarmentType, string[]> = {
  pant: ['waist', 'hip', 'length', 'thigh', 'knee', 'bottom', 'crotch'],
  shirt: ['chest', 'shoulder', 'sleeve', 'length', 'neck', 'waist'],
  suit: ['chest', 'shoulder', 'sleeve', 'length', 'waist'],
  blouse: ['bust', 'waist', 'shoulder', 'sleeve', 'length'],
  other: [],
}
