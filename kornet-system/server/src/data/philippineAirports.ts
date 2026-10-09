export interface AirportReference {
  code: string
  icao: string
  name: string
  municipality: string
  latitude: number
  longitude: number
}

export const philippineAirports: AirportReference[] = [
  { code: 'SFS', icao: 'RPLB', name: 'Subic Bay International Airport', municipality: 'Olongapo', latitude: 14.794833, longitude: 120.271883 },
  { code: 'CRK', icao: 'RPLC', name: 'Clark International Airport', municipality: 'Mabalacat', latitude: 15.186, longitude: 120.559998 },
  { code: 'LAO', icao: 'RPLI', name: 'Laoag International Airport', municipality: 'Laoag City', latitude: 18.175089, longitude: 120.531006 },
  { code: 'DRP', icao: 'RPLK', name: 'Bicol International Airport', municipality: 'Legazpi', latitude: 13.111915, longitude: 123.676829 },
  { code: 'MNL', icao: 'RPLL', name: 'Ninoy Aquino International Airport', municipality: 'Manila (Pasay)', latitude: 14.5086, longitude: 121.019997 },
  { code: 'RPLT', icao: 'RPLT', name: 'Itbayat Jorge Abad Airport', municipality: 'Itbayat', latitude: 20.722521, longitude: 121.809969 },
  { code: 'CBO', icao: 'RPMC', name: 'Cotabato (Awang) Airport', municipality: 'Datu Odin Sinsuat', latitude: 7.164753, longitude: 124.209938 },
  { code: 'DVO', icao: 'RPMD', name: 'Francisco Bangoy International Airport', municipality: 'Davao', latitude: 7.12552, longitude: 125.646004 },
  { code: 'BXU', icao: 'RPME', name: 'Bancasi Airport', municipality: 'Butuan', latitude: 8.9515, longitude: 125.4788 },
  { code: 'DPL', icao: 'RPMG', name: 'Dipolog Airport', municipality: 'Dipolog', latitude: 8.601983, longitude: 123.341875 },
  { code: 'CGM', icao: 'RPMH', name: 'Camiguin Airport', municipality: 'Mambajao', latitude: 9.253894, longitude: 124.709115 },
  { code: 'JOL', icao: 'RPMJ', name: 'Jolo Airport', municipality: 'Jolo', latitude: 6.05367, longitude: 121.011002 },
  { code: 'TWT', icao: 'RPMN', name: 'Sanga Sanga Airport', municipality: 'Bongao', latitude: 5.048196, longitude: 119.743338 },
  { code: 'OZC', icao: 'RPMO', name: 'Labo Airport', municipality: 'Ozamiz', latitude: 8.17851, longitude: 123.842003 },
  { code: 'PAG', icao: 'RPMP', name: 'Pagadian Airport', municipality: 'Pagadian', latitude: 7.825632, longitude: 123.459635 },
  { code: 'GES', icao: 'RPMR', name: 'General Santos International Airport', municipality: 'General Santos', latitude: 6.057208, longitude: 125.096243 },
  { code: 'SUG', icao: 'RPMS', name: 'Surigao Airport', municipality: 'Surigao City', latitude: 9.755838, longitude: 125.480947 },
  { code: 'CGY', icao: 'RPMY', name: 'Laguindingan International Airport', municipality: 'Laguindingan', latitude: 8.612203, longitude: 124.456496 },
  { code: 'ZAM', icao: 'RPMZ', name: 'Zamboanga International Airport', municipality: 'Zamboanga', latitude: 6.92242, longitude: 122.059998 },
  { code: 'TAG', icao: 'RPSP', name: 'Bohol-Panglao International Airport', municipality: 'Panglao', latitude: 9.573045, longitude: 123.770143 },
  { code: 'SJI', icao: 'RPUH', name: 'San Jose Airport', municipality: 'San Jose', latitude: 12.3615, longitude: 121.046997 },
  { code: 'WNP', icao: 'RPUN', name: 'Naga Airport', municipality: 'Naga', latitude: 13.5849, longitude: 123.269997 },
  { code: 'BSO', icao: 'RPUO', name: 'Basco Airport', municipality: 'Basco', latitude: 20.4513, longitude: 121.980003 },
  { code: 'TUG', icao: 'RPUT', name: 'Tuguegarao Airport', municipality: 'Tuguegarao City', latitude: 17.643368, longitude: 121.73315 },
  { code: 'VRC', icao: 'RPUV', name: 'Virac Airport', municipality: 'Virac', latitude: 13.5764, longitude: 124.206001 },
  { code: 'CYZ', icao: 'RPUY', name: 'Cauayan Airport', municipality: 'Cauayan City', latitude: 16.9299, longitude: 121.752998 },
  { code: 'TAC', icao: 'RPVA', name: 'Daniel Z. Romualdez Airport', municipality: 'Tacloban City', latitude: 11.227761, longitude: 125.027783 },
  { code: 'BCD', icao: 'RPVB', name: 'Bacolod-Silay International Airport', municipality: 'Bacolod City', latitude: 10.776237, longitude: 123.018879 },
  { code: 'CYP', icao: 'RPVC', name: 'Calbayog Airport', municipality: 'Calbayog', latitude: 12.072574, longitude: 124.54508 },
  { code: 'DGT', icao: 'RPVD', name: 'Sibulan Airport', municipality: 'Dumaguete', latitude: 9.334183, longitude: 123.30191 },
  { code: 'MPH', icao: 'RPVE', name: 'Godofredo P. Ramos Airport', municipality: 'Caticlan', latitude: 11.9245, longitude: 121.954002 },
  { code: 'CRM', icao: 'RPVF', name: 'Catarman National Airport', municipality: 'Catarman', latitude: 12.50161, longitude: 124.635258 },
  { code: 'ILO', icao: 'RPVI', name: 'Iloilo International Airport', municipality: 'Cabatuan', latitude: 10.833017, longitude: 122.493358 },
  { code: 'MBT', icao: 'RPVJ', name: 'Moises R. Espinosa Airport', municipality: 'Masbate', latitude: 12.369682, longitude: 123.630095 },
  { code: 'KLO', icao: 'RPVK', name: 'Kalibo International Airport', municipality: 'Kalibo', latitude: 11.6794, longitude: 122.375999 },
  { code: 'CEB', icao: 'RPVM', name: 'Mactan-Cebu International Airport', municipality: 'Cebu City/Lapu-Lapu City', latitude: 10.309261, longitude: 123.97974 },
  { code: 'PPS', icao: 'RPVP', name: 'Puerto Princesa International Airport', municipality: 'Puerto Princesa', latitude: 9.742044, longitude: 118.75911 },
  { code: 'RXS', icao: 'RPVR', name: 'Roxas Airport', municipality: 'Roxas City', latitude: 11.5977, longitude: 122.751998 },
  { code: 'TBH', icao: 'RPVU', name: 'Tugdan Airport', municipality: 'Tablas Island', latitude: 12.311, longitude: 122.085 },
  { code: 'USU', icao: 'RPVV', name: 'Francisco B. Reyes Airport', municipality: 'Coron', latitude: 12.121865, longitude: 120.100801 },
]
