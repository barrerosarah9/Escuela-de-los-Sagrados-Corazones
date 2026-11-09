create function public.registrar_token_dispositivo(
  p_token text,
  p_plataforma public.plataforma_dispositivo
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Se necesita una sesión para registrar el token' using errcode = '42501';
  end if;

  if p_token is null or length(btrim(p_token)) = 0 or length(p_token) > 4096 then
    raise exception 'Token de dispositivo inválido' using errcode = '22023';
  end if;

  insert into public.tokens_dispositivo (usuario_id, token, plataforma)
  values ((select auth.uid()), p_token, p_plataforma)
  on conflict (token) do update
    set usuario_id = excluded.usuario_id,
        plataforma = excluded.plataforma;
end;
$$;

comment on function public.registrar_token_dispositivo(text, public.plataforma_dispositivo) is
  'Guarda el token de FCM del dispositivo a nombre del usuario de la sesión; si el token ya existía (otra cuenta en el mismo teléfono), lo reasigna (T-050).';

revoke all on function public.registrar_token_dispositivo(text, public.plataforma_dispositivo) from public, anon;
grant execute on function public.registrar_token_dispositivo(text, public.plataforma_dispositivo) to authenticated;
