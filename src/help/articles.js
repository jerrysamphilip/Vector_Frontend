// In-app help content. Each article: id, title, category, routes (screens it explains),
// summary, body blocks ({h} heading, {p} paragraph, {steps}, {list}, {tip}, {note}), related ids.
// **Text** marks an on-screen label.
import { OUTREACH_ARTICLES } from './articlesOutreach.js';

export const CATEGORIES = ['Getting started', 'Outreach', 'CRM', 'Sales', 'Workspace & settings'];

const GENERAL = [
    {
        id: 'getting-started', category: 'Getting started', title: 'Getting around', routes: ['/app/help', '/app/help/:id'],
        summary: 'How the app is laid out, and the controls that are on every screen.',
        keywords: ['navigation', 'menu', 'sidebar', 'layout', 'start'],
        body: [
            { h: 'The sidebar' },
            { p: '**Home**, **Inbox** and **Tasks** are always at the top. Everything else is grouped into four sections: **Outreach** (campaigns and sending), **CRM** (contacts, companies and lists), **Sales** (leads, deals and reports) and **Workspace** (team and settings).' },
            { p: 'Click a section heading to open or close it. Only one section is open at a time, the one for the screen you are on, so the menu fits without scrolling. A dot on a closed heading means the current screen is inside it.' },
            { p: 'Some screens add their own items under them. On **Contacts**, for example, your contact views appear indented beneath it.' },
            { h: 'The top bar' },
            { list: [
                { term: 'Search', text: 'finds contacts and companies from anywhere. Press **Ctrl K** (⌘K on a Mac) to jump to it.' },
                { term: '+ New', text: 'creates a contact, lead, deal, task or campaign without leaving the screen you are on.' },
                { term: 'Bell', text: 'shows your notifications. See "Notifications".' },
                { term: 'Help (?)', text: 'opens help for the screen you are on.' },
                { term: 'Your initials', text: 'change your password, turn on two-factor sign-in (**Security**), set up calendar and email sync, or sign out.' },
            ] },
            { h: 'Getting help' },
            { p: 'Press **?** (or **F1**) on any screen, or click **Help** in the top bar, to open help for that screen in a side panel. Search in the panel to find anything else. **Help Center** at the bottom of the sidebar opens the whole library.' },
        ],
        related: ['roles-and-visibility', 'keyboard-shortcuts', 'notifications', 'home'],
    },
    {
        id: 'roles-and-visibility', category: 'Getting started', title: 'Roles and who sees what',
        summary: 'What each role can do, how the sales hierarchy works, and which records you can see.',
        keywords: ['permissions', 'access', 'admin', 'manager', 'agent', 'level', 'hierarchy', 'visibility'],
        body: [
            { h: 'Roles' },
            { list: [
                { term: 'Super Admin', text: 'everything, including workspace-wide settings. Super Admin roles cannot be changed by other admins.' },
                { term: 'Admin', text: 'everything in the workspace: team, sales settings, all records.' },
                { term: 'Manager', text: 'works their own and their team\'s records; permissions decide which areas they use.' },
                { term: 'Agent', text: 'works their own records.' },
            ] },
            { p: 'Admins grant extra permissions per person on the **Team** screen (for example managing campaigns, prospect lists, email accounts or viewing analytics). Menu items you do not have permission for are hidden.' },
            { h: 'The sales hierarchy' },
            { p: 'Each salesperson has a level and reports to a manager: **L1** CEO / COO / Sales Head, **L2** Business Development, **L3** Business Executive, **L4** Market Research. It is set on **Sales team**.' },
            { list: [
                'You always see your own contacts, leads, deals and tasks.',
                'Managers also see everything owned by the people below them, at every level.',
                'Admins and L1 see everything.',
                'Reports and dashboards follow the same rule, so a team view adds up its people.',
            ] },
            { h: 'Amounts' },
            { p: 'Admins can hide money from some roles or levels (**Sales settings** → **Who can see amounts**). People affected see deals, quotes and reports without amounts and cannot change them.' },
        ],
        related: ['sales-team', 'team-management', 'sales-settings'],
    },
    {
        id: 'keyboard-shortcuts', category: 'Getting started', title: 'Keyboard shortcuts',
        summary: 'Shortcuts that work across the app.',
        keywords: ['keys', 'hotkeys', 'shortcut'],
        body: [
            { list: [
                { term: '? or F1', text: 'open or close help for the current screen' },
                { term: 'Ctrl K / ⌘K', text: 'search contacts and companies' },
                { term: 'Esc', text: 'close the help panel or a menu' },
                { term: 'j / k', text: 'next / previous lead in the Leads split view' },
                { term: 'Enter', text: 'send a reply in the Inbox (Shift + Enter for a new line)' },
            ] },
            { note: 'Shortcuts are ignored while you are typing in a field, so ? and j/k never interrupt your typing.' },
        ],
        related: ['getting-started'],
    },
    {
        id: 'notifications', category: 'Getting started', title: 'Notifications',
        summary: 'The bell in the top bar collects things that need you: new leads assigned to you, deals going quiet, workflow alerts and tasks.',
        keywords: ['bell', 'alerts', 'email notifications', 'unread'],
        body: [
            { list: [
                'The red number is how many you have not read. Click one to open the record it is about; it is marked read.',
                '**Mark all read** clears the count.',
                'Turn on **Also send me these by email** to get a copy of each notification by email.',
            ] },
            { p: 'You are notified when a lead is assigned to you (by a person or automatically), when an open deal has had no activity for a while (see stale deals), when a workflow rule sends you an alert, and when tasks are assigned to you.' },
        ],
        related: ['sales-settings', 'deals'],
    },
    {
        id: 'home', category: 'Getting started', title: 'Home', routes: ['/app/dashboard'],
        summary: 'Your starting point each day: how the quarter is going, and what needs doing today.',
        keywords: ['dashboard', 'my day', 'today'],
        body: [
            { h: 'This quarter' },
            { p: 'The tiles show new leads, open pipeline, revenue won this quarter, and won against the yearly target. Below them are the funnel for the quarter, deals closing in the next 30 days and SQLs waiting to be converted. Everything covers you and your team.' },
            { h: 'My day (right-hand panel)' },
            { list: [
                { term: 'My day', text: 'tasks due today or overdue. Tick one to complete it.' },
                { term: 'New replies', text: 'positive replies to your campaigns from contacts who have no lead yet. **Create lead** turns one into a lead in one click; **Reply** opens the Inbox.' },
                { term: 'Going stale', text: 'your open deals with no recent activity.' },
            ] },
            { p: 'The campaign dashboard that used to be the home page is now **Outreach → Campaign analytics**.' },
        ],
        related: ['tasks', 'leads', 'deals', 'sales-overview'],
    },
    {
        id: 'tasks', category: 'Getting started', title: 'Tasks', routes: ['/app/tasks'],
        summary: 'Follow-ups, calls and to-dos across your contacts, companies and deals.',
        keywords: ['to do', 'follow up', 'reminder', 'due'],
        body: [
            { h: 'Finding tasks' },
            { list: [
                { term: 'Assigned to me / Created by me / Everyone', text: 'whose tasks to show (Everyone is for managers and admins).' },
                { term: 'Any date, Overdue, Due today, Next 7 days, No due date', text: 'filter by due date.' },
                { term: 'Open / Done / All', text: 'filter by status.' },
            ] },
            { p: 'The tiles at the top count your open tasks, overdue tasks and reminders due. Each task shows the contact, company or deal it belongs to; click to open it.' },
            { h: 'Adding a task' },
            { steps: [
                'Click **New task** (or **+ New** → **Task** from anywhere).',
                'Give it a title, type (to-do, call, email or meeting), priority, due date and optional reminder.',
                'Managers and admins can assign it to someone else.',
            ] },
            { tip: 'Tasks added from a deal\'s activity panel are linked to that deal and show on its timeline. Workflow rules can also create tasks automatically.' },
        ],
        related: ['home', 'deal-page', 'workflow-rules'],
    },
];

