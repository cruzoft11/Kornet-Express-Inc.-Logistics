/**
 * Official Directory of Import Airline Cargo Warehouses & Carriers
 * Source: NAIA / Manila Import Airline Warehouses Circular (As of May 7, 2026, REV21)
 */

export interface AirlineRecord {
  code: string
  name: string
  prefix: string
  warehouseId: 'PAIRCARGO' | 'CARGOHAUS' | 'PAL' | 'PSI'
  warehouseName: string
  routes: string
  notes?: string
}

export interface WarehouseRecord {
  id: 'PAIRCARGO' | 'CARGOHAUS' | 'PAL' | 'PSI'
  name: string
  fullName: string
  code: string
  address: string
  terminal: string
  status?: string
  notes?: string
}

export const AIRLINE_WAREHOUSES: WarehouseRecord[] = [
  {
    id: 'PAIRCARGO',
    name: 'PAIRCARGO',
    fullName: "People's Air Cargo & Warehousing Co., Inc.",
    code: 'PAIRCARGO',
    address: 'Paircargo Building, Ninoy Aquino Avenue, Pasay City, Metro Manila',
    terminal: 'NAIA Complex',
  },
  {
    id: 'CARGOHAUS',
    name: 'CARGOHAUS',
    fullName: 'Cargohaus, Inc.',
    code: 'CARGOHAUS',
    address: 'Cargohaus Building, Old MIA Road, NAIA Complex, Parañaque City',
    terminal: 'NAIA Complex',
  },
  {
    id: 'PAL',
    name: 'PAL WAREHOUSE',
    fullName: 'Philippine Airlines Cargo Terminal',
    code: 'PAL_WH',
    address: 'PAL Cargo Terminal, Domestic Road / Andrews Ave, Pasay City',
    terminal: 'NAIA Terminal 2 Cargo',
  },
  {
    id: 'PSI',
    name: 'PHIL. SKYLANDER INC. (PSI)',
    fullName: 'Philippine Skylander Inc.',
    code: 'PSI',
    address: 'PSI Cargo Complex, NAIA Airport, Pasay City',
    terminal: 'NAIA Complex',
    status: 'Under Transition',
    notes: 'Facilities and assigned airline carriers are under active transition.',
  },
]

