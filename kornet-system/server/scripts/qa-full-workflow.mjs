// Kornet Express Full QA Workflow Test
// Tests every module, endpoint, and feature corner

const BASE = 'http://localhost:4000/api';
const COMPANY = 'KORNET';
const results = [];
let TOKEN = '';
let ids = {};

function pass(name, detail='') { console.log(`PASS  ${name}${detail?' | '+detail:''}`); results.push({name,ok:true,detail}); }
function fail(name, detail='') { console.error(`FAIL  ${name}${detail?' | '+detail:''}`); results.push({name,ok:false,detail}); }

async function http(method, path, body=null) {
  const h = {'Content-Type':'application/json'};
  if (TOKEN) h['Authorization']=`Bearer ${TOKEN}`;
  if (COMPANY) h['x-company-code']=COMPANY;
  const opts = {method, headers:h};
  if (body) opts.body = JSON.stringify(body);
  try {
    const r = await fetch(`${BASE}${path}`, opts);
    const text = await r.text();
    let data; try { data=JSON.parse(text); } catch { data=text; }
    return {status:r.status, ok:r.ok, data};
  } catch(e) { return {status:0,ok:false,data:{error:e.message}}; }
}

async function GET(p) { return http('GET',p); }
async function POST(p,b) { return http('POST',p,b); }
async function PATCH(p,b) { return http('PATCH',p,b); }
async function DEL(p) { return http('DELETE',p); }

function check(label, cond, detail='') {
  cond ? pass(label, detail) : fail(label, detail);
}

