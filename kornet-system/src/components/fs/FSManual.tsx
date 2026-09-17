import { useState, useCallback } from 'react'
import PageHeader from '../PageHeader'

// ─── Sections ────────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'overview',  icon: 'dashboard',      title: 'How the System Works',        color: 'text-blue-600' },
  { id: 'glossary',  icon: 'menu_book',       title: 'Glossary of Terms',           color: 'text-slate-600' },
  { id: 'cdv',       icon: 'receipt_long',    title: 'Check Disbursement (CDV)',    color: 'text-violet-600' },
  { id: 'advance',   icon: 'forward_to_inbox','title': 'Advance CDB',               color: 'text-amber-600' },
  { id: 'transfer',  icon: 'compare_arrows',  title: 'Transfer Advance CDB',        color: 'text-emerald-600' },
  { id: 'post',      icon: 'publish',         title: 'Post All Transactions',       color: 'text-sky-600' },
  { id: 'monthend',  icon: 'lock_clock',      title: 'Month-End Processing',        color: 'text-red-600' },
  { id: 'journals',  icon: 'receipt',         title: 'Journal Vouchers',            color: 'text-indigo-600' },
  { id: 'receipts',  icon: 'payments',        title: 'Cash Receipts & Sales Book',  color: 'text-teal-600' },
  { id: 'backup',    icon: 'save',            title: 'Backing Up Your Data',        color: 'text-orange-600' },
  { id: 'faq',       icon: 'help',            title: 'Common Questions',            color: 'text-pink-600' },
]

// ─── Scroll helper ────────────────────────────────────────────────────────────
function useScroll() {
  return useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])
}

// ─── Reusable: clickable glossary term (Wikipedia-style) ─────────────────────
function T({ to, children }: { to: string; children: React.ReactNode }) {
  const scroll = useScroll()
  return (
    <button
      onClick={() => scroll(to)}
      className="text-primary font-medium underline decoration-dotted underline-offset-2 hover:decoration-solid hover:text-primary/80 transition-colors cursor-pointer"
    >
      {children}
    </button>
  )
}

// ─── Glossary term anchor (the target) ───────────────────────────────────────
function GlossaryTerm({ id, term, children }: { id: string; term: string; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-4 border-b border-outline-variant/10 pb-4 last:border-0 last:pb-0">
      <p className="font-bold text-on-surface text-sm mb-1">{term}</p>
      <p className="text-sm text-on-surface-variant leading-relaxed">{children}</p>
    </div>
  )
}

// ─── Callout boxes ────────────────────────────────────────────────────────────
type CalloutType = 'info' | 'warning' | 'danger' | 'tip'
function Callout({ type, title, children }: { type: CalloutType; title?: string; children: React.ReactNode }) {
  const styles: Record<CalloutType, { bg: string; icon: string; text: string }> = {
    info:    { bg: 'bg-blue-50 border-blue-200',       icon: 'info',      text: 'text-blue-800' },
    warning: { bg: 'bg-amber-50 border-amber-200',     icon: 'warning',   text: 'text-amber-800' },
    danger:  { bg: 'bg-red-50 border-red-200',         icon: 'error',     text: 'text-red-700' },
    tip:     { bg: 'bg-emerald-50 border-emerald-200', icon: 'lightbulb', text: 'text-emerald-800' },
  }
  const s = styles[type]
  return (
    <div className={`flex gap-3 px-4 py-3.5 rounded-xl border my-3 ${s.bg} ${s.text}`}>
      <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">{s.icon}</span>
      <div className="text-sm leading-relaxed">
        {title && <strong className="block mb-0.5">{title}</strong>}
        {children}
      </div>
    </div>
  )
}

// ─── Numbered step ────────────────────────────────────────────────────────────
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 my-3 items-start">
      <div className="w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
        {n}
      </div>
      <div>
        <p className="font-semibold text-sm text-on-surface">{title}</p>
        {children && <div className="text-sm text-on-surface-variant mt-0.5 leading-relaxed">{children}</div>}
      </div>
    </div>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────
function SectionCard({ id, icon, title, children }: { id: string; icon: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="bg-white border border-outline-variant/15 rounded-2xl shadow-sm overflow-hidden scroll-mt-6">
      <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center gap-2.5">
        <span className="material-symbols-outlined text-[20px] text-on-surface-variant">{icon}</span>
        <h2 className="font-headline font-bold text-sm text-on-surface uppercase tracking-wide">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-3 text-sm text-on-surface-variant leading-relaxed">{children}</div>
    </div>
  )
}