export const OFFICIAL_AIRLINES: AirlineRecord[] = [
  // ================= PAIRCARGO CARRIERS =================
  {
    code: 'CA',
    name: 'Air China',
    prefix: '999',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'PEK (Beijing Capital)',
  },
  {
    code: 'LD',
    name: 'Air Hong Kong',
    prefix: '289',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'HKG (Hong Kong)',
  },
  {
    code: 'NH',
    name: 'All Nippon Airways / ANA Cargo',
    prefix: '205',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'HND (Tokyo Haneda), NRT (Tokyo Narita)',
  },
  {
    code: 'CX',
    name: 'Cathay Pacific Cargo',
    prefix: '160',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'HKG (Hong Kong)',
  },
  {
    code: '5J',
    name: 'Cebu Pacific',
    prefix: '203',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'ICN, BKI, CGK, HAN, DPS, BKK, GUM, SYD, PEK, CAN, SGN, HKG, MFM, PVG, REP, KUL, NRT, KIX, NGO, FUK, CTS, TPE, KHH, BWN, DXB, SIN',
  },
  {
    code: 'CI',
    name: 'China Airlines',
    prefix: '297',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'KHH (Kaohsiung), TPE (Taipei), TPE via SIN',
  },
  {
    code: 'MU',
    name: 'China Eastern Airlines',
    prefix: '781',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'PVG (Shanghai Pudong)',
  },
  {
    code: 'CZ',
    name: 'China Southern Airlines',
    prefix: '784',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'CAN (Guangzhou Baiyun)',
  },
  {
    code: 'DL',
    name: 'Delta Cargo',
    prefix: '006',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'TYO (Tokyo Haneda / Narita)',
  },
  {
    code: 'EK',
    name: 'Emirates SkyCargo',
    prefix: '176',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'DXB (Dubai International)',
  },
  {
    code: 'ET',
    name: 'Ethiopian Airlines',
    prefix: '071',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'ADD-HKG (Addis Ababa - Hong Kong)',
  },
  {
    code: 'EY',
    name: 'Etihad Cargo',
    prefix: '607',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'AUH (Abu Dhabi Zayed)',
  },
  {
    code: 'BR',
    name: 'EVA Air Cargo',
    prefix: '695',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'TPE (Taipei Taoyuan)',
  },
  {
    code: 'GF',
    name: 'Gulf Air',
    prefix: '072',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'BAH (Bahrain International)',
  },
  {
    code: 'RH',
    name: 'Hong Kong Air Cargo',
    prefix: '851',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'HKG (Hong Kong)',
  },
  {
    code: 'HX',
    name: 'Hong Kong Airlines',
    prefix: '851',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'HKG (Hong Kong)',
  },
  {
    code: 'JL',
    name: 'Japan Airlines (JAL)',
    prefix: '131',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'TYO (Tokyo Haneda / Narita)',
  },
  {
    code: '3K',
    name: 'Jetstar Asia',
    prefix: '040',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'SIN (Singapore), KIX (Osaka Kansai)',
  },
  {
    code: 'KE',
    name: 'Korean Air Cargo',
    prefix: '180',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'ICN (Seoul Incheon)',
  },
  {
    code: 'WY',
    name: 'Oman Air',
    prefix: '910',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'MCT (Muscat International)',
  },
  {
    code: 'QF',
    name: 'Qantas Freight',
    prefix: '081',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'SYD (Sydney Kingsford Smith)',
  },
  {
    code: 'QR',
    name: 'Qatar Airways Cargo',
    prefix: '157',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'DOH (Doha Hamad)',
  },
  {
    code: 'BI',
    name: 'Royal Brunei Airlines',
    prefix: '672',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'BSB (Brunei International)',
  },
  {
    code: 'SQ',
    name: 'Singapore Airlines Cargo',
    prefix: '618',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'SIN (Singapore Changi)',
  },
  {
    code: 'JX',
    name: 'STARLUX Airlines',
    prefix: '189',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'TPE (Taipei Taoyuan)',
  },
  {
    code: 'TG',
    name: 'Thai Airways Cargo',
    prefix: '217',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'BKK (Bangkok Suvarnabhumi)',
  },
  {
    code: 'TR',
    name: 'Tigerair / Scoot Cargo',
    prefix: '618',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'SIN (Singapore Changi)',
    notes: 'Co-Load to SQ Airway bill 618 - SQ AREA',
  },
  {
    code: 'UA',
    name: 'United Airlines Cargo',
    prefix: '016',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'GUM (Guam International)',
  },
  {
    code: 'MF',
    name: 'XiamenAir Cargo',
    prefix: '731',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'JIN (Jinjiang), XMN (Xiamen Gaoqi)',
  },
  {
    code: 'YG',
    name: 'YTO Cargo Airlines',
    prefix: '890',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'YYZ (Toronto Pearson)',
  },
  {
    code: 'JG',
    name: 'Jiangsu Jingdong Cargo Airlines',
    prefix: '936',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'JDL (Jingdong Logistics Hub)',
  },
  {
    code: '3U',
    name: 'Sichuan Airlines',
    prefix: '876',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'SZX (Shenzhen Baoan)',
  },
  {
    code: 'VN',
    name: 'Vietnam Airlines',
    prefix: '738',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'HAN (Hanoi Noi Bai), SGN (Ho Chi Minh Tan Son Nhat)',
  },
  {
    code: 'TK',
    name: 'Turkish Cargo',
    prefix: '235',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'IST (Istanbul Airport)',
  },
  {
    code: 'AF',
    name: 'Air France Cargo',
    prefix: '057',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'ORD (Chicago O’Hare)',
  },
  {
    code: 'OZ',
    name: 'Asiana Airlines Cargo',
    prefix: '988',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'PUS (Busan Gimhae), ICN (Seoul Incheon)',
    notes: 'Effective May 7, 2026 - until further notice',
  },
  {
    code: 'MH',
    name: 'Malaysia Airlines Kargo',
    prefix: '232',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'KUL (Kuala Lumpur International)',
    notes: 'Effective May 7, 2026 - until further notice',
  },
  {
    code: 'KL',
    name: 'Royal Cargo / KLM Cargo',
    prefix: '074',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'TPE (Taipei Taoyuan)',
    notes: 'Effective May 7, 2026 - until further notice',
  },
  {
    code: 'SR',
    name: 'Skyway Airlines Cargo',
    prefix: '372',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'SZX (Shenzhen Baoan)',
    notes: 'Effective May 7, 2026 - until further notice',
  },
  {
    code: 'PX',
    name: 'Air Niugini',
    prefix: '656',
    warehouseId: 'PAIRCARGO',
    warehouseName: "People's Air Cargo & Warehousing Co., Inc.",
    routes: 'PNG (Port Moresby Jackson)',
    notes: 'Effective May 7, 2026 - until further notice',
  },

  // ================= CARGOHAUS CARRIERS =================
  {
    code: 'AK',
    name: 'AirAsia (Malaysia)',
    prefix: '807',
    warehouseId: 'CARGOHAUS',
    warehouseName: 'Cargohaus, Inc.',
    routes: 'KUL (Kuala Lumpur International)',
  },
  {
    code: 'ZZ',
    name: 'AirAsia Cargo',
    prefix: '807',
    warehouseId: 'CARGOHAUS',
    warehouseName: 'Cargohaus, Inc.',
    routes: 'KUL, BKK, DPS, TPE, CAN, HKG, ICN, MFM, KHH',
  },
  {
    code: 'GM',
    name: 'Tri-M.G. Intra Asia Airlines',
    prefix: '362',
    warehouseId: 'CARGOHAUS',
    warehouseName: 'Cargohaus, Inc.',
    routes: 'SIN (Singapore Changi)',
  },
  {
    code: '7C',
    name: 'Jeju Air',
    prefix: '806',
    warehouseId: 'CARGOHAUS',
    warehouseName: 'Cargohaus, Inc.',
    routes: 'ICN (Seoul Incheon)',
  },
  {
    code: '2Y',
    name: 'My Indo Airlines',
    prefix: '840',
    warehouseId: 'CARGOHAUS',
    warehouseName: 'Cargohaus, Inc.',
    routes: 'BKK, BPN, DPS, SIN',
  },
  {
    code: 'GI',
    name: 'Longhao Airlines',
    prefix: '828',
    warehouseId: 'CARGOHAUS',
    warehouseName: 'Cargohaus, Inc.',
    routes: 'SZX (Shenzhen Baoan)',
  },
  {
    code: 'ZH',
    name: 'Shenzhen Airlines',
    prefix: '479',
    warehouseId: 'CARGOHAUS',
    warehouseName: 'Cargohaus, Inc.',
    routes: 'SZX (Shenzhen Baoan)',
  },
  {
    code: 'NT',
    name: 'My Jet Xpress Airlines',
    prefix: '720',
    warehouseId: 'CARGOHAUS',
    warehouseName: 'Cargohaus, Inc.',
    routes: 'KUL (Kuala Lumpur International)',
  },
  {
    code: 'HT',
    name: 'Tianjin Airlines',
    prefix: '826',
    warehouseId: 'CARGOHAUS',
    warehouseName: 'Cargohaus, Inc.',
    routes: 'TSN (Tianjin Binhai)',
  },
  {
    code: '8Y',
    name: 'Pan Pacific Airlines',
    prefix: '768',
    warehouseId: 'CARGOHAUS',
    warehouseName: 'Cargohaus, Inc.',
    routes: 'CGO (Zhengzhou Xinzheng)',
  },
  {
    code: 'RW',
    name: 'Royal Air Philippines',
    prefix: '792',
    warehouseId: 'CARGOHAUS',
    warehouseName: 'Cargohaus, Inc.',
    routes: 'ICN, CAN, WUH, WUX, NNG, CZX',
  },
  {
    code: 'O3',
    name: 'SF Airlines Cargo',
    prefix: '921',
    warehouseId: 'CARGOHAUS',
    warehouseName: 'Cargohaus, Inc.',
    routes: 'SZX (Shenzhen Baoan)',
  },
  {
    code: 'KJ',
    name: 'Air Incheon',
    prefix: '958',
    warehouseId: 'CARGOHAUS',
    warehouseName: 'Cargohaus, Inc.',
    routes: 'ICN (Seoul Incheon)',
  },
  {
    code: 'AC',
    name: 'Air Canada Cargo',
    prefix: '014',
    warehouseId: 'CARGOHAUS',
    warehouseName: 'Cargohaus, Inc.',
    routes: 'ACA (Air Canada Routing)',
  },
  {
    code: 'KU',
    name: 'Kuwait Airways Cargo',
    prefix: '229',
    warehouseId: 'CARGOHAUS',
    warehouseName: 'Cargohaus, Inc.',
    routes: 'KWI (Kuwait International)',
  },
  {
    code: 'SV',
    name: 'Saudia Cargo',
    prefix: '065',
    warehouseId: 'CARGOHAUS',
    warehouseName: 'Cargohaus, Inc. (Docs) / Paircargo (Cargo)',
    routes: 'JED (Jeddah King Abdulaziz), RUH (Riyadh King Khalid)',
    notes: 'Import Document Only at Cargohaus; Actual Cargo at Paircargo Warehouse',
  },
  {
    code: 'VJ',
    name: 'VietJet Air Cargo',
    prefix: '978',
    warehouseId: 'CARGOHAUS',
    warehouseName: 'Cargohaus, Inc.',
    routes: 'DAD (Da Nang International)',
  },
  {
    code: 'WW',
    name: 'Muets Cargo',
    prefix: '625',
    warehouseId: 'CARGOHAUS',
    warehouseName: 'Cargohaus, Inc.',
    routes: 'KUL (Kuala Lumpur International)',
  },
  {
    code: 'CF',
    name: 'China Postal Airlines',
    prefix: '804',
    warehouseId: 'CARGOHAUS',
    warehouseName: 'Cargohaus, Inc.',
    routes: 'SZX (Shenzhen Baoan)',
  },
  {
    code: '3G',
    name: 'World Cargo Airlines',
    prefix: '714',
    warehouseId: 'CARGOHAUS',
    warehouseName: 'Cargohaus, Inc.',
    routes: 'KUL (Kuala Lumpur International)',
  },
  {
    code: 'IB',
    name: 'China Central Airlines',
    prefix: '868',
    warehouseId: 'CARGOHAUS',
    warehouseName: 'Cargohaus, Inc.',
    routes: 'CHI (Effective May 7, 2026 - until further notice)',
  },

  // ================= PAL WAREHOUSE CARRIERS =================
  {
    code: 'PR',
    name: 'Philippine Airlines (PAL Cargo)',
    prefix: '079',
    warehouseId: 'PAL',
    warehouseName: 'Philippine Airlines Cargo Terminal',
    routes: 'Comprehensive Domestic & Trans-Pacific / Asian Network',
    notes: 'Flag carrier domestic and international cargo warehouse',
  },
]

