import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const bc = await p.billingCode.findMany({ where: { companyCode: "KORNET" }, orderBy: { code: "asc" } });
console.log("Total billing codes:", bc.length);
["OFRT","AFRT","THC","DOC","BLF","AWBF","ARR","DUT","BRK","TRK","TOF","DLOD","DBBK"].forEach(c => {
  const f = bc.find(b=>b.code===c);
  console.log(c.padEnd(8), f ? "OK - " + f.description.slice(0,35) : "MISSING");
});
await p.$disconnect();