const CRM = [
    {
        id: 'contacts', category: 'CRM', title: 'Contacts', routes: ['/app/contacts'],
        summary: 'Everyone you sell to, in one list you can filter, save as views, and act on in bulk.',
        keywords: ['people', 'prospects', 'filters', 'views', 'columns', 'bulk', 'export', 'duplicates', 'properties'],
        body: [
            { h: 'Views' },
            { p: 'Views are listed under **Contacts** in the sidebar: **All contacts**, **My contacts**, **Unassigned** (admins), **Recently created**, then saved views (starred). Picking one applies its filters, sort and columns. The current view\'s name is shown at the start of the toolbar.' },
            { steps: [
                'Set up the search, **Filters**, sort and **Columns** you want.',
                'Click **Save as view** (or **Save view** once you have changed a view) and give it a name. You can share it with the workspace.',
                'To remove a saved view, open it and click **Delete view**.',
            ] },
            { h: 'Filtering' },
            { p: '**Filters** builds conditions on any property, including your custom ones, combined with AND or OR. The table and board both follow the filters.' },
            { h: 'Table and board' },
            { p: 'Switch between a table (choose columns with **Columns**) and a board grouped by lifecycle stage or lead status, where you can drag contacts between stages.' },
            { h: 'Acting on many contacts' },
            { p: 'Tick contacts to get the bulk bar: **Assign owner**, **Edit property**, **Add tag**, **Remove tag**, **Add to list**, **Enroll in campaign** and **Delete**. Enrolment tells you which contacts were not enrolled and why (unsubscribed, already enrolled, bounced, and so on).' },
            { h: 'Other tools' },
            { list: [
                { term: 'Import', text: 'bring in contacts and companies from a spreadsheet.' },
                { term: 'Export', text: 'download the current view as a file.' },
                { term: 'Properties', text: 'add your own fields (text, number, date, dropdown and more). Admins only.' },
                { term: 'Duplicates', text: 'find likely duplicates and merge them, choosing which value to keep for each field.' },
                { term: 'Archive icon', text: 'opens Recently deleted.' },
            ] },
        ],
        related: ['contact-record', 'lists', 'import', 'recently-deleted', 'companies'],
    },
    {
        id: 'contact-record', category: 'CRM', title: 'A contact\'s page', routes: ['/app/contacts/:id'],
        summary: 'Everything about one person: details, activity, tasks, lists, deals and history.',
        keywords: ['contact detail', 'timeline', 'notes', 'activity', 'lifecycle', 'subscription'],
        body: [
            { list: [
                { term: 'Left', text: 'the contact\'s details and properties. Click a value to edit it; changes are saved and recorded in history.' },
                { term: 'Middle', text: 'the activity timeline: notes, calls, meetings and emails you log, campaign emails sent and received, and changes. Log something with the composer at the top.' },
                { term: 'Right', text: 'company, open tasks, lists, leads and deals for this contact.' },
            ] },
            { p: '**Create lead** starts qualifying this contact as a sales lead. Lifecycle stage moves on its own as the lead and deal progress (Lead → MQL → SQL → Opportunity → Customer).' },
            { p: 'Subscription status shows whether the contact can receive campaign emails. Unsubscribed contacts are never emailed.' },
        ],
        related: ['contacts', 'leads', 'tasks'],
    },
    {
        id: 'companies', category: 'CRM', title: 'Companies', routes: ['/app/accounts', '/app/accounts/:id'],
        summary: 'The organisations your contacts work at, with their people and deals.',
        keywords: ['accounts', 'organisations', 'domain'],
        body: [
            { p: 'Filter with **All companies**, **My companies** or **Unassigned**, and search by name, domain or industry. **New company** adds one by hand.' },
            { p: 'Companies are created and linked automatically from contacts\' email domains (personal email addresses such as Gmail fall back to the company name). **Link contacts by company** runs that matching for existing contacts.' },
            { p: 'A company\'s page shows its details, contacts, deals and activity. Opportunities for an existing company count as **Existing client** business by default.' },
        ],
        related: ['contacts', 'deals'],
    },
    {
        id: 'lists', category: 'CRM', title: 'Lists', routes: ['/app/lists'],
        summary: 'Groups of contacts for campaigns and follow-up.',
        keywords: ['static list', 'active list', 'segment', 'smart list'],
        body: [
            { list: [
                { term: 'Static', text: 'a fixed set of contacts. Add people from Contacts (**Add to list**) or during an import.' },
                { term: 'Active', text: 'contacts who match filters you set. Membership updates on its own as contacts change.' },
            ] },
            { p: 'Click a list to see its contacts on the Contacts screen. Lists can be enrolled in campaigns.' },
            { note: '**Prospect lists** (under CRM) are the outreach upload lists used by campaigns; see "Prospect lists".' },
        ],
        related: ['contacts', 'prospect-lists'],
    },
    {
        id: 'import', category: 'CRM', title: 'Importing contacts and companies', routes: ['/app/import'],
        summary: 'Bring contacts and companies in from a CSV or Excel file.',
        keywords: ['csv', 'upload', 'spreadsheet', 'mapping', 'excel'],
        body: [
            { steps: [
                'Choose the **File**.',
                '**Map columns**: for each column in the file, pick the Contact, Company or custom property it fills, or **Don\'t import**.',
                'Set **Options**: the **Owner of new contacts** (used when the file has no Owner column) and whether to **Add imported contacts to a list** (a new list or an existing one).',
                'Import. Existing contacts with the same email are updated rather than duplicated.',
            ] },
            { p: 'The result shows how many were **Created**, **Updated** and how many had **Errors**. **Rows that were not imported** can be downloaded with the reason for each, fixed and imported again.' },
        ],
        related: ['contacts', 'lists'],
    },
    {
        id: 'recently-deleted', category: 'CRM', title: 'Recently deleted', routes: ['/app/recently-deleted'],
        summary: 'Deleted contacts and companies are kept for 90 days, then removed for good.',
        keywords: ['restore', 'undelete', 'trash', 'recycle bin'],
        body: [
            { p: 'Each row shows when it was deleted and when it will be **Permanently removed**. Restore brings it back with its history.' },
        ],
        related: ['contacts'],
    },
];