/**
 * Quick search / lookup helper
 */
export function findAirline(codeOrPrefix: string): AirlineRecord | undefined {
  if (!codeOrPrefix) return undefined
  const cleaned = codeOrPrefix.trim().toUpperCase()
  return OFFICIAL_AIRLINES.find(
    (a) => a.code === cleaned || a.prefix === cleaned || a.name.toUpperCase().includes(cleaned)
  )
}

/**
 * Get designated warehouse for a given airline code
 */
export function getWarehouseForAirline(airlineCode: string): WarehouseRecord | undefined {
  const airline = findAirline(airlineCode)
  if (!airline) return undefined
  return AIRLINE_WAREHOUSES.find((w) => w.id === airline.warehouseId)
}

/**
 * Pre-formatted dropdown options for Airlines
 */
export const AIRLINE_DROPDOWN_OPTIONS = OFFICIAL_AIRLINES.map((a) => ({
  value: a.code,
  label: `${a.code} · ${a.name} (AWB: ${a.prefix}— | ${a.warehouseId})`,
  description: `${a.routes}${a.notes ? ` • ${a.notes}` : ''}`,
  prefix: a.prefix,
  warehouseId: a.warehouseId,
  warehouseName: a.warehouseName,
  airlineName: a.name,
}))

/**
 * Pre-formatted dropdown options for Warehouses
 */
export const WAREHOUSE_DROPDOWN_OPTIONS = AIRLINE_WAREHOUSES.map((w) => ({
  value: w.name,
  label: `${w.name} — ${w.fullName}${w.status ? ` [${w.status}]` : ''}`,
  description: w.address,
  id: w.id,
}))