// ─── Screenshot ───────────────────────────────────────────────────────────────
function Screenshot({ src, caption }: { src: string; caption: string }) {
  return (
    <figure className="my-4 rounded-xl overflow-hidden border border-outline-variant/20 shadow-sm">
      <img src={src} alt={caption} className="w-full object-cover" loading="lazy" />
      <figcaption className="px-4 py-2 text-xs text-on-surface-variant/70 bg-surface-container border-t border-outline-variant/10 italic">
        {caption}
      </figcaption>
    </figure>
  )
}

// ─── Field table ─────────────────────────────────────────────────────────────
function FieldTable({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-surface-container">
            {['Field', 'Required?', 'What to enter'].map(h => (
              <th key={h} className="text-left px-3 py-2 border border-outline-variant/15 font-semibold text-on-surface">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([field, req, desc]) => (
            <tr key={field} className="border-b border-outline-variant/10 hover:bg-surface-container/40 transition-colors">
              <td className="px-3 py-2 border border-outline-variant/10 font-medium text-on-surface">{field}</td>
              <td className="px-3 py-2 border border-outline-variant/10">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${req === 'Yes' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{req}</span>
              </td>
              <td className="px-3 py-2 border border-outline-variant/10 text-on-surface-variant">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── FAQ accordion item ───────────────────────────────────────────────────────
function FAQItem({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-outline-variant/15 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors gap-3"
      >
        <span>{q}</span>
        <span className={`material-symbols-outlined text-[18px] text-on-surface-variant shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>expand_more</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 text-sm text-on-surface-variant border-t border-outline-variant/10 leading-relaxed space-y-2">
          {children}
        </div>
      )}
    </div>
  )
}

export default function FSManual() {
  const [active, setActive] = useState('overview')
  const [search, setSearch] = useState('')
  const scroll = useScroll()
  const filtered = SECTIONS.filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()))
  const go = (id: string) => { setActive(id); scroll(id) }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumb="HELP / USER MANUAL" title="Financial Statements User Manual" subtitle="Your complete guide to using the Financial Statements module. Click any blue underlined term to jump to its definition." />
      <div className="flex gap-5 items-start">
        <aside className="w-56 shrink-0 sticky top-4 bg-white border border-outline-variant/15 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-3 py-3 border-b border-outline-variant/10">
            <div className="flex items-center gap-1.5 px-2.5 py-2 bg-surface-container rounded-xl min-w-0">
              <span className="material-symbols-outlined text-[15px] text-on-surface-variant shrink-0">search</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="min-w-0 flex-1 text-sm bg-transparent outline-none text-on-surface placeholder:text-on-surface-variant/50" />
            </div>
          </div>
          <nav className="py-2 max-h-[75vh] overflow-y-auto">
            {filtered.map(s => (
              <button key={s.id} onClick={() => go(s.id)} className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors ${active === s.id ? 'bg-primary/8 text-primary font-semibold' : 'text-on-surface-variant hover:bg-surface-container'}`}>
                <span className={`material-symbols-outlined text-[16px] ${active === s.id ? 'text-primary' : s.color}`}>{s.icon}</span>
                <span className="leading-tight">{s.title}</span>
              </button>
            ))}
          </nav>
          <div className="p-3 border-t border-outline-variant/10">
            <a
              href="/AWM_Financial_Statements_User_Manual.pdf"
              download="AWM_Financial_Statements_User_Manual.pdf"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">download_for_offline</span>
              Download PDF
            </a>
          </div>
        </aside>

        <div className="flex-1 min-w-0 space-y-5">

          <SectionCard id="overview" icon="dashboard" title="How the System Works">
            <Screenshot src="/manual/fiscal_narrative.png" caption="The Fiscal Narrative — your home screen inside the Financial Statements module. It shows a summary of the current month's activity." />
            <p>Think of the Financial Statements module as your company's <strong className="text-on-surface">digital accounting workbook</strong> for a given month. Every entry you make — every check issued, every receipt recorded, every journal entry — lives here until the end of the month, when you officially close the books.</p>
            <p>The system follows a simple cycle, month after month:</p>
            <div className="my-3 space-y-2">
              {[
                ['1','Enter your transactions','Record checks, receipts, journals, and adjustments throughout the month.'],
                ['2','Post all transactions','Lock everything in once you have verified the entries are correct.'],
                ['3','Run Month-End Processing','Close the current month and let the system open the next one automatically.'],
                ['4','Start fresh','Begin entering transactions for the new month.'],
              ].map(([n,title,desc]) => (
                <div key={n} className="flex gap-3 p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/10 items-start">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{n}</span>
                  <div><span className="font-semibold text-on-surface">{title}</span> — <span>{desc}</span></div>
                </div>
              ))}
            </div>
            <Callout type="info" title="Your active period">The date shown in the top-right corner (e.g., "February 2026") tells you which month you are currently working in. All entries you make belong to that month. You cannot accidentally post to a closed month.</Callout>
            <p>Two important states every transaction can be in:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-on-surface"><T to="term-unposted">Unposted</T></strong> — The entry has been saved but is not yet finalized. You can still edit or delete it.</li>
              <li><strong className="text-on-surface"><T to="term-posted">Posted</T></strong> — The entry has been locked into the permanent records. It cannot be changed.</li>
            </ul>
          </SectionCard>

          <SectionCard id="glossary" icon="menu_book" title="Glossary of Terms">
            <p className="text-on-surface-variant/70 text-xs mb-4">Click any <span className="text-primary underline decoration-dotted font-medium">blue underlined term</span> anywhere in this manual to jump to its definition here.</p>
            <div className="space-y-4">
              <GlossaryTerm id="term-unposted" term="Unposted Transaction">A transaction that has been entered and saved, but not yet finalized. Think of it as a draft. You can still go back and correct it. Unposted entries appear in the dashboard count and affect nothing in your permanent records until posted.</GlossaryTerm>
              <GlossaryTerm id="term-posted" term="Posted Transaction">A transaction that has been permanently recorded into the General Ledger. Once posted, it cannot be edited or deleted. If a mistake is found after posting, a correcting Journal Voucher must be entered.</GlossaryTerm>
              <GlossaryTerm id="term-fiscal-period" term="Fiscal Period (Active Period)">The current month the system is working in, shown in the top-right corner. All transactions you enter belong to this period. The system moves to the next period automatically when you run Month-End Processing.</GlossaryTerm>
              <GlossaryTerm id="term-cdv" term="Check Disbursement Voucher (CDV)">The official record of a check that has been issued. It captures the check number, date, payee, bank, and the account distribution (which accounts are debited or credited).</GlossaryTerm>
              <GlossaryTerm id="term-advance-cdv" term="Advance CDB (Advance CDV)">A check that is entered today but is dated for a future month. For example, entering a check in February that is dated March 15. The system sets it aside safely and does not count it as a February disbursement. It carries the prefix ADV in its check number (e.g., ADV183026).</GlossaryTerm>
              <GlossaryTerm id="term-adv-prefix" term="ADV Prefix">The three letters "ADV" automatically added to the beginning of an Advance CDB's check number. This tag tells the system: "do not count this check in the current month, and do not erase it during month-end close." When you run Transfer Advance CDB in the target month, these letters are removed and the check becomes a regular disbursement.</GlossaryTerm>
              <GlossaryTerm id="term-transfer" term="Transfer Advance CDB">The process of activating Advance CDB entries at the start of the month they belong to. For example, if you entered an advance check for March, you run this process at the beginning of March to bring it into the regular check register.</GlossaryTerm>
              <GlossaryTerm id="term-posting" term="Post All Transactions">The action of finalizing all unposted entries for the current period. This locks them into the permanent General Ledger. It should be done only after all entries have been reviewed and verified.</GlossaryTerm>
              <GlossaryTerm id="term-monthend" term="Month-End Processing">The process of officially closing the current fiscal period. The system records closing balances, carries them forward as opening balances for the next month, clears the transaction registers, and advances the active period to the next month.</GlossaryTerm>
              <GlossaryTerm id="term-gl" term="General Ledger">The permanent, official record of all financial transactions. Once transactions are posted, they are stored here and cannot be changed.</GlossaryTerm>
              <GlossaryTerm id="term-jv" term="Journal Voucher (JV)">A manual accounting entry used to record transactions that do not involve a check — such as depreciation, accruals, and reclassifications. Every JV must be balanced: total debits must equal total credits.</GlossaryTerm>
              <GlossaryTerm id="term-yearend" term="Year-End Close">A special Month-End Processing run done for December. In addition to the usual closing steps, income and expense accounts that are set for initialization are reset to zero, effectively closing the annual Profit and Loss.</GlossaryTerm>
              <GlossaryTerm id="term-backup" term="Database Backup">A complete copy of all the company's accounting data, downloaded as a file to your computer. It is strongly recommended to create a backup before running Month-End Processing, since the close cannot be undone.</GlossaryTerm>
            </div>
          </SectionCard>

          <SectionCard id="cdv" icon="receipt_long" title="Check Disbursement (CDV)">
            <Screenshot src="/manual/cdv_entry.png" caption="The Check Disbursement Voucher entry screen. The top half is the check header; the bottom half is the account distribution." />
            <p>Use <strong className="text-on-surface">Data Entry → Check Disbursement</strong> to record any check your company has issued. This is one of the most frequently used screens in the module.</p>
            <Callout type="tip" title="Good to know">Each CDV you save will show up on the Fiscal Narrative dashboard as an <T to="term-unposted">unposted</T> transaction. It stays there until you run <T to="term-posting">Post All Transactions</T>.</Callout>
            <p><strong className="text-on-surface">How to record a check:</strong></p>
            <Step n={1} title="Click Check Disbursement in the sidebar">It is listed under the Main tab, in the Data Entry section.</Step>
            <Step n={2} title="Click the + Add button">A blank voucher form opens.</Step>
            <Step n={3} title="Fill in the check details at the top">Enter the Check Number, Date, Bank, and the name of the payee (the person or company the check is written to).</Step>
            <Step n={4} title="Add the account lines below">Enter the account codes being debited and credited, with the corresponding peso amounts. The totals must balance.</Step>
            <Step n={5} title='Press Ctrl+S or click Save'>The voucher is saved and counted as unposted. You can edit it any time before posting.</Step>
            <Callout type="warning" title="Date must fall within the current month">If the check date is beyond the last day of the current period, the system will treat it as an <T to="term-advance-cdv">Advance CDB</T>. Use the Enter Advance CDB screen for future-dated checks instead — it is designed for this purpose.</Callout>
            <FieldTable rows={[
              ['Check Number','Yes','The check number as printed on the physical check (e.g., 183025)'],
              ['Check Date','Yes','Must fall within the current active period for a regular CDV'],
              ['Bank','Yes','Select the bank account the check was drawn from'],
              ['Pay To (Payee)','Yes','The name of the person or company receiving the check'],
              ['Account Code','Yes','The Chart of Accounts code for each line of the distribution'],
              ['Amount','Yes','The peso amount for each account line'],
            ]} />
          </SectionCard>

          <SectionCard id="advance" icon="forward_to_inbox" title="Advance CDB">
            <Screenshot src="/manual/advance_cdv.png" caption="The Enter Advance CDB screen. Notice the check number starts with ADV and the date is set to a future month." />
            <p>An <T to="term-advance-cdv">Advance CDB</T> is a check you are issuing <em>this month</em> but which is <em>dated for a future month</em>. A common example: it is February, but you are already writing a check dated March 15 for next month's rent.</p>
            <p>The system keeps these checks safely set aside — they do not appear in February's totals, will not be erased during the February month-end close, and will be ready to activate when March begins.</p>
            <Callout type="info" title="How to spot an Advance CDB">Its check number will start with the letters <strong>ADV</strong> — for example, <code className="bg-surface-container px-1.5 py-0.5 rounded font-mono">ADV183026</code>. This is added automatically by the system; you do not need to type it.</Callout>
            <p><strong className="text-on-surface">How to enter an Advance CDB:</strong></p>
            <Step n={1} title="Go to Processing → Enter Advance CDB">This is under the Main tab in the sidebar.</Step>
            <Step n={2} title="Click + Add to open a new voucher">The form is identical to the regular CDV form.</Step>
            <Step n={3} title="Set the check date to the future date">For example, March 15, 2026. The system accepts this even though you are currently in February.</Step>
            <Step n={4} title="Fill in all other details normally">Bank, payee, account distribution — same as a regular CDV.</Step>
            <Step n={5} title="Save the voucher">The system saves it with an ADV prefix on the check number and sets it aside for the target month.</Step>
            <Step n={6} title="At the start of March, run Transfer Advance CDB">See the next section for how to activate it.</Step>
            <Callout type="tip" title="You can view all Advance CDBs on the dashboard">The Fiscal Narrative home screen shows a panel listing all advance checks, including which month each one is intended for.</Callout>
          </SectionCard>

          <SectionCard id="transfer" icon="compare_arrows" title="Transfer Advance CDB">
            <Screenshot src="/manual/transfer_advance.png" caption="The Transfer Advance CDB screen. One click activates all advance checks that belong to the current month." />
            <p>At the beginning of each new month, any <T to="term-advance-cdv">Advance CDB</T> entries that were written for this month are still sitting aside with their <T to="term-adv-prefix">ADV prefix</T>. Running <strong className="text-on-surface">Transfer Advance CDB</strong> brings them into the current month's register as regular check disbursements.</p>
            <Callout type="danger" title="Run this at the very start of the new month">Do this before entering any new transactions for the month. It only transfers advance checks whose dates fall within the current period — checks for future months are left untouched.</Callout>
            <p><strong className="text-on-surface">Step by step:</strong></p>
            <Step n={1} title="Confirm you are in the correct month">Check the active period shown in the top-right corner. It should show the new month (e.g., March 2026).</Step>
            <Step n={2} title="Go to Processing → Transfer Advance CDB">The page shows a description of what will happen.</Step>
            <Step n={3} title='Click "Transfer Now"'>The system removes the ADV prefix from all advance checks dated within the current month. They become regular check disbursements and are now visible in the dashboard count.</Step>
            <Step n={4} title="Verify on the dashboard">Go back to the Fiscal Narrative home screen. The check count should now include the transferred checks.</Step>
            <Callout type="tip" title="Advance checks for next month stay untouched">If you have an advance check dated for April, it will remain as ADV-prefixed until you are in April and run this process again.</Callout>
          </SectionCard>

          <SectionCard id="post" icon="publish" title="Post All Transactions">
            <Screenshot src="/manual/posting.png" caption="The Post All Transactions screen shows a pre-posting summary — a count of each transaction type waiting to be finalized." />
            <p><T to="term-posting">Posting</T> is the act of permanently recording all your <T to="term-unposted">unposted</T> entries into the <T to="term-gl">General Ledger</T>. Once posted, entries are part of the official books and cannot be changed. Think of it as signing off on the month's work.</p>
            <Callout type="danger" title="This cannot be undone">Always review your entries carefully before posting. If you discover a mistake after posting, you will need to enter a correcting <T to="term-jv">Journal Voucher</T>.</Callout>
            <p><strong className="text-on-surface">Before you post, check these:</strong></p>
            <ul className="list-disc pl-5 space-y-1.5 my-2">
              <li>All check amounts and payee names are correct</li>
              <li>All journal entries are balanced (debits equal credits)</li>
              <li>Advance CDB entries have the correct future dates</li>
              <li>The Check Disbursement Register report matches your physical check register</li>
            </ul>
            <p><strong className="text-on-surface">How to post:</strong></p>
            <Step n={1} title="Go to Processing → Post All Transactions">The page shows a summary count of every transaction type waiting to be posted.</Step>
            <Step n={2} title="Review the counts">Make sure the numbers match what you expect. If something looks off, go back and check your entries first.</Step>
            <Step n={3} title='Click "Post Transactions"'>The system finalizes all entries. The dashboard unposted count will drop to zero.</Step>
            <Callout type="info" title="Advance CDB entries are not affected">The system automatically skips Advance CDB entries during posting. They remain in their holding state until they are transferred in a future month.</Callout>
          </SectionCard>

          <SectionCard id="monthend" icon="lock_clock" title="Month-End Processing">
            <Screenshot src="/manual/month_end.png" caption="The Month-End Processing screen. Step 1 asks you to confirm the period; Step 2 executes the close." />
            <p><T to="term-monthend">Month-End Processing</T> is the formal closing of the current month. The system carries all account balances forward, clears the transaction registers, and opens the next month automatically.</p>
            <Callout type="danger" title="Always back up first">Before running Month-End Processing, download a <T to="term-backup">database backup</T> from File → Backup Database. The close cannot be undone.</Callout>
            <p><strong className="text-on-surface">Recommended order of steps:</strong></p>
            <Step n={1} title="Enter and verify all transactions for the month">Make sure nothing is missing — receipts, disbursements, journal entries, adjustments.</Step>
            <Step n={2} title="Run Post All Transactions">The dashboard unposted count should show zero before you close.</Step>
            <Step n={3} title="Download a database backup">Go to File → Backup Database. Wait for the download to complete. Label the file with the month and year.</Step>
            <Step n={4} title="Go to File → Month-End Processing">Review the Current Period Information card that appears on screen.</Step>
            <Step n={5} title="Type the period to confirm">The system asks you to type the period in M/YYYY format (for example, type 2/2026 to close February 2026). This is a safety check to prevent accidental closes.</Step>
            <Step n={6} title='Click "Close Period Now"'>A confirmation window appears listing exactly what will happen. Read it, then click Yes, Close Period.</Step>
            <Step n={7} title="Wait for completion">A processing log shows each step as it happens. When finished, the active period advances to the next month.</Step>
            <Step n={8} title="Run Transfer Advance CDB if needed">If you had any advance checks dated for the new month, run this process right away before entering any new transactions.</Step>
            <Callout type="warning" title="December is different — Year-End Close">When you close December, the system also resets income and expense accounts to zero, completing the annual Profit and Loss cycle. This is called a <T to="term-yearend">Year-End Close</T>. Make sure your auditors are aware before running it.</Callout>
          </SectionCard>

          <SectionCard id="journals" icon="receipt" title="Journal Vouchers">
            <p>A <T to="term-jv">Journal Voucher (JV)</T> is a manual accounting entry for transactions that do not involve a physical check. Common uses include depreciation, accruals, prepayments, and year-end adjustments.</p>
            <p>Use <strong className="text-on-surface">Data Entry → Journal Vouchers</strong> to access this screen.</p>
            <Callout type="warning" title="Every JV must balance">Total debit amounts must equal total credit amounts before the system will let you save. This is standard double-entry bookkeeping — the system enforces it automatically.</Callout>
            <Step n={1} title="Enter a JV number">Use a consistent format, such as 26-02001 (Year-Period-Sequence). This is for your own reference; the system does not enforce a specific format.</Step>
            <Step n={2} title="Set the date">Must fall within the current active period.</Step>
            <Step n={3} title="Add account lines">Enter the account code, a description, and the debit or credit amount for each line. Continue until the entry is balanced.</Step>
            <Step n={4} title="Save">The JV appears in the Journal Vouchers count on the dashboard.</Step>
            <p><strong className="text-on-surface">Other journal registers (same process, different purpose):</strong></p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                ['Cash Receipts','Record money coming into the company — customer payments, collections, loan proceeds.'],
                ['Sales Book','Record sales transactions, whether cash or on account.'],
                ['Purchase Book','Record purchases from suppliers.'],
                ['Adjustments','Period-end corrections and reclassifications.'],
              ].map(([title, desc]) => (
                <div key={title} className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/10">
                  <p className="font-semibold text-xs text-on-surface mb-0.5">{title}</p>
                  <p className="text-[12px] text-on-surface-variant">{desc}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard id="receipts" icon="payments" title="Cash Receipts & Sales Book">
            <p>These two registers work the same way as Journal Vouchers — same entry form, same rules. The only difference is where the entries are stored and which reports they appear in.</p>
            <p><strong className="text-on-surface">Cash Receipts</strong> — Use this for any money coming <em>into</em> the company: collections from customers, loan proceeds, refunds received from suppliers.</p>
            <p><strong className="text-on-surface">Sales Book</strong> — Use this to record sales. Whether it is a cash sale or a sale on account, it goes here.</p>
            <Callout type="tip" title="These feed the reports directly">All Cash Receipts entries appear in the Cash Receipts Transactions report. All Sales Book entries appear in the Sales Book Journals report. You can find both under the Query/Report tab.</Callout>
          </SectionCard>

          <SectionCard id="backup" icon="save" title="Backing Up Your Data">
            <p>A <T to="term-backup">database backup</T> is a complete copy of all accounting data saved to your computer. <strong className="text-on-surface">Always create a backup before running Month-End Processing.</strong></p>
            <Step n={1} title="Go to the File tab, then click Backup Database in the sidebar">A progress bar appears at the bottom-right of the screen.</Step>
            <Step n={2} title="Wait for the download to complete">The file saves automatically to your Downloads folder with a name like: accounting_backup_gian_20260228_1430.db</Step>
            <Step n={3} title="Move the file to a safe location">Keep backups organized by month and year. Consider keeping copies in at least two places (e.g., your computer and an external drive or shared folder).</Step>
            <Callout type="warning" title="Restoring a backup requires IT assistance">If you ever need to restore data from a backup file, contact your system administrator. It is not something you do yourself through the system interface — it requires access to the server.</Callout>
            <p><strong className="text-on-surface">The backup file contains everything:</strong></p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>All companies registered in the system (not just the one you are viewing)</li>
              <li>All transaction records: checks, journals, receipts, sales, purchases</li>
              <li>All master files: Chart of Accounts, Banks, Suppliers, Signatories</li>
              <li>System settings including the active period for each company</li>
            </ul>
          </SectionCard>

          <SectionCard id="faq" icon="help" title="Common Questions">
            <div className="space-y-2">
              <FAQItem q="After Month-End Processing, the dashboard shows zero transactions. Is something wrong?">
                <p>No — this is exactly what is supposed to happen. When you close a month, the system clears the transaction registers to make way for the new period. You are now looking at a fresh, empty month.</p>
                <p>If you entered any <T to="term-advance-cdv">Advance CDB</T> entries for this new month, run <T to="term-transfer">Transfer Advance CDB</T> now. Those checks will then appear in the dashboard count.</p>
              </FAQItem>
              <FAQItem q="I see a check number like ADVCDV183041 — is that correct?">
                <p>No, that format is from an earlier version of the system where a bug caused the prefix to be doubled. The correct format should be <code className="bg-surface-container px-1.5 rounded font-mono">ADV183041</code> — just the letters ADV followed by the check number, with no extra text in between.</p>
                <p>If you see ADVCDV-style numbers, contact your system administrator. A correction can be applied to fix this across all records.</p>
              </FAQItem>
              <FAQItem q="I entered a check and now I cannot find it in the regular check list. Where did it go?">
                <p>Check whether the date on the voucher falls within the current month. If the date is beyond the period end (for example, you entered a March date while you are still in February), the system automatically treated it as an <T to="term-advance-cdv">Advance CDB</T> and placed it in the advance holding area. You will see it in the Advance CDB panel on the Fiscal Narrative dashboard.</p>
              </FAQItem>
              <FAQItem q="Can I correct a check after it has been posted?">
                <p>Not directly. Once a transaction is <T to="term-posted">posted</T>, it is part of the permanent record and cannot be edited or deleted.</p>
                <p>The standard accounting procedure is to enter a <T to="term-jv">Journal Voucher</T> that reverses the incorrect entry, then enter a new correct entry. This keeps the audit trail intact.</p>
              </FAQItem>
              <FAQItem q="What if I run Month-End Processing and the active period shows the wrong month afterward?">
                <p>This is a system configuration issue — it does not happen under normal operation. Contact your system administrator right away. The active period is a setting stored per company and can be corrected, but it requires administrator access.</p>
              </FAQItem>
              <FAQItem q="Do I have to post transactions before running Month-End?">
                <p>It is strongly recommended. While the system can technically run Month-End with unposted transactions still in the registers, best practice — and good accounting discipline — is to post first, review your reports, confirm everything is correct, then close the month.</p>
                <p>Running Month-End without posting first means your General Ledger for that period may be incomplete until the next posting cycle.</p>
              </FAQItem>
              <FAQItem q="I have Advance CDB entries dated for next month. Will they be erased when I close this month?">
                <p>No. The <T to="term-adv-prefix">ADV prefix</T> on those check numbers is precisely what protects them. The Month-End process is designed to skip over any entry carrying an ADV prefix — they survive the close intact and will be waiting for you to activate them with <T to="term-transfer">Transfer Advance CDB</T> at the start of the next month.</p>
              </FAQItem>
              <FAQItem q="What is the difference between Enter Advance CDB and Transfer Advance CDB?">
                <p><strong>Enter Advance CDB</strong> is what you do <em>this month</em> — you are recording a check that is dated for a future month and parking it safely.</p>
                <p><strong>Transfer Advance CDB</strong> is what you do at the <em>start of that future month</em> — you are activating those parked checks so they become part of the current month's regular check disbursements.</p>
                <p>Think of Enter as "parking the car" and Transfer as "driving it out of the parking lot."</p>
              </FAQItem>
            </div>
          </SectionCard>

        </div>
      </div>
    </div>
  )
}
