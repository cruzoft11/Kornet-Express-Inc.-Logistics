import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const KORNET = "KORNET";

const allBilling = [
  // Core freight
  ["OFRT", "Ocean Freight",                         "FREIGHT",   "OCEAN",             "PER_WM",   "ZERO_RATED",              "4210","4510"],
  ["AFRT", "Air Freight",                           "FREIGHT",   "AIR",               "PER_KG",   "ZERO_RATED",              "4211","4511"],
  ["FSC",  "Fuel Surcharge",                        "FREIGHT",   "OCEAN,AIR",         "PER_SHPT", "ZERO_RATED",              "4210","4510"],
  ["BAF",  "Bunker Adjustment Factor",              "FREIGHT",   "OCEAN",             "PER_CNTR", "ZERO_RATED",              "4210","4510"],
  ["THC",  "Terminal Handling Charge",              "ORIGIN",    "OCEAN",             "PER_CNTR", "VATABLE",                 "4215","4515"],
  ["DOC",  "Documentation Fee",                     "DOCS",      "OCEAN,AIR",         "PER_FILE", "VATABLE",                 "4215","4515"],
  ["BLF",  "Bill of Lading Fee",                    "DOCS",      "OCEAN",             "PER_BL",   "VATABLE",                 "4215","4515"],
  ["AWBF", "Air Waybill Fee",                       "DOCS",      "AIR",               "PER_AWB",  "VATABLE",                 "4215","4515"],
  ["SEC",  "Security Surcharge",                    "ORIGIN",    "AIR",               "PER_KG",   "VATABLE",                 "4215","4515"],
  ["CFS",  "Container Freight Station Charge",      "WAREHOUSE", "OCEAN",             "PER_CBM",  "VATABLE",                 "4214","4514"],
  ["ARR",  "Arrastre Charges",                      "REIMBURSABLE","OCEAN",           "MANUAL",   "NON_VAT_REIMBURSABLE",    "1130","1130"],
  ["WHF",  "Wharfage Dues",                         "REIMBURSABLE","OCEAN",           "MANUAL",   "NON_VAT_REIMBURSABLE",    "1130","1130"],
  ["DUT",  "Customs Duties & Taxes",                "REIMBURSABLE","OCEAN,AIR",       "MANUAL",   "NON_VAT_REIMBURSABLE",    "1130","1130"],
  ["BRK",  "Customs Brokerage Fee",                 "CUSTOMS",   "OCEAN,AIR",         "PER_SHPT", "VATABLE",                 "4212","4512"],
  ["TRK",  "Inland Trucking Delivery",              "TRUCKING",  "DOMESTIC,OCEAN,AIR,PD","PER_SHPT","VATABLE",              "4213","4513"],
  ["STO",  "Bonded Warehouse Storage",              "WAREHOUSE", "OCEAN,AIR,VEHICLE", "PER_CBM",  "VATABLE",                 "4214","4514"],
  ["HDL",  "Cargo Handling Fee",                    "OTHER",     "OCEAN,AIR,VEHICLE", "PER_SHPT", "VATABLE",                 "4215","4515"],
  ["VHD",  "RoRo Vehicle Port Handling",            "OTHER",     "VEHICLE",           "PER_UNIT", "VATABLE",                 "4216","4515"],
  // CIF/CIP import-side charges
  ["TOF",  "Turn-Over Fee (CIF/CIP)",               "OTHER",     "OCEAN,AIR",         "PER_SHPT", "VATABLE",                 "4215","4515"],
  ["CSTO", "Storage Charges (CIF)",                 "WAREHOUSE", "OCEAN,AIR",         "PER_CBM",  "VATABLE",                 "4214","4514"],
  ["CCTF", "Cargo Transfer Fee (CIF)",               "OTHER",     "OCEAN,AIR",         "MANUAL",   "VATABLE",                 "4215","4515"],
  ["CICF", "Import Cargo Fee (CIF)",                 "CUSTOMS",   "OCEAN,AIR",         "MANUAL",   "VATABLE",                 "4212","4512"],
  ["CIPF", "Import Permit Fee (CIF)",                "CUSTOMS",   "OCEAN,AIR",         "MANUAL",   "NON_VAT_REIMBURSABLE",    "1130","1130"],
  ["CIPL", "IP Lodgement Fee (CIF)",                 "CUSTOMS",   "OCEAN,AIR",         "MANUAL",   "VATABLE",                 "4212","4512"],
  ["CIPTP","PTOPS Fee (CIF)",                        "CUSTOMS",   "OCEAN,AIR",         "MANUAL",   "VATABLE",                 "4212","4512"],
  ["CLOD", "Lodgement Fee (CIF)",                    "DOCS",      "OCEAN,AIR",         "PER_FILE", "VATABLE",                 "4215","4515"],
  // DDU import-side charges
  ["DSTO", "Storage Charges (DDU)",                  "WAREHOUSE", "OCEAN,AIR",         "PER_CBM",  "VATABLE",                 "4214","4514"],
  ["DCTF", "Cargo Transfer Fee (DDU)",                "OTHER",     "OCEAN,AIR",         "MANUAL",   "VATABLE",                 "4215","4515"],
  ["DICF", "Import Cargo Fee (DDU)",                  "CUSTOMS",   "OCEAN,AIR",         "MANUAL",   "VATABLE",                 "4212","4512"],
  ["DIPF", "Import Permit Fee (DDU)",                 "CUSTOMS",   "OCEAN,AIR",         "MANUAL",   "NON_VAT_REIMBURSABLE",    "1130","1130"],
  ["DIPL", "IP Lodgement Fee (DDU)",                  "CUSTOMS",   "OCEAN,AIR",         "MANUAL",   "VATABLE",                 "4212","4512"],
  ["DPTOP","PTOPS Fee (DDU)",                         "CUSTOMS",   "OCEAN,AIR",         "MANUAL",   "VATABLE",                 "4212","4512"],
  ["DTRK", "Trucking (DDU)",                          "TRUCKING",  "OCEAN,AIR",         "PER_SHPT", "VATABLE",                 "4213","4513"],
  ["DBBK", "Breakbulk Fee (DDU)",                     "OTHER",     "OCEAN,AIR",         "MANUAL",   "VATABLE",                 "4215","4515"],
  ["DLOD", "Lodgement Fee (DDU)",                     "DOCS",      "OCEAN,AIR",         "PER_FILE", "VATABLE",                 "4215","4515"],
];

