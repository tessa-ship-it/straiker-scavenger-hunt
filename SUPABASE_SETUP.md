# Supabase Setup Guide — Straiker: Signal Detection

Follow these steps in order. It takes about 10 minutes.

---

## Step 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Give it a name (e.g. `straiker-signal-detection`), choose a region close to your conference venue, and set a database password.
4. Click **Create new project** and wait ~2 minutes for provisioning.

---

## Step 2 — Run the database schema

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar.
2. Click **New query**, paste the entire block below, and click **Run**.

```sql
-- ── Players ──────────────────────────────────────────
create table if not exists players (
  id         uuid default gen_random_uuid() primary key,
  name       text not null,
  email      text unique not null,
  created_at timestamptz default now()
);

-- ── Missions (seeded) ────────────────────────────────
create table if not exists missions (
  id           int primary key,
  name         text not null,
  description  text not null,
  points       int not null,
  category     text not null,
  icon         text,
  riddle_answer text,
  mission_type text not null check (mission_type in ('Riddle', 'Photo'))
);

-- ── Submissions ──────────────────────────────────────
create table if not exists submissions (
  id           uuid default gen_random_uuid() primary key,
  player_id    uuid references players(id) on delete cascade not null,
  mission_id   int  references missions(id) on delete cascade not null,
  answer_text  text,
  image_url    text,
  points_earned int not null,
  submitted_at timestamptz default now(),
  unique (player_id, mission_id)  -- one submission per mission per player
);

-- ── Leaderboard view ─────────────────────────────────
create or replace view leaderboard as
select
  p.id,
  p.name,
  p.email,
  coalesce(sum(s.points_earned), 0)::int as total_points,
  count(s.id)::int                        as missions_completed
from players p
left join submissions s on s.player_id = p.id
group by p.id, p.name, p.email
order by total_points desc;
```

---

## Step 3 — Seed the 20 missions

Still in the SQL Editor, run this second query:

```sql
insert into missions (id, name, description, points, category, icon, riddle_answer, mission_type) values
(1,  'The Ghost in the Machine',    'I am everywhere on the expo floor but have no physical form. I am the intelligence that often lacks a brain.', 100, 'Signal Detection',    '👻', 'AI',         'Riddle'),
(2,  'The Legacy Lag',              'Find a piece of tech or a sign that looks like it hasn''t been updated since 2005.',                           50,  'Operational Recon',   '📟', null,         'Photo'),
(3,  'The Constant Variable',       'I am your most valuable currency. You give me away to every scanner but never have enough of me.',              100, 'Signal Detection',    '⏳', 'Time',       'Riddle'),
(4,  'The 5-Word Wonder',           'Find a booth sign that explains a product in 5 words or less.',                                                100, 'Precision Drill',     '🎯', null,         'Photo'),
(5,  'The Silent Guardian',         'I am the wall you cannot see and the Zero everyone is trusting.',                                              100, 'Signal Detection',    '🛡️', 'Zero Trust', 'Riddle'),
(6,  'The Human Battery',           'Take a photo of your emergency caffeine or snack.',                                                            50,  'Survival Tactics',    '☕', null,         'Photo'),
(7,  'The Modern Scroll',           'I am black and white and square all over. I hold a thousand words but speak none.',                            100, 'Signal Detection',    '🏁', 'QR Code',    'Riddle'),
(8,  'The Vague-Tech Sign',         'Find a sign that uses a word like ''Transform'' or ''Empower'' without saying what the product does.',         100, 'Noise Identification','🌫️', null,         'Photo'),
(9,  'The Straiker Philosophy',     'I am the difference between a spray of bullets and a single lethal shot.',                                     150, 'Signal Detection',    '🎯', 'Precision',  'Riddle'),
(10, 'The Stealth Charge',          'A photo of a phone charging in a creative (non-desk) location.',                                               100, 'Operational Recon',   '⚡', null,         'Photo'),
(11, 'The Shortcut',                'Find a side door or staff-only path that saves you time.',                                                     150, 'Efficiency',          '🏃', null,         'Photo'),
(12, 'The Over-Designed Diagram',   'Find a booth graphic with more than 5 intersecting circles or 10 arrows.',                                     100, 'Noise Identification','🍝', null,         'Photo'),
(13, 'The Minimalist',              'Find the smallest, most compact piece of technology on the expo floor.',                                        150, 'Precision Drill',     '🔍', null,         'Photo'),
(14, 'The Pattern Match',           'Spot three people in the same vendor uniform (matching vests/shirts).',                                         100, 'Operational Recon',   '👥', null,         'Photo'),
(15, 'The Analog Backup',           'Find someone taking notes with an actual pen and paper in a high-tech session.',                               150, 'Reliability',         '📝', null,         'Photo'),
(16, 'The Straiker Safehouse',      'Visit the Straiker booth and identify the "Secret Code" on the counter.',                                      200, 'Extraction',          '🏠', null,         'Photo'),
(17, 'The Intel Exchange',          'A photo of you swapping a "Noise" flyer for a Straiker sticker.',                                             250, 'Extraction',          '🔄', null,         'Photo'),
(18, 'The Tactical Selfie',         'A photo with a Straiker team member (extra points for a serious face).',                                       250, 'Extraction',          '📸', null,         'Photo'),
(19, 'The View from the Top',       'A photo of the expo floor from the highest vantage point you can find.',                                       300, 'Operational Recon',   '🦅', null,         'Photo'),
(20, 'The Extraction',              'Final mission: Reach the Straiker booth to claim your gear.',                                                   500, 'Extraction',          '🎁', null,         'Photo')
on conflict (id) do nothing;
```

