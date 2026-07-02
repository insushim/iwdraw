-- ArtON 초기 스키마 + RLS (7way 검수 반영: DESIGN-REVIEW A1~A5, B)
-- 원칙: 교사=Supabase Auth(매직링크). 학생=계정 없음, join-class Edge Function이 커스텀 JWT 발급.
--       학생 쓰기는 Edge Function(SECURITY DEFINER RPC/서버) 경유만 — 테이블 직접 INSERT는 RLS로 차단.

create extension if not exists pgcrypto;

-- ── 교사 ──
create table public.teachers (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '선생님',
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now()
);

-- ── 학급 ──
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  name text not null default '우리 반',
  code char(6) not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index classes_teacher_idx on public.classes(teacher_id);
create index classes_code_idx on public.classes(code) where is_active;

-- ── 학생(개인정보 없음: 닉네임/아바타 시드만) ──
create table public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  nickname text not null,
  avatar_seed text not null default '',
  created_at timestamptz not null default now()
);
create index students_class_idx on public.students(class_id);

-- ── 도안 템플릿 ──
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.teachers(id) on delete cascade,
  category text not null,
  title text not null,
  grade text not null default 'low' check (grade in ('low','mid','high')),
  subject_ko text not null default '',
  image_path text not null,   -- 색칠 캔버스 라인아트(png)
  thumb_path text not null,   -- 썸네일(webp)
  print_path text,            -- 인쇄용(svg) 선택
  is_builtin boolean not null default false,
  created_at timestamptz not null default now(),
  -- 무효 상태 방지(cr 6): 기본제공↔소유자 상호배타
  constraint templates_owner_check check (
    (is_builtin and owner_id is null) or (not is_builtin and owner_id is not null)
  )
);
create index templates_category_idx on public.templates(category);
create index templates_owner_idx on public.templates(owner_id);

-- ── 작품 ──
create table public.artworks (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  mode text not null default 'sketch',
  image_path text not null,
  thumb_path text not null,
  timelapse_path text,
  is_approved boolean not null default false,
  like_count integer not null default 0,  -- 캐시(원천은 artwork_likes)
  created_at timestamptz not null default now()
);
create index artworks_class_idx on public.artworks(class_id);
create index artworks_approved_idx on public.artworks(class_id, is_approved);

-- ── 좋아요(중복 방지, cr 7) ──
create table public.artwork_likes (
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  voter_key text not null,   -- 학생 studentId 또는 익명 기기키
  created_at timestamptz not null default now(),
  primary key (artwork_id, voter_key)
);

-- ── 협동 방(cr 4: unique code + host + 만료) ──
create table public.collab_rooms (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  host_teacher_id uuid not null references public.teachers(id) on delete cascade,
  code char(6) not null unique,
  max_users integer not null default 6,
  is_locked boolean not null default false,
  expires_at timestamptz not null default (now() + interval '6 hours'),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
create index collab_rooms_code_idx on public.collab_rooms(code) where closed_at is null;

-- ── 학급코드 브루트포스 방어(A2): join 시도 기록 ──
create table public.join_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  code_tried char(6) not null,
  success boolean not null default false,
  created_at timestamptz not null default now()
);
create index join_attempts_ip_idx on public.join_attempts(ip_hash, created_at desc);

-- ── 구독/결제(A5: 빌링키 자동결제 골격, 기본 비활성) ──
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade unique,
  status text not null default 'none' check (status in ('none','active','past_due','canceled')),
  billing_key text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  order_id text not null unique,        -- 멱등성(A5)
  payment_key text unique,
  amount integer not null,
  status text not null default 'pending' check (status in ('pending','done','failed','canceled')),
  idempotency_key text unique,
  created_at timestamptz not null default now()
);
create index payments_teacher_idx on public.payments(teacher_id);

-- ═══════════════════════ RLS ═══════════════════════
alter table public.teachers enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.templates enable row level security;
alter table public.artworks enable row level security;
alter table public.artwork_likes enable row level security;
alter table public.collab_rooms enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
-- join_attempts는 서비스 롤(Edge Function)만 접근 — 정책 없음 = 전부 차단

-- 커스텀 JWT claim 헬퍼: 학생 토큰의 class_id / student_id
create or replace function public.jwt_class_id() returns uuid
  language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'class_id','')::uuid
$$;
create or replace function public.jwt_student_id() returns uuid
  language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'student_id','')::uuid
$$;
create or replace function public.jwt_role() returns text
  language sql stable as $$
  select coalesce(current_setting('request.jwt.claims', true)::json->>'role','')
$$;

-- teachers: 본인만
create policy teachers_self on public.teachers
  for all using (id = auth.uid()) with check (id = auth.uid());

-- classes: 교사 자기 학급 CRUD / 학생은 자기 class_id만 조회
create policy classes_owner on public.classes
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy classes_student_read on public.classes
  for select using (id = public.jwt_class_id());

-- students: 교사는 자기 학급 학생 조회, 학생은 자기 학급 동료 조회(협동 표시). 쓰기는 Edge Function(service role)만.
create policy students_teacher_read on public.students
  for select using (
    exists (select 1 from public.classes c where c.id = students.class_id and c.teacher_id = auth.uid())
  );
create policy students_peer_read on public.students
  for select using (class_id = public.jwt_class_id());

-- templates: 기본제공은 누구나 읽기, 교사 소유분은 소유자만
create policy templates_read_builtin on public.templates
  for select using (is_builtin = true);
create policy templates_owner_all on public.templates
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- artworks: 교사는 자기 학급 전체 / 학생은 자기 학급의 (승인작 또는 본인작) 조회.
--           INSERT/UPDATE 위조 차단(A1): 직접 쓰기는 정책 없음 → Edge Function(service role)만.
create policy artworks_teacher_all on public.artworks
  for all using (
    exists (select 1 from public.classes c where c.id = artworks.class_id and c.teacher_id = auth.uid())
  ) with check (
    exists (select 1 from public.classes c where c.id = artworks.class_id and c.teacher_id = auth.uid())
  );
create policy artworks_student_read on public.artworks
  for select using (
    class_id = public.jwt_class_id() and (is_approved = true or student_id = public.jwt_student_id())
  );

-- artwork_likes: 학생/교사 조회, 삽입은 Edge Function 경유(중복·조작 방지). 여기선 읽기만 허용.
create policy artwork_likes_read on public.artwork_likes
  for select using (
    exists (
      select 1 from public.artworks a
      where a.id = artwork_likes.artwork_id
        and (a.class_id = public.jwt_class_id()
             or exists (select 1 from public.classes c where c.id = a.class_id and c.teacher_id = auth.uid()))
    )
  );

-- collab_rooms: 교사 소유 관리, 학생은 자기 학급 방 조회
create policy collab_owner on public.collab_rooms
  for all using (host_teacher_id = auth.uid()) with check (host_teacher_id = auth.uid());
create policy collab_student_read on public.collab_rooms
  for select using (class_id = public.jwt_class_id());

-- subscriptions/payments: 교사 본인만 조회. 쓰기는 서버(웹훅, service role)만.
create policy subs_self_read on public.subscriptions
  for select using (teacher_id = auth.uid());
create policy payments_self_read on public.payments
  for select using (teacher_id = auth.uid());

-- ── 신규 교사 가입 시 teachers row 자동 생성 ──
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.teachers (id, email, name)
  values (new.id, coalesce(new.email,''), coalesce(new.raw_user_meta_data->>'name','선생님'))
  on conflict (id) do nothing;
  insert into public.subscriptions (teacher_id) values (new.id) on conflict (teacher_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