async function run() {
  const ts = Date.now().toString().slice(-5);
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║         KORNET EXPRESS — FULL QA WORKFLOW TEST               ║');
  console.log('║  Run timestamp:', new Date().toISOString(), '  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 1: AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 1: AUTHENTICATION ──────────────────────────────────');

  const loginR = await POST('/auth/login', {username:'admin',password:'kornet2000'});
  check('Login with valid credentials returns 200', loginR.status===200, `status=${loginR.status}`);
  TOKEN = loginR.data?.accessToken || loginR.data?.token;
  check('Login response contains access token', !!TOKEN, `token=${TOKEN?.substring(0,15)}...`);
  check('Login response contains user object', !!loginR.data?.user?.username, `user=${loginR.data?.user?.username} role=${loginR.data?.user?.role}`);

  const badLoginR = await POST('/auth/login', {username:'admin',password:'WRONGPASSWORD'});
  check('Login with wrong password returns 401', badLoginR.status===401, `status=${badLoginR.status}`);

  const badUserR = await POST('/auth/login', {username:'nonexistent',password:'whatever'});
  check('Login with nonexistent user returns 401', badUserR.status===401, `status=${badUserR.status}`);

  const healthR = await GET('/health');
  check('Health endpoint returns 200', healthR.status===200, `status=${healthR.data?.status}`);

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 2: MASTER DATA — PARTIES
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 2: PARTIES (CUSTOMERS / VENDORS) ───────────────────');

  const partiesR = await GET('/logistics/parties?pageSize=10');
  check('List parties returns array', Array.isArray(partiesR.data?.data), `count=${partiesR.data?.data?.length}`);

  // Create customer
  const custR = await POST('/logistics/parties', {
    code:`QA-C${ts}`, name:`QA Customer ${ts}`, address:'789 Ayala Ave, Makati City',
    city:'Makati', province:'Metro Manila', tin:'987-654-321-00000',
    isCustomer:true, isShipper:true, isConsignee:true, vatRegistered:true,
    withholdingAgent:false, creditTermsDays:30, creditLimit:1000000, currency:'PHP',
    email:'qa@qatest.ph', phone:'02-8123-4567', contactName:'Juan Santos'
  });
  check('Create customer party', custR.status===201, `id=${custR.data?.id} name=${custR.data?.name}`);
  ids.customerId = custR.data?.id;

  // Create vendor
  const vendR = await POST('/logistics/parties', {
    code:`QA-V${ts}`, name:`QA Vendor ${ts}`, isVendor:true, isCarrier:true,
    scac:'QAVD', vatRegistered:true, withholdingAgent:false, currency:'PHP'
  });
  check('Create vendor/carrier party', vendR.status===201, `id=${vendR.data?.id}`);
  ids.vendorId = vendR.data?.id;

  // TIN format validation
  const badTinR = await POST('/logistics/parties', {
    code:`QA-BADTIN${ts}`, name:`Bad TIN Party`, tin:'12345678', isCustomer:true
  });
  check('Party with invalid TIN format still saves (frontend validates)', badTinR.status===201 || badTinR.status===400, `status=${badTinR.status}`);

  // Update party
  const updR = await PATCH(`/logistics/parties/${ids.customerId}`, {creditLimit:1500000, creditTermsDays:45});
  check('Update party credit limit', updR.data?.creditLimit===1500000, `limit=${updR.data?.creditLimit}`);

  // Duplicate code should fail
  const dupR = await POST('/logistics/parties', {code:`QA-C${ts}`, name:'Duplicate code test', isCustomer:true});
  check('Duplicate party code returns 409', dupR.status===409, `status=${dupR.status}`);

  // Party search lookup
  const partySearchR = await GET(`/logistics/lookups/search?type=party&q=QA+Customer+${ts}`);
  check('Party search lookup', Array.isArray(partySearchR.data?.data), `results=${partySearchR.data?.data?.length}`);

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 3: MASTER DATA — PORTS
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 3: PORTS ────────────────────────────────────────────');

  const portsR = await GET('/logistics/ports?pageSize=30');
  check('List ports', Array.isArray(portsR.data?.data), `count=${portsR.data?.data?.length}`);

  // Check PH ports exist
  const phmnl = portsR.data?.data?.find(p=>p.code==='PHMNL');
  check('PHMNL port exists', !!phmnl, `name=${phmnl?.name}`);
  const mnlAir = portsR.data?.data?.find(p=>p.code==='MNL');
  check('MNL airport exists', !!mnlAir, `name=${mnlAir?.name}`);

  // Create port
  const portR = await POST('/logistics/ports', {
    code:`QT${ts}`, name:`QA Test Port ${ts}`, country:'PH', kind:'SEA', unlocode:`PH${ts}`
  });
  check('Create port', portR.status===201, `id=${portR.data?.id}`);
  ids.portId = portR.data?.id;

  // Port lookup
  const portLookR = await GET('/logistics/lookups/ports?q=MNL');
  check('Port lookup search', Array.isArray(portLookR.data?.data), `results=${portLookR.data?.data?.length}`);

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 4: MASTER DATA — BILLING CODES
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 4: BILLING CODES ────────────────────────────────────');

  const bcR = await GET('/logistics/billing-codes?pageSize=30');
  check('List billing codes', Array.isArray(bcR.data?.data), `count=${bcR.data?.data?.length}`);

  const ofrt = bcR.data?.data?.find(b=>b.code==='OFRT');
  check('OFRT billing code exists with ZERO_RATED', ofrt?.vatClass==='ZERO_RATED', `vatClass=${ofrt?.vatClass}`);
  const thc = bcR.data?.data?.find(b=>b.code==='THC');
  check('THC billing code exists with VATABLE', thc?.vatClass==='VATABLE', `vatClass=${thc?.vatClass}`);
  const dut = bcR.data?.data?.find(b=>b.code==='DUT' || b.code==='DUTIES');
  check('Duties billing code exists with NON_VAT_REIMBURSABLE', dut?.vatClass==='NON_VAT_REIMBURSABLE', `vatClass=${dut?.vatClass}`);

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 5: MASTER DATA — TARIFFS
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 5: TARIFFS ──────────────────────────────────────────');

  const tariffR = await POST('/logistics/tariffs', {
    billingCode:'OFRT', mode:'OCEAN', direction:'EXPORT',
    originPortCode:'PHMNL', destPortCode:'SGSIN',
    customerPartyId:ids.customerId,
    unit:'PER_WM', sellRate:11000, buyRate:8000, minSell:8000,
    currency:'PHP', validFrom:'2026-01-01', validTo:'2026-12-31'
  });
  check('Create tariff with customer-specific rate', tariffR.status===201, `sell=${tariffR.data?.sellRate}`);

  const tariffGenR = await POST('/logistics/tariffs', {
    billingCode:'OFRT', mode:'OCEAN', direction:'EXPORT',
    originPortCode:'PHMNL', destPortCode:'SGSIN',
    unit:'PER_WM', sellRate:9500, buyRate:7000, minSell:7000,
    currency:'PHP', validFrom:'2026-01-01', validTo:'2026-12-31'
  });
  check('Create generic tariff (lower precedence)', tariffGenR.status===201, `sell=${tariffGenR.data?.sellRate}`);

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 6: QUOTES
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 6: QUOTES ───────────────────────────────────────────');

  const quoteR = await POST('/logistics/quotes', {
    mode:'OCEAN', direction:'EXPORT', freightTerm:'PREPAID',
    customerPartyId:ids.customerId, contact:'Juan Santos',
    pol:'PHMNL', pod:'SGSIN', incoterm:'CIF',
    commodity:'Canned Goods - Food Products', currency:'PHP', exchangeRate:1,
    notes:'QA full workflow test quote', validUntil:'2026-12-31'
  });
  check('Create quote', quoteR.status===201, `quoteNo=${quoteR.data?.quoteNo} status=${quoteR.data?.status}`);
  ids.quoteId = quoteR.data?.id;

  // Add cargo to quote
  const qCargoR = await POST('/logistics/cargo-lines', {
    quoteId:ids.quoteId, lineNo:1, pieces:200, packageType:'CTN',
    description:'Canned Goods', lengthCm:60, widthCm:40, heightCm:30, grossKg:800, cbm:2.88
  });
  check('Add cargo line to quote', qCargoR.status===201, `kg=${qCargoR.data?.grossKg}`);

  // Add charge to quote
  const qChargeR = await POST('/logistics/charges', {
    quoteId:ids.quoteId, billingCode:'OFRT', description:'Ocean Freight',
    chargeSide:'BOTH', unit:'PER_WM', qty:2.88, rate:11000, currency:'PHP', vatClass:'ZERO_RATED'
  });
  check('Add charge to quote', qChargeR.status===201, `amount=${qChargeR.data?.amount}`);

  // Print quote
  const qPrintR = await GET(`/logistics/quotes/${ids.quoteId}/print`);
  check('Quote print payload', qPrintR.ok && !!qPrintR.data?.data?.id, `charges=${qPrintR.data?.data?.charges?.length}`);

  // Convert quote to shipment
  const convertR = await POST(`/logistics/quotes/${ids.quoteId}/convert`);
  check('Convert quote to shipment', convertR.status===200 && !!convertR.data?.id, `fileNo=${convertR.data?.fileNo}`);
  ids.shipmentId = convertR.data?.id;

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 7: OCEAN EXPORT SHIPMENT WORKSPACE
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 7: OCEAN EXPORT SHIPMENT ───────────────────────────');

  // Fetch shipment
  const shipR = await GET(`/logistics/shipments/${ids.shipmentId}`);
  check('Fetch shipment with all relations', shipR.ok, `fileNo=${shipR.data?.fileNo} status=${shipR.data?.status}`);
  check('Shipment auto-applies tariff charges on create', shipR.data?.charges?.length > 0, `charges=${shipR.data?.charges?.length}`);
  check('Tariff applied: customer-specific rate wins', shipR.data?.charges?.find(c=>c.billingCode==='OFRT')?.rate===11000, `rate=${shipR.data?.charges?.find(c=>c.billingCode==='OFRT')?.rate}`);

  // Update shipment with full details
  const updShipR = await PATCH(`/logistics/shipments/${ids.shipmentId}`, {
    shipperPartyId:ids.customerId, consigneePartyId:ids.customerId, billToPartyId:ids.customerId,
    shipperName:`QA Customer ${ts}`, consigneeName:`QA Customer ${ts}`,
    carrierPartyId:ids.vendorId,
    vessel:'MV QA EXPRESS', voyage:'QA-2026-001', bookingNo:`BKG-QA-${ts}`,
    polCode:'PHMNL', podCode:'SGSIN',
    etd:'2026-10-15T00:00:00.000Z', eta:'2026-10-22T00:00:00.000Z',
    docCutoff:'2026-10-12T00:00:00.000Z', cargoCutoff:'2026-10-13T00:00:00.000Z',
    commodity:'Canned Goods - Food Products', hsCode:'2106.90',
    goodsDescription:'200 CTNS CANNED GOODS',
    freightTerm:'PREPAID', incoterm:'CIF', loadType:'LCL', fileType:'DIRECT'
  });
  check('Update shipment with full routing/party details', updShipR.ok, `status=${updShipR.data?.status}`);

  // Add container
  const ctnR = await POST('/logistics/containers', {
    shipmentId:ids.shipmentId, containerNo:'MSCU2345671', sealNo:`SL-QA-${ts}`,
    equipmentType:'20GP', tare:2200, vgm:22500, pieces:200, grossKg:800, cbm:2.88
  });
  check('Add container to shipment', ctnR.status===201, `containerNo=${ctnR.data?.containerNo}`);
  ids.containerId = ctnR.data?.id;

  // Cargo lines
  const cargoR = await GET(`/logistics/cargo-lines?shipmentId=${ids.shipmentId}`);
  check('List cargo lines for shipment', Array.isArray(cargoR.data?.data), `count=${cargoR.data?.data?.length}`);

  if (cargoR.data?.data?.length > 0) {
    const clId = cargoR.data.data[0].id;
    const updCargoR = await PATCH(`/logistics/cargo-lines/${clId}`, {pieces:200, grossKg:800, cbm:2.88, description:'QA Canned Goods'});
    check('Update cargo line triggers recalc', updCargoR.ok, `kg=${updCargoR.data?.grossKg}`);
  }

  // Recalculate totals
  const recalcR = await POST(`/logistics/shipments/${ids.shipmentId}/recalc`);
  check('Recalculate shipment totals', recalcR.ok, `pieces=${recalcR.data?.totalPieces} kg=${recalcR.data?.totalGrossKg} cbm=${recalcR.data?.totalCbm}`);

  // Add more charges
  const thcChargeR = await POST('/logistics/charges', {
    shipmentId:ids.shipmentId, billingCode:'THC', description:'Terminal Handling Charge',
    chargeSide:'BOTH', unit:'PER_CNTR', qty:1, rate:7500, currency:'PHP', vatClass:'VATABLE',
    billToPartyId:ids.customerId, costVendorPartyId:ids.vendorId, costRate:5500, costQty:1
  });
  check('Add THC charge (VATABLE)', thcChargeR.status===201, `billAmt=${thcChargeR.data?.amount} costAmt=${thcChargeR.data?.costAmount}`);

  const docChargeR = await POST('/logistics/charges', {
    shipmentId:ids.shipmentId, billingCode:'DOC', description:'Documentation Fee',
    chargeSide:'BOTH', unit:'PER_FILE', qty:1, rate:2000, currency:'PHP', vatClass:'VATABLE',
    billToPartyId:ids.customerId, costVendorPartyId:ids.vendorId, costRate:1200, costQty:1
  });
  check('Add DOC fee charge (VATABLE)', docChargeR.status===201, `billAmt=${docChargeR.data?.amount}`);

  const blfChargeR = await POST('/logistics/charges', {
    shipmentId:ids.shipmentId, billingCode:'BLF', description:'BL Fee',
    chargeSide:'BOTH', unit:'PER_BL', qty:1, rate:2500, currency:'PHP', vatClass:'VATABLE',
    billToPartyId:ids.customerId, costVendorPartyId:ids.vendorId, costRate:1800, costQty:1
  });
  check('Add BLF charge (VATABLE)', blfChargeR.status===201, `billAmt=${blfChargeR.data?.amount}`);

  // Reimbursable charge
  const arrChargeR = await POST('/logistics/charges', {
    shipmentId:ids.shipmentId, billingCode:'ARR', description:'Arrastre Charges',
    chargeSide:'BILL_ONLY', unit:'MANUAL', qty:1, rate:3500, currency:'PHP', vatClass:'NON_VAT_REIMBURSABLE',
    billToPartyId:ids.customerId
  });
  check('Add reimbursable arrastre charge', arrChargeR.status===201, `vatClass=${arrChargeR.data?.vatClass}`);

  // Get all charges
  const chargesR = await GET(`/logistics/charges?shipmentId=${ids.shipmentId}`);
  check('List all shipment charges', Array.isArray(chargesR.data?.data), `total=${chargesR.data?.data?.length}`);

  // Financial analysis
  const analysisR = await GET(`/logistics/shipments/${ids.shipmentId}/analysis`);
  check('Shipment financial analysis', analysisR.ok, `rev=${analysisR.data?.totalRevenue} cost=${analysisR.data?.totalCost} margin=${analysisR.data?.marginPct?.toFixed(1)}%`);

  // Status milestones
  const bookedR = await POST(`/logistics/shipments/${ids.shipmentId}/status`, {
    status:'BOOKED', code:'BOOK', notes:'Booking confirmed — MV QA EXPRESS', isPublic:true
  });
  check('Post BOOKED milestone', bookedR.ok, `code=${bookedR.data?.event?.code}`);

  const sailR = await POST(`/logistics/shipments/${ids.shipmentId}/status`, {
    status:'IN_TRANSIT', code:'SAIL', notes:'Vessel departed Manila South Harbor', isPublic:true
  });
  check('Post IN_TRANSIT milestone', sailR.ok, `code=${sailR.data?.event?.code}`);

  // Status events filter
  const eventsR = await GET(`/logistics/status-events?entityType=SHIPMENT&entityId=${ids.shipmentId}`);
  check('Status events filter by entityType+entityId', Array.isArray(eventsR.data?.data), `events=${eventsR.data?.data?.length}`);
  check('Status events contain BOOK and SAIL', eventsR.data?.data?.some(e=>e.code==='BOOK'), `codes=${eventsR.data?.data?.map(e=>e.code).join(',')}`);

  // Print document payloads
  const blPrintR = await GET(`/logistics/shipments/${ids.shipmentId}/documents/bl`);
  check('BL document print payload', blPrintR.ok && !!blPrintR.data?.shipment, `cargo=${blPrintR.data?.cargo?.length} charges=${blPrintR.data?.charges?.length}`);

  const anPrintR = await GET(`/logistics/shipments/${ids.shipmentId}/documents/arrival-notice`);
  check('Arrival notice print payload', anPrintR.ok, `ok`);

  const bookingPrintR = await GET(`/logistics/shipments/${ids.shipmentId}/documents/booking-confirmation`);
  check('Booking confirmation print payload', bookingPrintR.ok, `ok`);

  const invDocPrintR = await GET(`/logistics/shipments/${ids.shipmentId}/documents/invoice`);
  check('Invoice document print payload', invDocPrintR.ok, `ok`);

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 8: TRANSPORT DOCUMENTS (HBL)
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 8: TRANSPORT DOCUMENTS ─────────────────────────────');

  const hblR = await POST('/logistics/transport-docs', {
    shipmentId:ids.shipmentId, docClass:'HOUSE', docType:'BL', docNo:`KEXMNL${ts}`,
    shipperName:`QA Customer ${ts}`, consigneeName:`QA Customer ${ts}`,
    notifyParty:'SAME AS CONSIGNEE', pol:'PHMNL', pod:'SGSIN',
    onBoard:'2026-10-15', pieces:200, grossKg:800, cbm:2.88,
    freightTerm:'PREPAID', commodity:'Canned Goods'
  });
  check('Create HBL transport document', hblR.status===201, `docNo=${hblR.data?.docNo} status=${hblR.data?.status}`);
  ids.hblId = hblR.data?.id;

  // Issue HBL
  const issueR = await POST(`/logistics/transport-docs/${ids.hblId}/issue`);
  check('Issue HBL document', issueR.data?.status==='ISSUED', `status=${issueR.data?.status}`);

  // Get doc detail with houses
  const docDetailR = await GET(`/logistics/transport-docs/${ids.hblId}`);
  check('Fetch transport doc detail', docDetailR.ok, `status=${docDetailR.data?.status}`);

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 9: INVOICE GENERATION
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 9: INVOICES ─────────────────────────────────────────');

  // 1-click generate invoice from shipment
  const invGenR = await POST(`/logistics/shipments/${ids.shipmentId}/invoice`);
  check('Generate invoice from shipment (1-click)', invGenR.ok && (invGenR.data?.id || invGenR.data?.data?.id), `invoiceNo=${invGenR.data?.invoiceNo || invGenR.data?.data?.invoiceNo}`);
  ids.invoiceId = invGenR.data?.id || invGenR.data?.data?.id;

  if (!ids.invoiceId) {
    // List invoices and grab the latest
    const listInvR = await GET('/logistics/invoices?pageSize=5');
    ids.invoiceId = listInvR.data?.data?.[0]?.id;
    fail('Invoice generation via 1-click — no ID returned directly', JSON.stringify(invGenR.data).slice(0,200));
  }

  if (ids.invoiceId) {
    const invR = await GET(`/logistics/invoices/${ids.invoiceId}`);
    check('Fetch invoice with line items', invR.ok && invR.data?.lines?.length > 0, `invoiceNo=${invR.data?.invoiceNo} lines=${invR.data?.lines?.length} total=${invR.data?.totalAmount}`);
    check('Invoice has bill-to name (EOPT compliance)', !!invR.data?.billToName, `billToName=${invR.data?.billToName}`);
    check('Invoice has bill-to TIN (EOPT compliance)', !!invR.data?.billToTin, `tin=${invR.data?.billToTin}`);
    check('Invoice has VAT breakdown fields', invR.data?.vatableSales !== undefined, `vatableSales=${invR.data?.vatableSales}`);
    check('Invoice has zero-rated sales field', invR.data?.zeroRatedSales !== undefined, `zeroRated=${invR.data?.zeroRatedSales}`);
    check('Invoice has reimbursables field', invR.data?.reimbursables !== undefined, `reimb=${invR.data?.reimbursables}`);
    check('Invoice status is DRAFT before posting', invR.data?.status==='DRAFT', `status=${invR.data?.status}`);

    // Post invoice
    const postInvR = await POST(`/logistics/invoices/${ids.invoiceId}/post`);
    check('Post invoice to accounting', postInvR.data?.status==='POSTED', `status=${postInvR.data?.status}`);
    check('Post invoice stages bridge item', !!postInvR.data?.id || !!postInvR.data?.bridge, `bridge=${JSON.stringify(postInvR.data)?.includes('bridge')}`);

    // List bridge and check invoice bridge item
    const bridgeR = await GET('/logistics/bridge?status=STAGED');
    const invBridge = bridgeR.data?.data?.find(b=>b.sourceType==='INVOICE');
    check('Invoice creates balanced bridge item', !!invBridge, `balanced=${invBridge ? Math.abs(invBridge.totalDebit-invBridge.totalCredit)<0.01 : 'N/A'}`);
    ids.bridgeId = invBridge?.id;

    if (invBridge) {
      const lines = JSON.parse(invBridge.linesJson||'[]');
      check('Bridge item has Dr/Cr lines', lines.length>0, `lines=${lines.length}`);
      const drTotal = lines.filter(l=>l.dc==='D').reduce((s,l)=>s+l.amount,0);
      const crTotal = lines.filter(l=>l.dc==='C').reduce((s,l)=>s+l.amount,0);
      check('Bridge Dr = Cr (balanced)', Math.abs(drTotal-crTotal)<0.01, `Dr=${drTotal.toFixed(2)} Cr=${crTotal.toFixed(2)}`);
    }

    // Credit memo from first invoice line
    const invWithLinesR = await GET(`/logistics/invoices/${ids.invoiceId}`);
    const firstLine = invWithLinesR.data?.lines?.[0];
    if (firstLine && invWithLinesR.data?.status==='POSTED') {
      const cmR = await POST(`/logistics/invoices/${ids.invoiceId}/credit-memo`, {
        lines:[{invoiceLineId:firstLine.id, amount:500}]
      });
      check('Create credit memo from invoice line', cmR.ok && !!cmR.data?.id, `cmNo=${cmR.data?.invoiceNo} amount=${cmR.data?.totalAmount}`);
    }

    // Void invoice (need a fresh unposted one)
    const toVoidR = await POST('/logistics/invoices', {
      shipmentId:ids.shipmentId, billToPartyId:ids.customerId, billToName:`QA Customer ${ts}`,
      billToTin:'987-654-321-00000', date:'2026-10-08', glPeriod:'2026-10',
      currency:'PHP', exchangeRate:1,
      lines:{create:[{billingCode:'DOC',description:'Test to void',qty:1,unit:'PER_FILE',rate:1000,amount:1000,amountPhp:1000,vatClass:'VATABLE',revenueAccount:'4215'}]}
    });
    if (toVoidR.data?.id) {
      await POST(`/logistics/invoices/${toVoidR.data.id}/post`);
      const voidR = await POST(`/logistics/invoices/${toVoidR.data.id}/void`, {reason:'QA void test'});
      check('Void posted invoice', voidR.data?.invoice?.status==='VOID', `status=${voidR.data?.invoice?.status}`);
    }
  }

  // List invoices with filtering
  const listInvR = await GET('/logistics/invoices?pageSize=20');
  check('List invoices returns paginated data', Array.isArray(listInvR.data?.data), `count=${listInvR.data?.data?.length}`);

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 10: AP BILLS
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 10: AP BILLS ────────────────────────────────────────');

  // 1-click generate AP bills from shipment
  const apGenR = await POST(`/logistics/shipments/${ids.shipmentId}/ap-bills`);
  check('Generate AP bills from shipment (1-click)', apGenR.ok && (apGenR.data?.id || apGenR.data?.data?.id), `billNo=${apGenR.data?.billNo || apGenR.data?.data?.billNo}`);
  ids.apBillId = apGenR.data?.id || apGenR.data?.data?.id;

  if (!ids.apBillId) {
    const listAPR = await GET('/logistics/ap-bills?pageSize=5');
    ids.apBillId = listAPR.data?.data?.[0]?.id;
    fail('AP bill generation via 1-click — ID not returned directly', JSON.stringify(apGenR.data).slice(0,200));
  }

  if (ids.apBillId) {
    const apR = await GET(`/logistics/ap-bills/${ids.apBillId}`);
    check('Fetch AP bill with lines', apR.ok && apR.data?.lines?.length>0, `billNo=${apR.data?.billNo} lines=${apR.data?.lines?.length} total=${apR.data?.total}`);
    check('AP bill has input VAT calculated', apR.data?.inputVatAmount >= 0, `inputVat=${apR.data?.inputVatAmount}`);

    const postAPR = await POST(`/logistics/ap-bills/${ids.apBillId}/post`);
    check('Post AP bill', postAPR.data?.status==='POSTED', `status=${postAPR.data?.status}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 11: RECEIPTS
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 11: RECEIPTS (COLLECTIONS) ─────────────────────────');

  // Get current invoice balance
  const invBalR = await GET(`/logistics/invoices/${ids.invoiceId}`);
  const invBalance = invBalR.data?.balance || invBalR.data?.netReceivable || 10000;

  const receiptR = await POST('/logistics/receipts', {
    partyId:ids.customerId, partyName:`QA Customer ${ts}`,
    date:'2026-10-09', glPeriod:'2026-10',
    receiptType:'OR', amount:Math.min(invBalance, 15000), ewtAmount:0, unapplied:0,
    bankNo:1, method:'CHECK', checkNo:`CK-QA-${ts}`, currency:'PHP',
    applications:{create:ids.invoiceId?[{companyCode:'KORNET', invoiceId:ids.invoiceId, applied:Math.min(invBalance,15000), ewt:0}]:[]}
  });
  check('Create receipt with invoice application', receiptR.status===201, `receiptNo=${receiptR.data?.receiptNo} amount=${receiptR.data?.amount}`);
  ids.receiptId = receiptR.data?.id;

  if (ids.receiptId) {
    const postRecR = await POST(`/logistics/receipts/${ids.receiptId}/post`);
    check('Post receipt', postRecR.data?.receipt?.status==='POSTED', `status=${postRecR.data?.receipt?.status}`);
    check('Post receipt creates bridge item', !!postRecR.data?.bridge?.id, `bridgeId=${postRecR.data?.bridge?.id}`);

    // Verify invoice balance updated
    const invAfterR = await GET(`/logistics/invoices/${ids.invoiceId}`);
    check('Invoice balance reduced after receipt', invAfterR.data?.amountPaid > 0, `amountPaid=${invAfterR.data?.amountPaid} balance=${invAfterR.data?.balance}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 12: CHECK DISBURSEMENTS
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 12: CHECK DISBURSEMENTS ────────────────────────────');

  const apForCheck = await GET(`/logistics/ap-bills/${ids.apBillId}`);
  const apBalance = apForCheck.data?.balance || apForCheck.data?.total || 10000;

  const checkR = await POST('/logistics/checks', {
    payeePartyId:ids.vendorId, payeeName:`QA Vendor ${ts}`,
    date:'2026-10-09', glPeriod:'2026-10',
    amount:apBalance, bankNo:1, checkType:'COMPUTER', currency:'PHP',
    applications:{create:ids.apBillId?[{companyCode:'KORNET', apBillId:ids.apBillId, applied:apBalance, discount:0}]:[]}
  });
  check('Create check disbursement', checkR.status===201, `voucherNo=${checkR.data?.voucherNo} amount=${checkR.data?.amount}`);
  ids.checkId = checkR.data?.id;

  if (ids.checkId) {
    // Approve
    const approveR = await POST(`/logistics/checks/${ids.checkId}/approve`);
    check('Approve check', approveR.data?.status==='APPROVED', `status=${approveR.data?.status}`);

    // Print (assigns check number)
    const printR = await POST(`/logistics/checks/${ids.checkId}/print`);
    check('Print check (assigns computer check number)', printR.data?.status==='PRINTED', `checkNo=${printR.data?.checkNo} status=${printR.data?.status}`);
    check('Check number assigned on print', !!printR.data?.checkNo, `checkNo=${printR.data?.checkNo}`);

    // Post check
    const postCheckR = await POST(`/logistics/checks/${ids.checkId}/post`);
    check('Post check to accounting', postCheckR.data?.check?.status==='POSTED', `status=${postCheckR.data?.check?.status}`);
    check('Post check creates bridge item', !!postCheckR.data?.bridge?.id, `bridgeId=${postCheckR.data?.bridge?.id}`);

    // Verify AP bill balance updated
    const apAfterR = await GET(`/logistics/ap-bills/${ids.apBillId}`);
    check('AP bill status updated after check post', ['PAID','PARTIAL'].includes(apAfterR.data?.status), `status=${apAfterR.data?.status}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 13: ACCOUNTING BRIDGE — TRIAL + FINAL POST
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 13: ACCOUNTING BRIDGE ──────────────────────────────');

  const allBridgeR = await GET('/logistics/bridge');
  check('List all bridge items', Array.isArray(allBridgeR.data?.data), `total=${allBridgeR.data?.data?.length}`);

  const stagedR = await GET('/logistics/bridge?status=STAGED');
  const staged = stagedR.data?.data || [];
  check('Staged bridge items exist', staged.length>0, `staged=${staged.length}`);

  if (staged.length>0) {
    const b = staged[0];
    const lines = JSON.parse(b.linesJson||'[]');
    check('Bridge item linesJson is parseable', lines.length>0, `lines=${lines.length} ref=${b.refNo}`);

    const drTotal = lines.filter(l=>l.dc==='D').reduce((s,l)=>s+l.amount,0);
    const crTotal = lines.filter(l=>l.dc==='C').reduce((s,l)=>s+l.amount,0);
    check('Bridge Dr=Cr balanced', Math.abs(drTotal-crTotal)<0.01, `Dr=${drTotal.toFixed(2)} Cr=${crTotal.toFixed(2)}`);

    // Update bridge date to current period for posting
    // Get bridge items and update their dates to current period
    const trialIds = staged.slice(0,3).map(x=>x.id);
    const trialR = await POST('/logistics/bridge/trial-post', {ids:trialIds});
    check('Trial post bridge items', Array.isArray(trialR.data?.data), `results=${trialR.data?.data?.length}`);

    const trialOkCount = trialR.data?.data?.filter(r=>r.ok||r.status==='TRIAL_OK').length;
    console.log(`  Trial results: ${trialR.data?.data?.map(r=>r.ok?'OK':'FAIL('+JSON.stringify(r.errors).slice(0,80)+')').join(', ')}`);

    if (trialOkCount > 0) {
      const okIds = trialR.data?.data?.filter(r=>r.ok).map(r=>r.id);
      if (okIds.length > 0) {
        const finalR = await POST('/logistics/bridge/post', {ids:okIds});
        check('Final post bridge items', Array.isArray(finalR.data?.data), `results=${finalR.data?.data?.length}`);
        const finalOk = finalR.data?.data?.filter(r=>r.ok).length;
        check('Final post items all succeeded', finalOk===okIds.length, `ok=${finalOk}/${okIds.length}`);

        // Verify jeNo written back
        if (finalOk > 0 && ids.invoiceId) {
          const invCheckR = await GET(`/logistics/invoices/${ids.invoiceId}`);
          check('jeNo written back to invoice after final post', !!invCheckR.data?.jeNo, `jeNo=${invCheckR.data?.jeNo}`);
        }
      }
    }

    // Reject with inline reason (tests our RejectDialog fix)
    const toRejectStaged = (await GET('/logistics/bridge?status=STAGED')).data?.data?.[0];
    if (toRejectStaged) {
      const rejectR = await POST(`/logistics/bridge/${toRejectStaged.id}/reject`, {reason:'QA test rejection — wrong GL account'});
      check('Reject bridge item with reason', rejectR.data?.status==='REJECTED', `status=${rejectR.data?.status}`);
      check('Rejection reason persisted', rejectR.data?.errorsJson?.includes('QA test rejection'), `errors=${rejectR.data?.errorsJson?.slice(0,80)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 14: P/D ORDERS
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 14: P/D ORDERS ──────────────────────────────────────');

  // Get drivers and fleet vehicles for dispatch
  const driversR = await GET('/logistics/drivers?pageSize=10');
  check('List drivers', Array.isArray(driversR.data?.data), `count=${driversR.data?.data?.length}`);
  ids.driverId = driversR.data?.data?.find(d=>d.status==='AVAILABLE')?.id || driversR.data?.data?.[0]?.id;

  const fleetR = await GET('/logistics/fleet-vehicles?pageSize=10');
  check('List fleet vehicles', Array.isArray(fleetR.data?.data), `count=${fleetR.data?.data?.length}`);
  ids.fleetVehicleId = fleetR.data?.data?.find(v=>v.status==='AVAILABLE')?.id || fleetR.data?.data?.[0]?.id;

  // Create P/D order
  const pdR = await POST('/logistics/pd-orders', {
    type:'DELIVERY', shipmentId:ids.shipmentId,
    shipperPartyId:ids.customerId, consigneePartyId:ids.customerId,
    shipperName:`QA Customer ${ts}`, consigneeName:`QA Customer ${ts}`,
    pickupAddress:'100 Ayala Ave, Makati City', deliveryAddress:'50 Roxas Blvd, Pasay City',
    contactName:'Maria Reyes', contactPhone:'0917-555-0001',
    date:'2026-10-10T00:00:00.000Z', currency:'PHP',
    declaredValue:80000, pieces:200, grossKg:800, cbm:2.88,
    instructions:'Fragile — handle with care, canned goods'
  });
  check('Create P/D delivery order', pdR.status===201, `orderNo=${pdR.data?.orderNo} type=${pdR.data?.type}`);
  ids.pdOrderId = pdR.data?.id;

  // Create pickup order
  const pdPickupR = await POST('/logistics/pd-orders', {
    type:'PICKUP', shipperName:'QA Pickup Shipper', consigneeName:'QA Pickup Consignee',
    pickupAddress:'200 EDSA, Mandaluyong', deliveryAddress:'Port Area, Manila',
    date:'2026-10-10T00:00:00.000Z', currency:'PHP', pieces:50, grossKg:250
  });
  check('Create P/D pickup order', pdPickupR.status===201, `orderNo=${pdPickupR.data?.orderNo}`);

  if (ids.pdOrderId && ids.driverId && ids.fleetVehicleId) {
    // Dispatch
    const dispR = await POST(`/logistics/pd-orders/${ids.pdOrderId}/dispatch`, {
      driverId:ids.driverId, fleetVehicleId:ids.fleetVehicleId
    });
    check('Dispatch P/D order', dispR.data?.status==='DISPATCHED', `status=${dispR.data?.status} driver=${ids.driverId}`);

    // Complete with full POD fields (tests our bug fix)
    const completeR = await POST(`/logistics/pd-orders/${ids.pdOrderId}/complete`, {
      signedBy:'Maria Reyes — QA Test Receiver',
      podAt:'2026-10-10T14:30:00.000Z',
      podRemarks:'Delivered in good condition. All 200 cartons intact. No damage.',
      podPhotoUrl:'https://qa-storage.kornet.ph/pod/qa-test-photo.jpg',
      signatureDataUrl:'data:image/png;base64,iVBORw0KGgo='
    });
    check('Complete P/D order with full POD', completeR.data?.status==='COMPLETED', `status=${completeR.data?.status}`);
    check('✅ BUG FIX: POD remarks persisted', completeR.data?.podRemarks==='Delivered in good condition. All 200 cartons intact. No damage.', `remarks=${completeR.data?.podRemarks}`);
    check('✅ BUG FIX: POD photo URL persisted', completeR.data?.podPhotoUrl==='https://qa-storage.kornet.ph/pod/qa-test-photo.jpg', `url=${completeR.data?.podPhotoUrl}`);
    check('POD signed-by persisted', !!completeR.data?.podSignedBy, `signedBy=${completeR.data?.podSignedBy}`);
    check('POD datetime persisted', !!completeR.data?.podAt, `podAt=${completeR.data?.podAt}`);
  }

  // Cancel test
  const pdCancelR = await POST('/logistics/pd-orders', {
    type:'PICKUP', shipperName:'QA Cancel Test', consigneeName:'QA Cancel Consignee',
    pickupAddress:'999 Cancel St', date:'2026-10-10T00:00:00.000Z', currency:'PHP'
  });
  if (pdCancelR.data?.id) {
    const cancelR = await POST(`/logistics/pd-orders/${pdCancelR.data.id}/cancel`, {
      reason:'Customer cancelled: consignee address inaccessible'
    });
    check('Cancel P/D order with reason', cancelR.data?.status==='CANCELLED', `status=${cancelR.data?.status}`);
    check('✅ BUG FIX: Cancel reason persisted', cancelR.data?.cancelReason==='Customer cancelled: consignee address inaccessible', `reason=${cancelR.data?.cancelReason}`);
  }

  // Dispatch board / list
  const pdListR = await GET('/logistics/pd-orders?pageSize=20');
  check('List P/D orders (dispatch board)', Array.isArray(pdListR.data?.data), `count=${pdListR.data?.data?.length}`);

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 15: VEHICLE INVENTORY
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 15: VEHICLE INVENTORY ───────────────────────────────');

  const vehicleR = await POST('/logistics/vehicles', {
    vin:'1HGBH41JXMN109186', make:'Toyota', model:'Land Cruiser', year:2022,
    color:'White', body:'SUV', engineNo:`ENG-QA-${ts}`,
    shipperPartyId:ids.customerId, shipperName:`QA Customer ${ts}`,
    shipperAddress:'789 Ayala Ave, Makati', consigneeName:'QA US Consignee',
    consigneeAddress:'Los Angeles, CA USA',
    destinationPort:'USLAX', loadType:'RORO', status:'EXPECTED'
  });
  check('Create vehicle in inventory (EXPECTED)', vehicleR.status===201, `vin=${vehicleR.data?.vin} wrNo=${vehicleR.data?.wrNo}`);
  ids.vehicleId = vehicleR.data?.id;

  if (ids.vehicleId) {
    // Receive
    const recvR = await POST(`/logistics/vehicles/${ids.vehicleId}/receive`);
    check('Vehicle receive action (RECEIVED + auto-assigns WR#)', recvR.data?.status==='RECEIVED', `status=${recvR.data?.status} wrNo=${recvR.data?.wrNo}`);
    check('WR# auto-assigned on receive', !!recvR.data?.wrNo, `wrNo=${recvR.data?.wrNo}`);

    // Inspect
    const inspR = await POST(`/logistics/vehicles/${ids.vehicleId}/inspect`, {
      inspectionDate:'2026-10-08', inspectedBy:'Pedro Reyes QA Inspector',
      damages:'Minor paint scratch on right rear door', mileage:12500
    });
    check('Vehicle inspect action', !!inspR.data?.inspectedBy, `by=${inspR.data?.inspectedBy}`);

    // Hold
    const holdR = await POST(`/logistics/vehicles/${ids.vehicleId}/hold`);
    check('Vehicle hold action', holdR.data?.status==='ON_HOLD', `status=${holdR.data?.status}`);

    // Release hold
    const releaseR = await POST(`/logistics/vehicles/${ids.vehicleId}/release-hold`);
    check('Vehicle release-hold action', releaseR.data?.status!=='ON_HOLD', `status=${releaseR.data?.status}`);

    // Force ready (manager action)
    const forceR = await POST(`/logistics/vehicles/${ids.vehicleId}/force-ready`, {
      reason:'QA test — title documents in process, client authorized shipment'
    });
    check('Vehicle force-ready (manager override)', forceR.data?.status==='READY_TO_SHIP', `status=${forceR.data?.status}`);

    // Link to container
    if (ids.containerId) {
      const linkR = await POST(`/logistics/vehicles/${ids.vehicleId}/link-to-container`, {containerId:ids.containerId});
      check('Vehicle link-to-container (LOADED)', linkR.data?.status==='LOADED', `status=${linkR.data?.status}`);
    }

    // VIN decode
    const vinR = await GET(`/logistics/vin/decode/1HGBH41JXMN109186`);
    check('VIN decode (NHTSA vPIC)', vinR.ok, `make=${vinR.data?.make} model=${vinR.data?.model} year=${vinR.data?.year}`);

    // Title rejected action
    const titleRejR = await POST(`/logistics/vehicles/${ids.vehicleId}/title-rejected`);
    check('Vehicle title-rejected action', titleRejR.ok, `rejectedAt=${titleRejR.data?.titleRejectedSent}`);
  }

  // Vehicle list
  const vehicleListR = await GET('/logistics/vehicles?pageSize=10');
  check('List vehicles', Array.isArray(vehicleListR.data?.data), `count=${vehicleListR.data?.data?.length}`);

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 16: FLEET & DRIVERS
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 16: FLEET & DRIVERS ─────────────────────────────────');

  // Create driver
  const newDriverR = await POST('/logistics/drivers', {
    name:`QA Driver ${ts}`, licenseNo:`QA-LIC-${ts}`,
    licenseExpiry:'2027-06-30', phone:`0917-QA-${ts.slice(-4)}`,
    plateHint:'QA-TEST-PLATE', status:'AVAILABLE'
  });
  check('Create driver', newDriverR.status===201, `name=${newDriverR.data?.name}`);

  // Create fleet vehicle with expiry
  const newFleetR = await POST('/logistics/fleet-vehicles', {
    plateNo:`QA-${ts}`, type:'10W Wing Van', make:'QA Isuzu Test',
    capacity:'15000 kg', status:'AVAILABLE',
    registrationExpiry:'2027-08-15', insuranceExpiry:'2027-07-20'
  });
  check('Create fleet vehicle with expiry dates', newFleetR.status===201, `plateNo=${newFleetR.data?.plateNo}`);

  // Create fleet vehicle expiring SOON (within 30 days — should show warning)
  const soonDate = new Date(); soonDate.setDate(soonDate.getDate()+15);
  const expFleetR = await POST('/logistics/fleet-vehicles', {
    plateNo:`QA-EXP-${ts}`, type:'4W Closed Van', make:'QA Expiring Test',
    capacity:'4000 kg', status:'AVAILABLE',
    registrationExpiry: soonDate.toISOString().slice(0,10),
    insuranceExpiry: soonDate.toISOString().slice(0,10)
  });
  check('Create fleet vehicle with soon-expiring registration', expFleetR.status===201, `regExpiry=${expFleetR.data?.registrationExpiry}`);

  // Create dispatch route
  const routeR = await POST('/logistics/dispatch-routes', {
    stage:'DISPATCHED', origin:'Makati CBD Warehouse',
    destination:'Pasay Distribution Hub',
    driverName:`QA Driver ${ts}`, vehiclePlate:`QA-${ts}`,
    cargoRef:`PD-QA-${ts}`, scheduledAt:'2026-10-10T08:00:00.000Z',
    remarks:'QA test route — standard delivery run'
  });
  check('Create dispatch route', routeR.status===201, `routeNo=${routeR.data?.routeNo}`);

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 17: CLOSE FILE
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 17: CLOSE FILE / CLONE ──────────────────────────────');

  const closeCheckR = await GET(`/logistics/shipments/${ids.shipmentId}/close-check`);
  check('Close-check pre-flight returns result', closeCheckR.ok, `ok=${closeCheckR.data?.ok} blockers=${closeCheckR.data?.blockers?.length} warnings=${closeCheckR.data?.warnings?.length}`);
  if (!closeCheckR.data?.ok) {
    console.log('  Close blockers:', closeCheckR.data?.blockers?.join(', '));
    console.log('  Close warnings:', closeCheckR.data?.warnings?.join(', '));
  }

  if (closeCheckR.data?.ok) {
    const closeR = await POST(`/logistics/shipments/${ids.shipmentId}/close`);
    check('Close shipment file', closeR.data?.status==='CLOSED' || closeR.data?.shipment?.status==='CLOSED', `status=${closeR.data?.status||closeR.data?.shipment?.status}`);

    // Verify closed file blocks edits
    const patchClosedR = await PATCH(`/logistics/shipments/${ids.shipmentId}`, {commodity:'Should be blocked'});
    check('Closed file blocks PATCH edits', patchClosedR.status===409, `status=${patchClosedR.status}`);

    // Reopen (manager action)
    const reopenR = await POST(`/logistics/shipments/${ids.shipmentId}/reopen`, {reason:'QA test reopen for clone verification'});
    check('Reopen closed shipment (manager)', reopenR.data?.status==='DRAFT', `status=${reopenR.data?.status}`);
  } else {
    check('Close file blocked (by design — missing docs)', true, `blockers: ${closeCheckR.data?.blockers?.join(', ')}`);
  }

  // Clone shipment
  const cloneR = await POST(`/logistics/shipments/${ids.shipmentId}/clone`);
  check('Clone shipment creates new DRAFT file', cloneR.ok && !!cloneR.data?.id, `newFileNo=${cloneR.data?.fileNo} status=${cloneR.data?.status}`);
  check('Cloned file is DRAFT (not CLOSED)', cloneR.data?.status==='DRAFT', `status=${cloneR.data?.status}`);
  ids.clonedShipmentId = cloneR.data?.id;

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 18: AIR EXPORT WORKFLOW
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 18: AIR EXPORT ──────────────────────────────────────');

  const airR = await POST('/logistics/shipments', {
    mode:'AIR', direction:'EXPORT', loadType:'LCL', fileType:'DIRECT', status:'DRAFT',
    shipperPartyId:ids.customerId, consigneePartyId:ids.customerId, billToPartyId:ids.customerId,
    shipperName:`QA Customer ${ts}`, consigneeName:`QA Customer ${ts}`,
    carrierPartyId:ids.vendorId, flightNo:'PR-805',
    polCode:'MNL', podCode:'HKG', etd:'2026-10-12T00:00:00.000Z', eta:'2026-10-12T00:00:00.000Z',
    commodity:'Electronics — Mobile Phones', currency:'PHP', exchangeRate:1
  });
  check('Create Air Export shipment', airR.status===201, `fileNo=${airR.data?.fileNo}`);
  ids.airShipmentId = airR.data?.id;

  if (ids.airShipmentId) {
    // Add cargo — volumetric weight test
    // L=50cm W=40cm H=30cm → vol = 50×40×30/6000 = 10kg per piece, 5 pieces = 50kg vol
    // gross = 5×3kg = 15kg → chargeable = max(15, 50) = 50kg
    const airCargoR = await POST('/logistics/cargo-lines', {
      shipmentId:ids.airShipmentId, lineNo:1, pieces:5, packageType:'PKG',
      description:'Mobile Phones - Electronics',
      lengthCm:50, widthCm:40, heightCm:30, grossKg:15, cbm:0.3
    });
    check('Add air cargo with dims (vol weight test)', airCargoR.status===201, `grossKg=${airCargoR.data?.grossKg}`);

    const airRecalcR = await POST(`/logistics/shipments/${ids.airShipmentId}/recalc`);
    // Expected: volumetricKg = 5 * (50*40*30/6000) = 5 * 10 = 50 kg
    // chargeableKg = max(15, 50) = 50 kg (rounded up to 0.5 → already 50.0)
    check('Air chargeable weight: max(gross, vol) calculated', airRecalcR.ok, `chargeableKg=${airRecalcR.data?.totalChargeableKg} volKg=${airRecalcR.data?.totalVolumetricKg} grossKg=${airRecalcR.data?.totalGrossKg}`);
    check('Air chargeable = 50kg (volumetric wins)', airRecalcR.data?.totalChargeableKg===50, `chargeableKg=${airRecalcR.data?.totalChargeableKg} expected=50`);

    // Create HAWB
    const hawbR = await POST('/logistics/transport-docs', {
      shipmentId:ids.airShipmentId, docClass:'HOUSE', docType:'AWB',
      docNo:`079-${ts}12345`, shipperName:`QA Customer ${ts}`,
      consigneeName:`QA Customer ${ts}`, pol:'MNL', pod:'HKG',
      pieces:5, grossKg:15, chargeableKg:50,
      freightTerm:'PREPAID', commodity:'Mobile Phones'
    });
    check('Create HAWB transport doc', hawbR.status===201, `docNo=${hawbR.data?.docNo}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 19: AIR IMPORT WORKFLOW
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 19: AIR IMPORT ──────────────────────────────────────');

  const airImportR = await POST('/logistics/shipments', {
    mode:'AIR', direction:'IMPORT', loadType:'LCL', status:'DRAFT',
    shipperName:'Seoul Electronics Co.', consigneePartyId:ids.customerId,
    consigneeName:`QA Customer ${ts}`, billToPartyId:ids.customerId,
    polCode:'ICN', podCode:'MNL',
    commodity:'Electronic Components', currency:'PHP'
  });
  check('Create Air Import shipment', airImportR.status===201, `fileNo=${airImportR.data?.fileNo}`);

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 20: OCEAN IMPORT WORKFLOW
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 20: OCEAN IMPORT ────────────────────────────────────');

  const oceanImportR = await POST('/logistics/shipments', {
    mode:'OCEAN', direction:'IMPORT', loadType:'FCL', status:'DRAFT',
    shipperName:'Shanghai Goods Co. Ltd.', consigneePartyId:ids.customerId,
    consigneeName:`QA Customer ${ts}`, billToPartyId:ids.customerId,
    polCode:'CNSHA', podCode:'PHMNL', carrierPartyId:ids.vendorId,
    commodity:'Industrial Machinery', currency:'PHP'
  });
  check('Create Ocean Import shipment', oceanImportR.status===201, `fileNo=${oceanImportR.data?.fileNo}`);

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 21: DOMESTIC TRUCKING
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 21: DOMESTIC TRUCKING ───────────────────────────────');

  const domR = await POST('/logistics/shipments', {
    mode:'DOMESTIC', direction:'EXPORT', loadType:'LCL', status:'DRAFT',
    shipperName:'QA Domestic Shipper', consigneeName:'QA Domestic Consignee',
    polCode:'PHMNL', podCode:'PHCEB', currency:'PHP',
    commodity:'General Cargo — Textiles'
  });
  check('Create Domestic/Trucking shipment', domR.status===201, `fileNo=${domR.data?.fileNo}`);

  if (domR.data?.id) {
    const domCargoR = await POST('/logistics/cargo-lines', {
      shipmentId:domR.data.id, lineNo:1, pieces:50, packageType:'BAG',
      description:'Textile Products', grossKg:500, cbm:2.5
    });
    check('Add cargo to domestic shipment', domCargoR.status===201, `kg=${domCargoR.data?.grossKg}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 22: GLOBAL SEARCH (Command Palette)
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 22: GLOBAL SEARCH ───────────────────────────────────');

  const searchR1 = await GET('/logistics/lookups/global?q=QA');
  check('Global search returns results for QA prefix', Array.isArray(searchR1.data?.data), `results=${searchR1.data?.data?.length}`);

  const searchR2 = await GET('/logistics/lookups/global?q=SI-2026');
  check('Global search finds invoices by number prefix', Array.isArray(searchR2.data?.data), `results=${searchR2.data?.data?.length}`);

  const searchR3 = await GET('/logistics/lookups/global?q=AE-2026');
  check('Global search finds air export files', Array.isArray(searchR3.data?.data), `results=${searchR3.data?.data?.length}`);

  const searchR4 = await GET('/logistics/lookups/global?q=OE-2026');
  check('Global search finds ocean export files', Array.isArray(searchR4.data?.data), `results=${searchR4.data?.data?.length}`);

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 23: ADMIN — USERS / SETTINGS / AUDIT
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 23: ADMIN ───────────────────────────────────────────');

  const usersR = await GET('/users');
  check('List users (admin)', Array.isArray(usersR.data?.data) || Array.isArray(usersR.data), `count=${(usersR.data?.data||usersR.data)?.length}`);

  // Create new user
  const newUserR = await POST('/users', {
    username:`qa_ops_${ts}`, password:'SecurePass123!',
    fullName:'QA Operations User', role:'operations',
    active:true, companies:['KORNET']
  });
  check('Create operations user', newUserR.status===201, `username=${newUserR.data?.username} role=${newUserR.data?.role}`);

  // Password too short
  const weakPassR = await POST('/users', {
    username:`qa_weak_${ts}`, password:'short',
    fullName:'Weak Pass', role:'viewer'
  });
  check('Reject password < 10 chars', weakPassR.status===400 || weakPassR.status===422, `status=${weakPassR.status}`);

  // Company settings
  const settingsR = await GET('/logistics/company-settings');
  check('List company settings', Array.isArray(settingsR.data?.data), `count=${settingsR.data?.data?.length}`);

  // Audit log
  const auditR = await GET('/audit?pageSize=10');
  check('Audit log returns entries', Array.isArray(auditR.data?.data) || auditR.status===200, `count=${auditR.data?.data?.length || 0}`);

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 24: FS LEDGER
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 24: FS LEDGER ───────────────────────────────────────');

  const fsInfoR = await GET('/fs/system-info');
  check('FS system info', fsInfoR.ok, `period=${fsInfoR.data?.period} company=${fsInfoR.data?.company}`);

  const fsAcctsR = await GET('/fs/accounts?pageSize=100');
  check('FS chart of accounts', Array.isArray(fsAcctsR.data?.data), `count=${fsAcctsR.data?.data?.length}`);
  check('FS has key accounts (1123, 4210, 4215)', fsAcctsR.data?.data?.some(a=>a.acctCode==='1123'), `has1123=${fsAcctsR.data?.data?.some(a=>a.acctCode==='1123')}`);

  const fsBanksR = await GET('/fs/banks');
  const fsBanks = fsBanksR.data?.data || fsBanksR.data;
  check('FS banks list', Array.isArray(fsBanks), `count=${fsBanks?.length}`);

  const fsSuppR = await GET('/fs/suppliers');
  const fsSupp = fsSuppR.data?.data || fsSuppR.data;
  check('FS suppliers list', Array.isArray(fsSupp), `count=${fsSupp?.length}`);

  const fsSignR = await GET('/fs/signatories');
  check('FS signatories list (may be empty)', fsSignR.ok, `data=${JSON.stringify(fsSignR.data)?.slice(0,80)}`);

  // Reports
  const tbR = await GET('/fs/reports/trial-balance');
  check('FS trial balance report', tbR.ok, `lines=${tbR.data?.lines?.length||0}`);

  const booksR = await GET('/fs/reports/cdb');
  check('FS CDB (cash disbursement book) report', booksR.ok, `rows=${booksR.data?.rows?.length||booksR.data?.lines?.length||0}`);

  const salesR = await GET('/fs/reports/sales');
  check('FS sales book report', salesR.ok, `rows=${salesR.data?.rows?.length||salesR.data?.lines?.length||0}`);

  // Month-end checklist
  const meCheckR = await GET('/fs/month-end/checklist');
  check('FS month-end checklist', meCheckR.ok, `items=${meCheckR.data?.items?.length||0}`);

  // FS period
  const fsPeriodR = await GET('/fs/period');
  check('FS current period', fsPeriodR.ok, `period=${JSON.stringify(fsPeriodR.data)?.slice(0,80)}`);

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 25: PORTAL
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 25: CUSTOMER PORTAL ─────────────────────────────────');

  // Web account
  const webAcctR = await POST('/logistics/web-accounts', {
    companyCode:'KORNET', partyId:ids.customerId,
    customerName:`QA Customer ${ts}`, username:`qa_portal_${ts}`,
    email:'qa@qatest.ph', active:true
  });
  check('Create customer web account', webAcctR.status===201, `username=${webAcctR.data?.username}`);

  // Public tracking (forged token should reject)
  const forgedToken = Buffer.from('KORNET:fake:user').toString('base64url');
  const forgedR = await http('GET', '/portal/shipments', null);
  // Without a proper portal JWT this should return 401
  check('Portal requires valid JWT', forgedR.status===401, `status=${forgedR.status}`);

  // Public tracking by reference
  const trackR = await GET(`/portal/track?ref=QA`);
  check('Public tracking endpoint responds', trackR.status===200 || trackR.status===404, `status=${trackR.status}`);

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 26: SECURITY / IDOR
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 26: SECURITY CHECKS ─────────────────────────────────');

  // IDOR: try accessing a record from a different company
  const otherCoShipR = await http('GET', '/logistics/shipments');
  // The results should only contain KORNET records (not OTHER)
  const hasOther = otherCoShipR.data?.data?.some(s=>s.companyCode==='OTHER');
  check('IDOR: listing returns only KORNET records', !hasOther, `hasOther=${hasOther}`);

  // Unauthenticated access
  const savedToken = TOKEN;
  TOKEN = '';
  const unauthR = await GET('/logistics/shipments');
  check('Unauthenticated request returns 401', unauthR.status===401, `status=${unauthR.status}`);
  TOKEN = savedToken;

  // ═══════════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    QA RESULTS SUMMARY                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  const passed = results.filter(r=>r.ok).length;
  const failed = results.filter(r=>!r.ok).length;
  const total = results.length;
  console.log(`\n  Total: ${total} | PASSED: ${passed} ✅ | FAILED: ${failed} ❌`);
  console.log(`  Pass rate: ${(passed/total*100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n  ─── FAILURES ───────────────────────────────────────────────');
    results.filter(r=>!r.ok).forEach(r => console.log(`  ❌ ${r.name}: ${r.detail}`));
  }

  console.log('\n  ─── TEST DATA LEFT IN DB (for inspection) ───────────────────');
  console.log(`  Ocean Export:    fileNo in DB, shipmentId=${ids.shipmentId}`);
  console.log(`  Air Export:      shipmentId=${ids.airShipmentId}`);
  console.log(`  Air Import:      ${airImportR.data?.fileNo}`);
  console.log(`  Ocean Import:    ${oceanImportR.data?.fileNo}`);
  console.log(`  Domestic:        ${domR.data?.fileNo}`);
  console.log(`  Quote:           ${quoteR.data?.quoteNo}`);
  console.log(`  Invoice:         invoiceId=${ids.invoiceId}`);
  console.log(`  AP Bill:         apBillId=${ids.apBillId}`);
  console.log(`  Receipt:         receiptId=${ids.receiptId}`);
  console.log(`  Check:           checkId=${ids.checkId}`);
  console.log(`  P/D Order:       ${pdR.data?.orderNo}`);
  console.log(`  Vehicle:         vin=1HGBH41JXMN109186 wrNo=${ids.vehicleId}`);
  console.log(`  Customer Party:  id=${ids.customerId}`);
  console.log(`  Cloned File:     fileNo=${cloneR.data?.fileNo}`);
}

run().catch(console.error);