---

## Step 4 — Create the photo storage bucket

1. Click **Storage** in the left sidebar.
2. Click **New bucket**.
3. Name it exactly: `mission-photos`
4. Toggle **Public bucket** ON (attendees need to view their own uploaded photos).
5. Click **Save**.

---

## Step 5 — Set Row Level Security (RLS) policies

Go back to **SQL Editor** and run:

```sql
-- Enable RLS on all tables
alter table players    enable row level security;
alter table missions   enable row level security;
alter table submissions enable row level security;

-- Players: anyone can register (insert) and read all players
create policy "allow_insert_players"  on players for insert with check (true);
create policy "allow_select_players"  on players for select using (true);

-- Missions: read-only for everyone
create policy "allow_select_missions" on missions for select using (true);

-- Submissions: anyone can insert or read (conference honor system)
create policy "allow_insert_submissions" on submissions for insert with check (true);
create policy "allow_select_submissions" on submissions for select using (true);

-- Storage: public read, authenticated insert
create policy "allow_public_read_photos"
  on storage.objects for select
  using (bucket_id = 'mission-photos');

create policy "allow_upload_photos"
  on storage.objects for insert
  with check (bucket_id = 'mission-photos');
```

---

## Step 6 — Enable Realtime for the leaderboard

1. Go to **Database → Replication** (or search "Replication" in the sidebar).
2. Find the `submissions` table and toggle **Realtime** ON.
   - This allows the leaderboard to update live as submissions come in.

---

## Step 7 — Get your API keys

1. Go to **Project Settings → API** (gear icon in the sidebar).
2. Copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon / public** key (long JWT string)

---

## Step 8 — Wire up the app

In the `straiker-scavenger-hunt/` folder:

```bash
# 1. Copy the env template
cp .env.example .env

# 2. Open .env and fill in your keys
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...your-full-anon-key...

# 3. Install dependencies
npm install

# 4. Run the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — you should see the registration screen.

---

## Step 9 — Deploy (optional but recommended for conference day)

**Vercel (easiest):**

```bash
npm install -g vercel
vercel
```

When prompted, add your environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Vercel will give you a public URL like `https://straiker-signal.vercel.app` that all attendees can use on their phones.

**Netlify:**

```bash
npm run build
# Drag and drop the `dist/` folder to netlify.com/drop
# Then add environment variables in Site settings → Environment variables
```

---

## Riddle Answers Reference

| Mission | Answer (case-insensitive) |
|---------|--------------------------|
| The Ghost in the Machine | `AI` |
| The Constant Variable | `Time` |
| The Silent Guardian | `Zero Trust` |
| The Modern Scroll | `QR Code` |
| The Straiker Philosophy | `Precision` |

Answers are validated client-side. The app normalises both inputs to lowercase before comparing, so `ai`, `AI`, and `Ai` all work.

---

## Troubleshooting

**"Missing VITE_SUPABASE_URL"** — Make sure your `.env` file exists and both variables are filled in (no quotes needed around values).

**Photos not uploading** — Double-check the storage bucket is named exactly `mission-photos` and the RLS upload policy was applied.

**Leaderboard not updating in real-time** — Confirm Realtime is toggled on for the `submissions` table in Database → Replication.

**Duplicate submission error** — Expected behaviour — each player can only submit each mission once. The app handles this gracefully.
