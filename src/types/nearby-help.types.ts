export type NearbyHelpPlace = {
  id: string
  name: string
  type: 'POLICE' | 'HOSPITAL'
  address: string
  latitude: number
  longitude: number
  phoneNumber: string | null
  navigateUrl: string
  distanceMeters: number
  walkingDurationSeconds: number | null
  walkingDurationText: string | null
}

export type NearbyHelpRoute = {
  destinationName: string
  distanceMeters: number | null
  walkingDurationSeconds: number | null
  walkingDurationText: string | null
  encodedPolyline: string | null
  navigateUrl: string
}
