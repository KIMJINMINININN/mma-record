-- 0014_storage_policies.sql — Storage RLS (버킷 training-media, user_id 경로 격리)
-- 객체 경로 규약: training-media/<user_id>/videos|thumbs/<uuid>.<ext>
-- 버킷 생성 자체는 supabase init/config.toml(로컬) 또는 대시보드/CLI(원격) — 인프라 단계.
-- 여기서는 storage.objects 정책만 정의. service_role(admin client)은 RLS bypass.

create policy "training_media_read_own" on storage.objects
  for select to authenticated
  using ( bucket_id = 'training-media'
          and (storage.foldername(name))[1] = auth.uid()::text );

create policy "training_media_insert_own" on storage.objects
  for insert to authenticated
  with check ( bucket_id = 'training-media'
               and (storage.foldername(name))[1] = auth.uid()::text );

create policy "training_media_update_own" on storage.objects
  for update to authenticated
  using ( bucket_id = 'training-media'
          and (storage.foldername(name))[1] = auth.uid()::text );

create policy "training_media_delete_own" on storage.objects
  for delete to authenticated
  using ( bucket_id = 'training-media'
          and (storage.foldername(name))[1] = auth.uid()::text );