let added = 0, skipped = 0;
for (const [code,description,category,modes,defaultUnit,vatClass,revenueAccount,costAccount] of allBilling) {
  await prisma.billingCode.upsert({
    where: { companyCode_code: { companyCode: KORNET, code } },
    update: { description, category, modes, defaultUnit, vatClass, revenueAccount, costAccount, glAccount: revenueAccount, taxable: vatClass === "VATABLE", active: true },
    create: { companyCode: KORNET, code, description, category, modes, defaultUnit, vatClass, revenueAccount, costAccount, glAccount: revenueAccount, taxable: vatClass === "VATABLE", active: true },
  });
  added++;
}

const total = await prisma.billingCode.count({ where: { companyCode: KORNET } });
console.log(`Upserted ${added} billing codes. Total in DB: ${total}`);

// Also ensure original carriers (ocean shipping lines) exist
const carriers = [
  ["MAEU","Maersk Line Philippines","MAEU"],
  ["MSCU","Mediterranean Shipping Company (MSC)","MSCU"],
  ["CMDU","CMA CGM Philippines","CMDU"],
  ["COSU","COSCO Shipping Lines","COSU"],
  ["EGLV","Evergreen Marine Corp.","EGLV"],
  ["ONEY","Ocean Network Express (ONE)","ONEY"],
  ["PAL","Philippine Airlines Cargo",null],
  ["CEBCARGO","Cebu Pacific Air Cargo",null],
  ["SIA","Singapore Airlines Cargo",null],
  ["KAL","Korean Air Cargo",null],
];
let cAdded = 0;
for (const [code,name,scac] of carriers) {
  const ex = await prisma.party.findFirst({ where: { companyCode: KORNET, code } });
  if (!ex) {
    const isOcean = !!scac && scac.length === 4;
    await prisma.party.create({ data: { companyCode: KORNET, code, name, isCarrier: true, isVendor: true, scac: scac || undefined, active: true } });
    cAdded++;
  }
}
console.log(`Added ${cAdded} missing ocean carrier parties`);

await prisma.$disconnect();
