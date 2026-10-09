export interface PortReferencePoint {
  referenceCode: string
  name: string
  aliases: string[]
  latitude: number
  longitude: number
}

export const philippinePortReferences: PortReferencePoint[] = [
  { referenceCode: 'PH-MANILA', name: 'Manila Port', aliases: ['manila', 'south harbor', 'mict'], latitude: 14.58, longitude: 120.97 },
  { referenceCode: 'PH-CEBU', name: 'Cebu Port', aliases: ['cebu'], latitude: 10.3, longitude: 123.9 },
  { referenceCode: 'PH-DAVAO', name: 'Davao Port', aliases: ['davao'], latitude: 7.07, longitude: 125.62 },
  { referenceCode: 'PH-CAGAYAN-DE-ORO', name: 'Cagayan de Oro Port', aliases: ['cagayan de oro', 'cdo'], latitude: 8.5, longitude: 124.67 },
  { referenceCode: 'PH-BATANGAS', name: 'Batangas City Port', aliases: ['batangas'], latitude: 13.75, longitude: 121.05 },
  { referenceCode: 'PH-MARIVELES', name: 'Mariveles Port', aliases: ['mariveles'], latitude: 14.43, longitude: 120.48 },
  { referenceCode: 'PH-SUBIC-BAY', name: 'Subic Bay Port', aliases: ['subic'], latitude: 14.8, longitude: 120.27 },
  { referenceCode: 'PH-ILOILO', name: 'Iloilo Port', aliases: ['iloilo'], latitude: 10.7, longitude: 122.58 },
  { referenceCode: 'PH-SURIGAO-CITY', name: 'Surigao City Port', aliases: ['surigao'], latitude: 9.78, longitude: 125.5 },
  { referenceCode: 'PH-GENERAL-SANTOS', name: 'General Santos Port', aliases: ['general santos', 'gensan'], latitude: 6.12, longitude: 125.18 },
  { referenceCode: 'PH-ZAMBOANGA', name: 'Zamboanga Port', aliases: ['zamboanga'], latitude: 6.9, longitude: 122.07 },
]