const SALES = [
    {
        id: 'sales-overview', category: 'Sales', title: 'Sales overview', routes: ['/app/sales'],
        summary: 'The sales dashboard for you and your team.',
        keywords: ['dashboard', 'kpi', 'funnel', 'team'],
        body: [
            { p: 'What you see depends on your level: the sales head sees every team, business development sees their team, and executives see their own numbers. Use the team and period pickers at the top to narrow it.' },
            { list: [
                { term: 'Tiles', text: 'new leads, opportunities created, open pipeline (with weighted value) and revenue won.' },
                { term: 'Funnel', text: 'contacts emailed → replied → leads → SQLs → opportunities → won, with the conversion between each step.' },
                { term: 'Needs attention', text: 'stale deals, SQLs waiting more than a week and overdue next steps.' },
                { term: 'By team / By team member', text: 'click a row to see that person and everyone below them.' },
                { term: 'Leaderboard', text: 'the top reps by revenue won.' },
            ] },
            { note: 'Each person can start outreach to at most 500 new contacts a day. Follow-up emails are not counted; extra first emails wait until the next day. The line at the bottom shows today\'s count.' },
        ],
        related: ['sales-reports', 'leads', 'deals', 'forecasting'],
    },
    {
        id: 'leads', category: 'Sales', title: 'Leads', routes: ['/app/leads'],
        summary: 'Contacts you are qualifying towards a sale, from first touch to a sales-qualified lead (SQL).',
        keywords: ['lead', 'mql', 'sql', 'qualify', 'bant', 'stage', 'split view', 'board'],
        body: [
            { h: 'Stages' },
            { p: '**New** → **Contacted** → **Engaged (MQL)** → **Sales qualified (SQL)** → **Converted to opportunity**, or **Disqualified**. The contact\'s lifecycle stage follows the lead.' },
            { h: 'Three ways to work' },
            { list: [
                { term: 'Split', text: 'the list on the left and the selected lead on the right. Filter by stage with the chips; press **j** / **k** to move through the list.' },
                { term: 'Board', text: 'a column per stage.' },
                { term: 'Table', text: 'a sortable list with owner, source, next step and age.' },
            ] },
            { h: 'Positive replies' },
            { p: 'The **positive replies without a lead** panel lists campaign replies that have no lead yet. **Create lead** makes an Engaged lead with a next step to follow up, owned by the contact\'s owner (or assigned automatically).' },
            { h: 'Creating a lead' },
            { p: '**New lead** (or **+ New** → **Lead**): pick a contact. If no owner is given, the lead goes to the contact\'s owner, else the automatic assignment rule, else you.' },
        ],
        related: ['lead-record', 'sql-queue', 'sales-settings'],
    },
    {
        id: 'lead-record', category: 'Sales', title: 'Qualifying a lead', routes: ['/app/leads/:id'],
        summary: 'Move a lead through its stages, qualify it, set next steps, then convert or disqualify it.',
        keywords: ['bant', 'qualification', 'convert', 'disqualify', 'recycle', 'next step'],
        body: [
            { h: 'Qualification' },
            { p: 'A lead becomes a **Sales qualified (SQL)** lead when all four are ticked: **Budget confirmed**, **Talking to the decision maker**, **Clear business need** and **Buying timeline known**. Add notes as you learn more.' },
            { h: 'Next step' },
            { p: 'Say what happens next and when. Overdue next steps show in red here, on Home and in the SQL queue.' },
            { h: 'Convert to opportunity' },
            { p: '**Convert to opportunity** creates a deal with the contact, company and owner carried across; give it a name, amount, expected close date and stage.' },
            { h: 'Disqualify' },
            { steps: [
                'Click **Disqualify** and pick a reason (your admin sets the list) or type one.',
                'Under **Try again later**, choose when the lead should come back (the default is set by your admin, usually 90 days) or **Never**.',
                'When the time comes, the lead reopens as **New** for its owner, who is notified.',
            ] },
        ],
        related: ['leads', 'sql-queue', 'deals'],
    },
    {
        id: 'sql-queue', category: 'Sales', title: 'SQL queue', routes: ['/app/sql-queue'],
        summary: 'Sales-qualified leads waiting to be converted, oldest first.',
        keywords: ['sql', 'queue', 'convert', 'aging'],
        body: [
            { p: 'The tiles show how many SQLs are waiting, their average age, how many are older than 14 days, and how many have no next step or an overdue one. **By owner** shows who has the most and the oldest.' },
            { p: 'Each row has **Convert** to turn it into an opportunity straight away.' },
            { tip: 'Aim to convert or move SQLs within two weeks; older ones are highlighted.' },
        ],
        related: ['lead-record', 'deals'],
    },
    {
        id: 'deals', category: 'Sales', title: 'Deals (opportunities)', routes: ['/app/deals'],
        summary: 'Your open deals by stage, with amounts, close dates and the ones going stale.',
        keywords: ['opportunities', 'board', 'won', 'lost', 'stale', 'stages', 'pipeline'],
        body: [
            { h: 'Board and list' },
            { p: 'The **Board** has a column per open stage with its total and weighted value. Drag a card to move the deal. Drop it on **Closed won** or **Closed lost** under the board to close it; you will be asked why.' },
            { p: 'The **List** shows all deals, including closed ones, with filters for owner, client type, status and close dates.' },
            { h: 'Stale deals' },
            { p: 'An open deal is **Stale** when it has had no activity for longer than your workspace setting (14 days by default) or its close date has passed. Stale deals show an orange badge with the days idle; **Stale only** lists them. Owners and their managers get a notification.' },
            { h: 'Stages' },
            { p: 'Default stages: Qualification (10%), Needs analysis (25%), Proposal (50%), Negotiation (75%), Closed won, Closed lost. Admins change names, probabilities and order with **Stages**.' },
        ],
        related: ['deal-page', 'pipeline', 'forecasting'],
    },
    {
        id: 'deal-page', category: 'Sales', title: 'Working a deal', routes: ['/app/deals/:id'],
        summary: 'The deal page: stage, details, activity, proposals and quotes.',
        keywords: ['opportunity', 'timeline', 'activity', 'quote', 'proposal', 'pdf', 'won', 'lost', 'forecast category'],
        body: [
            { h: 'Stage' },
            { p: 'Click a stage in the bar to move the deal. **Mark won** and **Mark lost** close it; a reason is required (your admin sets the choices).' },
            { h: 'About this deal (left)' },
            { p: 'Amount (with its weighted value), expected close, owner, client type, next step and description. **Forecast category** follows the stage automatically; choose one by hand to commit the deal, and it stays when the stage changes. **Time in each stage** shows how long the deal sat in each stage.' },
            { h: 'Activity (middle)' },
            { steps: [
                'Choose **Note**, **Call**, **Meeting**, **Email** or **Task**.',
                'Add a subject and notes, and when it happened (or the due date for a task).',
                'For a meeting, tick **Add to my calendar** to put it in your connected Google or Outlook calendar.',
            ] },
            { p: 'The timeline shows activities, tasks, emails with the contact (including ones synced from your mailbox) and every change to the deal. Filter it with **All**, **Activities**, **Tasks**, **Emails** and **Changes**.' },
            { h: 'Proposals and quotes (right)' },
            { p: 'Add a proposal and track its status (Draft, Sent, Under review, Accepted, Rejected). **Quote & PDF** opens the quote: add lines from the price list or custom lines with quantity, price and discount; saving sets the proposal amount. **PDF** downloads a quote to send.' },
        ],
        related: ['deals', 'forecasting', 'calendar-sync', 'sales-settings'],
    },
    {
        id: 'pipeline', category: 'Sales', title: 'Pipeline', routes: ['/app/pipeline'],
        summary: 'Open pipeline by stage, and the proposal pipeline.',
        keywords: ['revenue pipeline', 'proposal pipeline', 'weighted'],
        body: [
            { list: [
                { term: 'Revenue pipeline', text: 'open amount and weighted amount (amount × stage probability) per stage, split into new and existing clients.' },
                { term: 'Proposal pipeline', text: 'proposals by status with their totals.' },
            ] },
            { p: 'Use the owner and client-type filters to narrow it. Click a stage to see its deals.' },
        ],
        related: ['deals', 'forecasting'],
    },
    {
        id: 'forecasting', category: 'Sales', title: 'Forecasts and targets explained',
        summary: 'How weighted pipeline, forecast categories and targets fit together.',
        keywords: ['forecast', 'commit', 'best case', 'weighted', 'quarter', 'financial year', 'target', 'attainment'],
        body: [
            { list: [
                { term: 'Weighted', text: 'amount × stage probability. A $100K deal at Proposal (50%) counts $50K.' },
                { term: 'Forecast', text: 'won + weighted open pipeline, by expected close date.' },
                { term: 'Commit', text: 'won + open deals in the **Commit** category: what the team is confident of.' },
                { term: 'Best case', text: 'commit + deals in **Best case**.' },
                { term: 'Target / attainment', text: 'quarterly revenue targets per person; attainment is won ÷ target.' },
            ] },
            { p: 'Forecast categories are set from the stage probability (70% and above: Commit; 40% and above: Best case; otherwise Pipeline). Reps can override a deal\'s category on the deal page.' },
            { p: 'The financial year starts in April: Q1 is April–June.' },
        ],
        related: ['sales-reports', 'targets', 'deal-page'],
    },
    {
        id: 'sales-reports', category: 'Sales', title: 'Sales reports', routes: ['/app/sales-reports'],
        summary: 'Leads, pipeline, forecast, targets, team performance, campaign ROI and your own reports.',
        keywords: ['reports', 'analytics', 'roi', 'leaderboard', 'custom report', 'team performance'],
        body: [
            { list: [
                { term: 'Leads & SQLs', text: 'leads created, the share that became SQL, time to SQL, the funnel, and breakdowns by source, owner and disqualification reason.' },
                { term: 'Pipeline', text: 'open pipeline by owner and by expected close month.' },
                { term: 'Forecast', text: 'quarter-by-quarter and year-by-year forecast with won, commit, best case and target. Each row links to the deals it counts.' },
                { term: 'Targets & leaderboard', text: 'target against won, commit and best case per rep, and the leaderboard for the chosen period.' },
                { term: 'Team performance', text: 'activities, calls, meetings, emails, leads, SQLs, deals and conversion rates per rep.' },
                { term: 'Campaign ROI', text: 'for each campaign: contacts emailed, replies, leads, SQLs, opportunities, pipeline and revenue won.' },
                { term: 'Custom reports', text: 'build your own; see "Custom reports".' },
            ] },
            { p: 'The team picker and period picker at the top apply to every tab.' },
        ],
        related: ['custom-reports', 'forecasting', 'targets'],
    },
    {
        id: 'custom-reports', category: 'Sales', title: 'Custom reports', routes: ['/app/sales-reports?tab=custom'],
        summary: 'Build, save and share your own reports on leads, deals, contacts, activities and tasks.',
        keywords: ['report builder', 'matrix', 'group by', 'saved report'],
        body: [
            { steps: [
                'Choose what to **Show** (a count, total amount or average amount), **of** which records, and **by** which field.',
                'Optionally add a second grouping (**and**) for a matrix, a date range, and **Filter** conditions.',
                'Click **Run**. Switch between bars and a table.',
                'Name it and **Save report**; tick **Share with workspace** to share it.',
            ] },
            { note: 'Managers build reports. Anyone can open a shared report, and each person only sees their own and their team\'s records in it.' },
        ],
        related: ['sales-reports'],
    },
    {
        id: 'targets', category: 'Sales', title: 'Revenue targets', routes: ['/app/sales-targets'],
        summary: 'Quarterly revenue targets for each person, used by the forecast and target reports.',
        keywords: ['quota', 'target', 'goal'],
        body: [
            { p: 'Pick the financial year with the arrows, type a target in a quarter and click away to save. Totals show per person and for everyone shown.' },
            { p: 'Admins and L1 can set anyone\'s target; managers set targets for the people below them. A manager\'s own target is separate from their team\'s.' },
        ],
        related: ['forecasting', 'sales-reports'],
    },
];

