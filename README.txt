VIZORA INTERNAL ONLINE — SUPABASE
=================================

Esta versão liga o sistema interno da VIZORA ao Supabase PostgreSQL + Auth.

SUPABASE configurado:
- Project URL: https://ygtedmbcjvjiqdvruunc.supabase.co
- Publishable key: configurada no servidor (não é Secret key)
- Base de dados: Supabase PostgreSQL
- Login: Supabase Auth

IMPORTANTE
- Nunca coloque uma Secret key / service_role no navegador.
- A Publishable key pode ser usada com RLS corretamente configurado.
- O SQL de criação das tabelas já foi executado no projeto Supabase.

COMO EXECUTAR
1. Extraia este ZIP.
2. Abra o CMD dentro da pasta.
3. Execute:
   npm install
4. Depois:
   npm start
5. Abra:
   http://localhost:3000/
   -> briefing público

   http://localhost:3000/interno
   -> sistema interno

LOGIN
Use o mesmo e-mail e senha do utilizador criado em Supabase Authentication > Users.

DADOS ONLINE
O sistema não usa mais data/db.json para clientes, briefings, cotações, contratos,
pagamentos, projetos, pós-venda, atividades e documentos. Esses dados são gravados
no Supabase e protegidos por autenticação/RLS.

BRIEFING PÚBLICO
O formulário público chama a função submit_public_briefing no Supabase. O visitante
não recebe acesso às tabelas internas.

SAÚDE
http://localhost:3000/health

Se for publicar em produção, defina as variáveis de ambiente:
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
PORT

Depois, remova os valores de fallback do server.js se desejar uma configuração sem
credenciais no código-fonte.
