import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const bc = await prisma.billingCode.findMany({ where: { companyCode: "KORNET" }, select: { code: true, description: true, vatClass: true }, orderBy: { code: "asc" } });
console.log("Billing codes (" + bc.length + "):");
bc.forEach(b => console.log("  " + b.code.padEnd(8) + " " + b.description.slice(0,42).padEnd(44) + " " + b.vatClass));
const airlines = await prisma.party.findMany({ where: { companyCode: "KORNET", isCarrier: true }, select: { code: true, name: true, iataCode: true }, orderBy: { name: "asc" } });
console.log("\nAirline carriers (" + airlines.filter(a=>a.iataCode).length + " with IATA code):");
airlines.filter(a=>a.iataCode).forEach(a => console.log("  " + (a.iataCode||"").padEnd(6) + " " + a.name.slice(0,50)));
await prisma.$disconnect();