const WORKSPACE = [
    {
        id: 'sales-team', category: 'Workspace & settings', title: 'Sales team', routes: ['/app/sales-team'],
        summary: 'Set each person\'s sales level and who they report to.',
        keywords: ['hierarchy', 'level', 'manager', 'reports to', 'org chart'],
        body: [
            { p: 'For each person choose a **Level** (L1 CEO / COO / Sales Head, L2 Business Development, L3 Business Executive, L4 Market Research) and who they **Report to**. People without a level are **Not in sales hierarchy**.' },
            { p: 'The hierarchy decides what managers see and how team reports add up.' },
        ],
        related: ['roles-and-visibility', 'targets'],
    },
    {
        id: 'sales-settings', category: 'Workspace & settings', title: 'Sales settings', routes: ['/app/sales-settings'],
        summary: 'Lead routing, closing rules, amount visibility, workflow rules and products. Admins only.',
        keywords: ['settings', 'round robin', 'assignment', 'region', 'reasons', 'stale', 'products', 'price list'],
        body: [
            { h: 'Lead assignment' },
            { list: [
                { term: 'Off', text: 'a new lead belongs to whoever creates it (or the contact\'s owner).' },
                { term: 'Round robin', text: 'new unowned leads go to the people you tick, in turn.' },
                { term: 'By region', text: 'match the contact\'s country or state to a person; unmatched leads use the round-robin pool.' },
            ] },
            { h: 'Disqualifying leads and closing deals' },
            { p: 'Edit the disqualification reasons and the default recycle period, the win and loss reasons, whether a reason is required to close a deal, and after how many quiet days an open deal counts as stale.' },
            { h: 'Who can see amounts' },
            { p: 'Hide money from chosen roles or sales levels. Admins always see amounts.' },
            { p: 'Remember to click **Save settings**.' },
            { h: 'Also on this screen' },
            { p: '**Workflow rules** and **Products and price list**; see their own articles.' },
        ],
        related: ['workflow-rules', 'products', 'leads'],
    },
    {
        id: 'workflow-rules', category: 'Workspace & settings', title: 'Workflow rules',
        summary: 'Automate follow-ups: when a field changes on a lead, deal or contact, create a task, send an alert or set a field.',
        keywords: ['automation', 'trigger', 'rule', 'alert'],
        body: [
            { steps: [
                'In **Sales settings**, click **New rule** and name it.',
                'Choose the record (**Lead**, **Deal** or **Contact**), the field to watch and the condition: **changes**, **changes to** a value, or **becomes greater than** a number.',
                'Add actions: **Create a task** (title, due in days, assignee), **Send an alert** (to the owner, their manager or whoever made the change) or **Set a field**.',
                'Save. Untick **Active** to pause a rule. The list shows how many times each rule has run.',
            ] },
            { tip: 'Use {name} in a task title or alert to insert the record\'s name, for example "Follow up on the proposal for {name}".' },
        ],
        related: ['sales-settings', 'tasks', 'notifications'],
    },
    {
        id: 'products', category: 'Workspace & settings', title: 'Products and price list',
        summary: 'The products and prices used on quote lines.',
        keywords: ['product', 'sku', 'price', 'quote'],
        body: [
            { p: 'In **Sales settings** → **Products and price list**, add products with a name, SKU, unit price, unit and description. Untick **Available on new quotes** to retire a product without removing it from old quotes.' },
            { p: 'On a deal, **Quote & PDF** lets reps pick these products; price and name fill in automatically and can still be changed per quote.' },
        ],
        related: ['deal-page', 'sales-settings'],
    },
    {
        id: 'calendar-sync', category: 'Workspace & settings', title: 'Email and calendar sync', routes: ['/app/connections'],
        summary: 'Connect your own Google or Microsoft account so emails and meetings with contacts appear on their timelines.',
        keywords: ['gmail', 'outlook', 'google calendar', 'microsoft 365', 'sync', 'connect'],
        body: [
            { steps: [
                'Click **Connect Google** or **Connect Microsoft** and sign in.',
                'Choose **Log emails** and/or **Log meetings and add deal meetings to my calendar**.',
                'Sync runs every 10 minutes; **Sync now** runs it straight away.',
            ] },
            { p: 'Only emails and meetings with people already in your contacts are logged; other mail is never stored. **Disconnect** stops syncing; items already logged stay.' },
            { note: 'If the Connect button is disabled, your administrator has not set up the Google or Microsoft app on the server yet.' },
        ],
        related: ['deal-page', 'contact-record'],
    },
    {
        id: 'account-security', category: 'Workspace & settings', title: 'Two-factor authentication (account security)',
        routes: ['/app/account/security', '/admin/security'],
        summary: 'Protect your sign-in with a 6-digit code from an authenticator app, keep recovery codes, and require two-factor for the whole workspace.',
        keywords: ['2fa', 'mfa', 'two-factor', 'two factor', 'authenticator', 'totp', 'otp', 'recovery codes', 'security', 'sign in', 'login', 'qr code'],
        body: [
            { p: 'Open it from your initials in the top bar → **Security (two-factor)**. With two-factor on, signing in asks for your password and then a 6-digit code from an app on your phone, so a stolen password alone is not enough. Magic links and Google sign-in ask for the code too.' },
            { h: 'Turn it on' },
            { steps: [
                'Install an authenticator app on your phone, such as Google Authenticator, Microsoft Authenticator, 1Password or Authy.',
                'Click **Set up two-factor**, then **Continue**.',
                'In the app, add an account and scan the QR code. If you cannot scan it, type the key shown next to it.',
                'Enter the 6-digit code the app shows and click **Turn on two-factor**.',
                'Save the 10 recovery codes (**Copy** or **Download**) somewhere safe, then click **I\'ve saved them**. They are not shown again.',
            ] },
            { h: 'Signing in' },
            { p: 'After your password, enter the current code from the app. Codes change every 30 seconds and each one works only once. Lost your phone? Click **Use a recovery code** and enter one of your saved codes; each recovery code works once.' },
            { tip: 'If a code is refused, check that your phone\'s clock is set automatically, then wait for the next code. After 5 wrong codes you have to sign in again.' },
            { h: 'Recovery codes and turning it off' },
            { list: [
                { term: 'New recovery codes', text: 'replaces all of your recovery codes (for example when you have used several). Needs a code from the app.' },
                { term: 'Turn off', text: 'needs your password and a code from the app or a recovery code. It is not available when your workspace requires two-factor.' },
            ] },
            { h: 'Requiring it for everyone (Super Admin)' },
            { p: 'Super Admins see **Require two-factor for everyone in this workspace**. Turn on two-factor for your own account first. From then on, anyone without it is taken to the Security screen right after signing in and cannot use anything else until they set it up.' },
            { note: 'Keep your recovery codes somewhere other than your phone. Without the phone or a recovery code you cannot sign in.' },
        ],
        related: ['getting-started', 'team-management', 'roles-and-visibility'],
    },
];

export const ARTICLES = [...GENERAL, ...OUTREACH_ARTICLES, ...CRM, ...SALES, ...WORKSPACE];
