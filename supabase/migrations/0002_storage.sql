-- Storage 버킷 + 정책 (DESIGN-REVIEW A1: artworks 비공개, templates 공개)

-- artworks: 비공개(서명 URL로만 접근). 업로드/조회는 Edge Function(service role)만.
insert into storage.buckets (id, name, public)
values ('artworks', 'artworks', false)
on conflict (id) do nothing;

-- templates: 공개 읽기(교사 업로드 도안 등)
insert into storage.buckets (id, name, public)
values ('templates', 'templates', true)
on conflict (id) do nothing;

-- 교사는 자기 소유 template 파일만 업로드/수정(경로 prefix = teacher_id)
create policy "templates_owner_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'templates'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "templates_owner_modify" on storage.objects
  for update to authenticated
  using (bucket_id = 'templates' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "templates_public_read" on storage.objects
  for select using (bucket_id = 'templates');

-- artworks 버킷은 anon/authenticated 정책 없음 → 클라이언트 직접 접근 차단.
-- 조회는 교사가 service_role 서명 URL로(teacher-api.signedUrl), 업로드는 submit-artwork Edge Function.
