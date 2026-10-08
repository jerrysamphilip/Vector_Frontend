// Help for the outreach screens: campaigns, inbox, sending, analytics.

export const OUTREACH_ARTICLES = [
    {
        id: 'inbox', category: 'Outreach', title: 'Inbox', routes: ['/app/inbox'],
        summary: 'Every reply to your campaigns, from all your sending mailboxes, in one place.',
        keywords: ['replies', 'unified inbox', 'conversation', 'reply', 'imap', 'sync'],
        body: [
            { p: 'Conversations are on the left (search by name, email or subject); the selected thread is on the right. Replies, bounces (shown as **Delivery Failed** from System) and your sent emails appear in order.' },
            { list: [
                { term: 'Sync', text: 'pulls new replies from your mail provider now (it also runs on its own).' },
                { term: 'Reply', text: 'type in the box and press **Enter** to send (Shift + Enter for a new line).' },
                { term: 'Templates', text: 'inserts a template from the library, filled in for this contact.' },
                { term: 'Create lead', text: 'under a reply, turns the conversation into a sales lead and opens it.' },
            ] },
            { note: 'If you see **IMAP not configured — replies cannot be received**, the sending mailbox has no incoming-mail settings. Add them under **Email accounts** (or the campaign\'s **Sending Accounts** tab).' },
        ],
        related: ['templates', 'email-accounts', 'leads'],
    },
    {
        id: 'campaigns', category: 'Outreach', title: 'Campaigns', routes: ['/app/campaigns'],
        summary: 'All your email campaigns with their sending results.',
        keywords: ['campaign list', 'pause', 'resume', 'bounce', 'columns'],
        body: [
            { p: 'Search by name, and use the column settings button to choose which result columns to show (**In Progress**, **Sent**, **Opened**, **Replied**, **Bounced**, **Sender Bounced**, **Positive**, **Replied w/o OOO**).' },
            { p: 'Status is **Active**, **Paused**, **Completed**, **Draft** or **Error**. Warning chips flag problems: **List quality issue** (bounce rate above 3%) and **Infra issue** (sender bounce rate above 2%).' },
            { list: [
                'Click a row (or **View**) to open the campaign.',
                '**Pause** / **Resume** an active campaign; **Delete** removes it.',
                'Tick several campaigns to pause, resume or delete them together.',
            ] },
            { p: '**Create New Campaign** starts the campaign wizard.' },
        ],
        related: ['create-campaign', 'campaign-details', 'campaign-analytics'],
    },
    {
        id: 'create-campaign', category: 'Outreach', title: 'Creating a campaign', routes: ['/app/campaigns/new'],
        summary: 'The five-step wizard: Details, Sequence, Prospects, Templates, Launch. Your draft is saved as you go.',
        keywords: ['new campaign', 'wizard', 'sequence', 'send window', 'sender', 'ai templates', 'persona', 'launch'],
        body: [
            { h: '1. Details' },
            { list: [
                '**Campaign Name**, the **Company Profile** to send as, and **AI Context**: a description of your offer that powers email generation.',
                '**Sender Rotation Pool**: the mailboxes to send from (connect them first under Email accounts). Add **Sender Name**, **Sender Title** and a **CTA / Booking Link**.',
                '**Delivery Settings**: timezone, **Send Window**, and how emails are spread (**Spread Evenly**, **Random** or **Batches**), an optional **Daily Batch Limit**, and a **Campaign Start Date**.',
                'Options: **Personalize subject with first name** and **Clickable unsubscribe link** (plain-text reply-based by default, which is kinder to deliverability).',
            ] },
            { h: '2. Sequence' },
            { p: 'Up to 7 emails. The first is sent on launch; each follow-up waits the number of days you set. Use **Add Follow-up Step**, then **Save Sequence**.' },
            { h: '3. Prospects' },
            { p: 'Pick an existing list or upload a new file (**Validate & Preview** filters invalid emails and lets you fix rows before **Confirm & Create List**). **Process & Generate Templates** then writes emails for each persona in your list.' },
            { h: '4. Templates' },
            { p: 'Prospects are grouped into personas. For each one, review the subject and email for every step; **Edit** or **Regenerate** them, add **Attachments**, and preview with real prospect data.' },
            { h: '5. Launch' },
            { p: 'Check the summary (audience, senders, sending window, daily schedule and timeline), then **Execute Campaign**.' },
            { tip: 'Each person can start outreach to at most 500 new contacts a day; extra first emails go out the next day. Follow-ups are not limited.' },
        ],
        related: ['campaign-details', 'email-accounts', 'prospect-lists'],
    },
    {
        id: 'campaign-details', category: 'Outreach', title: 'A campaign\'s page', routes: ['/app/campaigns/:id'],
        summary: 'Results, replies, prospects, emails, schedule and senders for one campaign.',
        keywords: ['campaign tabs', 'analytics', 'schedule', 'prospects', 'subsequence', 'send now', 'paused'],
        body: [
            { p: 'At the top: **Pause Campaign** / **Resume Campaign**, and **⚡ Send Now** to send what is queued straight away, ignoring the send window. A campaign can be **paused automatically** to protect your sending reputation; the banner says why and how to fix it.' },
            { list: [
                { term: 'Analytics', text: 'campaign health, today\'s sending against the limit, the main counts (contacted, opened, clean replies, positive replies, bounces, unsubscribes), a chart over time and per-email results. Click an email to see its template and recent replies.' },
                { term: 'Inbox', text: 'replies to this campaign only; see "Inbox".' },
                { term: 'Prospects', text: 'everyone enrolled, filtered by status (In Progress, Bounced, Replied, Completed, Paused, Unsubscribed). Edit a prospect, add a note, remove them, or **Add Prospects** from a list.' },
                { term: 'Subsequence', text: 'the emails in the sequence. **Approve** each step (or **Approve All**), **Regenerate**, edit subject, body and attachments, and change wait days in **Edit Sequence**.' },
                { term: 'Schedule', text: 'what is sent, paused or queued, day by day. **Edit** a day to move its queued emails.' },
                { term: 'Trigger logs', text: 'a log of system events for the campaign.' },
                { term: 'Sending Accounts', text: 'the mailboxes this campaign sends from, their daily limits and sync status; edit their SMTP/IMAP settings or **Assign Inboxes**.' },
            ] },
        ],
        related: ['campaigns', 'inbox', 'email-accounts'],
    },
    {
        id: 'campaign-analytics', category: 'Outreach', title: 'Campaign analytics', routes: ['/app/analytics', '/app/settings'],
        summary: 'Sending results across all campaigns, and alerts about your senders.',
        keywords: ['dashboard', 'open rate', 'reply rate', 'bounce rate', 'alert center', 'alerts'],
        body: [
            { p: 'Choose **Daily**, **Weekly**, **Monthly** or **Yearly** for the sent-versus-opened chart. Below it are totals (sent, opens, replies, bounces, unsubscribes), rates (open, reply, bounce, unsubscribe), the number of active campaigns, a campaign status chart, recent activity and a table of campaigns.' },
            { h: 'Alert Center' },
            { p: 'The bell button on this page opens the Alert Center: domain reputation problems, suspended alerts, mailboxes whose reply sync has gone stale, and paused campaigns, each with a link to fix it. Choose which alerts you get under **Email accounts** → **Alert Preferences**.' },
        ],
        related: ['reports', 'domain-health', 'email-accounts'],
    },
    {
        id: 'templates', category: 'Outreach', title: 'Email templates', routes: ['/app/templates'],
        summary: 'Reusable messages with merge fields, for replies from the Inbox.',
        keywords: ['template library', 'merge fields', 'snippets', 'canned response'],
        body: [
            { steps: [
                'Click **New template**. Give it a name, a category, a subject and a body.',
                'Click where you want a merge field and pick it (first name, company, job title, your name, calendar link and more). It is filled in for each contact when used.',
                'Tick **Share with everyone in the workspace** to share it, or leave it private.',
            ] },
            { p: 'Use a template from the **Templates** button in the Inbox reply box. The library shows how often each template is used; the eye icon previews it with sample values.' },
        ],
        related: ['inbox'],
    },
    {
        id: 'ai-email', category: 'Outreach', title: 'AI email writer', routes: ['/app/ai-email'],
        summary: 'Classify a prospect\'s persona and check an email for spam triggers.',
        keywords: ['ai', 'persona', 'generator', 'spam', 'compliance'],
        body: [
            { list: [
                { term: 'Classify Persona', text: 'enter a **Designation / Job Title** (plus company and product if you like) to see which persona the prospect fits and how confident the match is. Campaign templates are written per persona.' },
                { term: '3-Email Sequence', text: 'shows a three-email outline (introduction on day 1, reminder on day 3, last chance on day 7) to copy and adapt.' },
                { term: 'Compliance Check', text: 'a spam score out of 100, whether an unsubscribe link is present, and any flagged phrases.' },
            ] },
            { note: 'Personalised emails for real prospects are generated inside the campaign wizard (step 4), using your campaign\'s AI Context.' },
        ],
        related: ['create-campaign'],
    },
    {
        id: 'email-accounts', category: 'Outreach', title: 'Email accounts and warmup', routes: ['/app/inboxes'],
        summary: 'Connect the mailboxes you send from, warm them up, and keep an eye on their health.',
        keywords: ['mailbox', 'inbox', 'smtp', 'imap', 'password', 'credentials', 'edit', 'test connection', 'warmup', 'microsoft 365', 'outlook', 'google', 'reputation', 'daily limit'],
        body: [
            { h: 'Connecting a mailbox' },
            { steps: [
                'Click **Connect Mailbox** and choose **Google**, **Outlook** or **SMTP** (any other provider).',
                'Enter the email address and a **Daily Limit** (500 by default), then the **SMTP (Sending)** and **IMAP (Receiving)** details. Use an app password where your provider requires one. Tick **Use SSL (port 465)** if your provider needs it.',
                'If asked, add the DNS records shown under **Verify Domain Ownership**.',
            ] },
            { p: 'Microsoft 365 mailboxes can connect with **Connect with Microsoft 365 (OAuth)** instead of a password. Replies start syncing within a few minutes.' },
            { h: 'Changing sending or receiving settings' },
            { steps: [
                'Click the mailbox row and open the **Connection** tab. It shows the SMTP (sending) and IMAP (receiving) server, username, and whether a password is saved.',
                'Click **Edit sending & receiving settings** (or the pencil on the row). Change hosts, ports, usernames or passwords. Leave a password blank to keep the saved one.',
                'Save, then use **Test sending sign-in** and **Test receiving sign-in** to check the new settings. Tests sign in only; nothing is sent.',
            ] },
            { h: 'Warmup' },
            { p: 'Warmup gradually builds a new mailbox\'s reputation. Turn it on per mailbox; open a mailbox for its reputation score, today\'s targets, a 14-day trend and settings such as daily volume and reply rate. **Run Warmup** starts a cycle now.' },
            { h: 'Health' },
            { p: 'The tiles count accounts, warmup activity, emails planned and sent today, and issues. Filter by **Healthy**, **Issues**, **Warmup On** or **Warmup Off**. Problems such as sign-in failures or failing reply sync show on the mailbox row.' },
            { p: '**Alert Preferences** sets which problems alert you, whether by email too, and how often.' },
        ],
        related: ['domain-health', 'inbox', 'campaign-details'],
    },
    {
        id: 'domain-health', category: 'Outreach', title: 'Domain health', routes: ['/app/domain-health'],
        summary: 'Deliverability and authentication for each domain you send from.',
        keywords: ['spf', 'dkim', 'dmarc', 'blacklist', 'reputation', 'deliverability'],
        body: [
            { p: 'Each sending domain (taken from your connected mailboxes) shows a reputation score, whether it is blacklisted, and its **SPF**, **DKIM** and **DMARC** status: pass, warning, fail or unknown.' },
            { list: [
                '**Run Diagnostics** checks the domains again.',
                '**Details** shows the domain\'s campaign activity and connected inboxes.',
                'The tiles show overall health, active domains, domains at risk and mailboxes.',
            ] },
            { tip: 'Fix any SPF, DKIM or DMARC failure with your DNS provider before sending more; failing authentication is the most common cause of mail going to spam.' },
        ],
        related: ['email-accounts', 'campaign-analytics'],
    },
    {
        id: 'reports', category: 'Outreach', title: 'Analytics & reports', routes: ['/app/reports'],
        summary: 'Detailed outreach reporting by campaign, mailbox, provider and team member.',
        keywords: ['export', 'csv', 'word', 'team performance', 'mailbox health', 'providers'],
        body: [
            { p: 'Pick a person (or **All Users**) and a period (**7d**, **30d**, **90d**, **365d**).' },
            { list: [
                'Open, reply, bounce rates and volumes, and engagement over time.',
                'How many leads it takes to get a first reply, the follow-up reply rate and the median time to first reply.',
                'Results by email provider, mailbox health, top campaigns and team performance.',
            ] },
            { p: '**Export CSV** or **Export Word** downloads the report; tables also have their own **Export CSV**.' },
        ],
        related: ['campaign-analytics', 'sales-reports'],
    },
    {
        id: 'prospect-lists', category: 'Outreach', title: 'Prospect lists', routes: ['/app/prospects', '/app/prospects/validate'],
        summary: 'Upload and validate lists of prospects to use in campaigns.',
        keywords: ['upload', 'validate', 'csv', 'excel', 'bounced', 'revalidate'],
        body: [
            { steps: [
                'Click **New List**, name it and drop in an .xlsx, .xls or .csv file (up to 10 MB).',
                'Click **Validate & Continue**. Rows are checked; fix or delete any that **Need Attention**, then **Revalidate**.',
                'Click **Confirm Upload**.',
            ] },
            { p: '**View** opens a list to search, edit, add to another list or delete prospects. The tiles count all contacts, how many are in campaigns, and how many have opted out.' },
            { p: '**Revalidate Bounced** (admins) lists hard-bounced contacts so you can correct an address with a reason for the record. Unsubscribes cannot be overridden.' },
        ],
        related: ['create-campaign', 'lists', 'import'],
    },
    {
        id: 'automation-rules', category: 'Outreach', title: 'Campaign automation rules', routes: ['/app/automation'],
        summary: 'Act automatically on how recipients respond to a campaign.',
        keywords: ['automation', 'trigger', 'opened', 'clicked', 'no reply'],
        body: [
            { steps: [
                'Click **Create New Rule** and give it a **Rule Name**.',
                'Choose the **Target Campaign** and the **Trigger**: **If Email Opened**, **If Email Clicked** or **If No Reply**, with a **Delay (Hours)**.',
                'Choose the **Action**: **Send AI Template** (pick the template) or **Pause Campaign**, then **Create Rule**.',
            ] },
            { p: 'Use **Pause Rule** / **Activate Rule** to switch a rule off and on, or **Delete Rule** to remove it.' },
            { note: 'For rules on leads, deals and contacts (create a task, send an alert, set a field), see "Workflow rules".' },
        ],
        related: ['campaign-details', 'workflow-rules'],
    },
    {
        id: 'team-management', category: 'Workspace & settings', title: 'Team', routes: ['/app/team'],
        summary: 'Invite people, set their role and permissions, and deactivate leavers. Admins only.',
        keywords: ['invite', 'users', 'members', 'permissions', 'deactivate', 'role'],
        body: [
            { steps: [
                'Click **Invite Member**, enter their email and choose a **Role** (Admin, Manager or Agent; Super Admins can also invite Super Admins).',
                'They get an email invitation. If email delivery fails, you are shown their sign-in details to share.',
            ] },
            { p: '**Permissions** fine-tunes what each person can do beyond their role: **Manage Campaigns**, **Manage Templates**, **Manage Inboxes**, **Manage Prospects**, **View Analytics**, **Export Data**, **Manage Team**.' },
            { p: '**Deactivate** stops someone signing in (their records stay); **Reactivate** brings them back; **Revoke** cancels a pending invite. Super Admin roles cannot be changed here.' },
            { note: 'Set sales levels and managers separately, on **Sales team**.' },
        ],
        related: ['roles-and-visibility', 'sales-team'],
    },
];
