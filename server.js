const express=require("express");
const path=require("path");
const crypto=require("crypto");
const {createClient}=require("@supabase/supabase-js");

const app=express();
const PORT=process.env.PORT||3000;
const SUPABASE_URL=process.env.SUPABASE_URL||"https://ygtedmbcjvjiqdvruunc.supabase.co";
const SUPABASE_KEY=process.env.SUPABASE_PUBLISHABLE_KEY||"sb_publishable_rV75ZZj4xJ5bO2Pa3xv5Ug_IvUbdxuq";

const catalog=[
{category:"Marketing Digital",plans:[
{name:"Starter",price:3500,items:["1 rede social","8 conteúdos/mês","4 stories/semana","Legendas","Hashtags","Calendário de conteúdo","Planeamento mensal","Relatório básico"]},
{name:"Growth",price:7500,recommended:true,items:["Até 2 redes sociais","12 conteúdos/mês","4–8 Reels/mês","Stories","Legendas e hashtags","Calendário editorial","Estratégia mensal","Planeamento de campanhas","Análise de desempenho","Relatório mensal"]},
{name:"Scale",price:12500,items:["Até 3 redes sociais","16 conteúdos/mês","8 Reels/mês","Stories","Estratégia de conteúdo","Copywriting","Planeamento de campanhas","SEO básico","Análise de resultados","Relatório mensal","Consultoria mensal"]}]},
{category:"Design & Branding",plans:[
{name:"Essential",price:2500,items:["Até 6 peças/mês","Posts e stories","Flyers e banners","Até 2 revisões por peça","Entrega digital"]},
{name:"Business",price:5000,recommended:true,items:["Até 12 peças/mês","Posts, stories, flyers e banners","Menus e materiais promocionais","Templates reutilizáveis","Até 2 revisões por peça","Pedidos prioritários"]},
{name:"Premium",price:8500,items:["Até 20 peças/mês","Campanhas promocionais","Materiais corporativos","Materiais para impressão","Direção visual","Adaptações","Até 2 revisões por peça","Suporte prioritário"]}]},
{category:"Vídeo & Motion",plans:[
{name:"Content Starter",price:3500,items:["4 vídeos curtos/mês","Edição básica","Reels/TikTok","Música e SFX","Legendas simples","4 capas"]},
{name:"Content Growth",price:7000,recommended:true,items:["8 vídeos curtos/mês","Edição avançada","Motion graphics simples","Transições e efeitos","Legendas","8 capas","Adaptações"]},
{name:"Content Pro",price:12000,items:["12 vídeos/mês","Edição avançada","Motion graphics","Animações","Legendas","Capas","Vídeos promocionais","Planeamento","Adaptação multiplataforma","Direção criativa"]}]},
{category:"Web & Technology",plans:[
{name:"Website Essencial",price:500,items:["1 página simples","Domínio gratuito","Hosting gratuito","Presença online básica"]},
{name:"Website Business",price:7500,recommended:true,items:["Até 5 páginas","Design personalizado","Sobre/Serviços/Contacto/Galeria","WhatsApp","Formulário","Google Maps","SEO básico","Otimização mobile"]},
{name:"Website Professional",price:15000,items:["Até 10 páginas","Design personalizado","Animações","Formulários avançados","SEO","Maps","Integrações","Velocidade","Estrutura de crescimento","Suporte inicial"]}]},
{category:"Soluções Digitais",plans:[{name:"Personalizado",price:0,items:["E-commerce","Sistemas web","Dashboards","Áreas de cliente","Login/autenticação","Bases de dados","APIs","Integrações","Sistemas de gestão"]}]}
];

app.use(express.json({limit:"3mb"}));
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,"public")));
app.get("/",(q,s)=>s.sendFile(path.join(__dirname,"public","briefing.html")));
app.get("/interno",(q,s)=>s.sendFile(path.join(__dirname,"public","interno.html")));
app.get("/health",(q,s)=>s.json({ok:true,service:"VIZORA Internal Online",time:new Date().toISOString()}));

const clean=v=>String(v??"").trim();
const tokenFrom=req=>req.headers.authorization?.replace(/^Bearer\s+/i,"")||req.query.token||"";
const adminClient=()=>createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const userClient=token=>createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}}});

async function auth(req,res,next){
  const token=tokenFrom(req);
  if(!token)return res.status(401).json({ok:false,message:"Sessão inválida."});
  const sb=userClient(token);
  const {data,error}=await sb.auth.getUser(token);
  if(error||!data?.user)return res.status(401).json({ok:false,message:"Sessão inválida ou expirada."});
  req.token=token; req.sb=sb; req.user=data.user; next();
}

app.post("/api/login",async(req,res)=>{
  const email=clean(req.body.email),password=clean(req.body.password);
  if(!email||!password)return res.status(400).json({ok:false,message:"Email e palavra-passe são obrigatórios."});
  const sb=adminClient();
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error||!data?.session)return res.status(401).json({ok:false,message:"Email ou palavra-passe incorretos."});
  const p=await sb.from("profiles").select("id,name,email,role").eq("id",data.user.id).maybeSingle();
  const profile=p.data||{id:data.user.id,name:data.user.user_metadata?.name||"Administrador VIZORA",email:data.user.email,role:"admin"};
  return res.json({ok:true,token:data.session.access_token,user:profile});
});

app.post("/api/logout",auth,async(req,res)=>{
  const {error}=await req.sb.auth.signOut();
  if(error)return res.status(400).json({ok:false,message:error.message});
  res.json({ok:true});
});
app.get("/api/catalog",(q,s)=>s.json(catalog));

function mapClient(r){return {...r,created:r.created_at,updated:r.updated_at,contracted:Number(r.contracted||0),paid:Number(r.paid||0)};}
function mapBriefing(r){return {...r,clientId:r.client_id,created:r.created_at};}
function mapQuote(r){return {...r,clientId:r.client_id,paymentTerms:r.payment_terms,created:r.created_at,updated:r.updated_at,subtotal:Number(r.subtotal||0),discount:Number(r.discount||0),total:Number(r.total||0)};}
function mapContract(r){return {...r,clientId:r.client_id,quoteId:r.quote_id,paymentTerms:r.payment_terms,clientSigned:r.client_signed,vizoraSigned:r.vizora_signed,signedAt:r.signed_at,created:r.created_at,updated:r.updated_at,value:Number(r.value||0)};}
function mapPayment(r){return {...r,clientId:r.client_id,contractId:r.contract_id,created:r.created_at,amount:Number(r.amount||0)};}
function mapProject(r){return {...r,clientId:r.client_id,contractId:r.contract_id,created:r.created_at,updated:r.updated_at};}
function mapFollowup(r){return {...r,clientId:r.client_id,nextAction:r.next_action,created:r.created_at};}
function mapActivity(r){return {...r,clientId:r.client_id,created:r.created_at,time:r.created_at};}
function mapDocument(r){return {...r,clientId:r.client_id,quoteId:r.quote_id,contractId:r.contract_id,projectId:r.project_id,created:r.created_at};}

// Financials are derived from the real contracts/payments so the dashboard cannot
// become stale when test data or manual changes exist in the clients table.
function latestContractValue(contracts,clientId){
  const list=(contracts||[]).filter(x=>Number(x.clientId)===Number(clientId));
  if(!list.length)return 0;
  list.sort((a,b)=>new Date(b.created||0)-new Date(a.created||0));
  return Number(list[0].value||0);
}
function paidForClient(payments,clientId){
  return (payments||[]).filter(x=>Number(x.clientId)===Number(clientId)).reduce((sum,p)=>sum+Number(p.amount||0),0);
}
function applyFinancials(clients,contracts,payments){
  return (clients||[]).map(c=>{
    const contracted=latestContractValue(contracts,c.id)||Number(c.contracted||0);
    const paid=paidForClient(payments,c.id);
    return {...c,contracted,paid};
  });
}

async function all(sb,table,mapper){const r=await sb.from(table).select("*").order("created_at",{ascending:false});if(r.error)throw r.error;return (r.data||[]).map(mapper);}

app.post("/api/briefing",async(req,res)=>{
  const b=req.body;
  if(!clean(b.name)||!clean(b.phone)||!clean(b.service))return res.status(400).json({ok:false,message:"Nome, WhatsApp/telefone e serviço são obrigatórios."});
  const sb=adminClient();
  const {data,error}=await sb.rpc("submit_public_briefing",{
    p_name:clean(b.name),p_phone:clean(b.phone),p_service:clean(b.service),p_company:clean(b.company)||null,p_email:clean(b.email)||null,p_address:clean(b.address)||null,
    p_objective:clean(b.objective)||null,p_audience:clean(b.audience)||null,p_budget:clean(b.budget)||null,p_deadline:clean(b.deadline)||null,p_details:clean(b.details)||null
  });
  if(error)return res.status(400).json({ok:false,message:error.message});
  res.json({ok:true,clientId:data,message:"Briefing recebido com sucesso."});
});

app.get("/api/bootstrap",auth,async(req,res)=>{
  try{
    const [clients,briefings,quotes,contracts,payments,projects,followups,activities,documents]=await Promise.all([
      all(req.sb,"clients",mapClient),all(req.sb,"briefings",mapBriefing),all(req.sb,"quotes",mapQuote),all(req.sb,"contracts",mapContract),all(req.sb,"payments",mapPayment),all(req.sb,"projects",mapProject),all(req.sb,"followups",mapFollowup),all(req.sb,"activities",mapActivity),all(req.sb,"documents",mapDocument)
    ]);
    const financialClients=applyFinancials(clients,contracts,payments);
    const contracted=financialClients.reduce((a,c)=>a+Number(c.contracted||0),0);
    const received=payments.reduce((a,p)=>a+Number(p.amount||0),0);
    res.json({ok:true,users:[],clients:financialClients,briefings,quotes,contracts,payments,projects,followups,activities,documents,sessions:[],catalog,metrics:{totalClients:financialClients.length,leads:financialClients.filter(c=>!["Cliente ativo","Projeto concluído","Perdido"].includes(c.status)).length,activeProjects:projects.filter(p=>p.status!=="Concluído").length,contracted,received,balance:Math.max(0,contracted-received)}});
  }catch(e){res.status(500).json({ok:false,message:e.message});}
});

app.get("/api/clients/:id",auth,async(req,res)=>{
  const id=Number(req.params.id);
  const {data:c,error}=await req.sb.from("clients").select("*").eq("id",id).single();
  if(error||!c)return res.status(404).json({ok:false});
  try{
    const [briefings,quotes,contracts,payments,projects,followups]=await Promise.all([
      all(req.sb,"briefings",mapBriefing),all(req.sb,"quotes",mapQuote),all(req.sb,"contracts",mapContract),all(req.sb,"payments",mapPayment),all(req.sb,"projects",mapProject),all(req.sb,"followups",mapFollowup)
    ]);
    res.json({client:mapClient(c),briefings:briefings.filter(x=>x.clientId===id),quotes:quotes.filter(x=>x.clientId===id),contracts:contracts.filter(x=>x.clientId===id),payments:payments.filter(x=>x.clientId===id),projects:projects.filter(x=>x.clientId===id),followups:followups.filter(x=>x.clientId===id)});
  }catch(e){res.status(500).json({ok:false,message:e.message});}
});

app.post("/api/quotes",auth,async(req,res)=>{
  const x=req.body,clientId=Number(x.clientId);
  const {data:c,error:ce}=await req.sb.from("clients").select("*").eq("id",clientId).single();
  if(ce||!c)return res.status(400).json({ok:false,message:"Cliente não encontrado."});
  const sub=Number(x.subtotal||0),dis=Number(x.discount||0);
  const number=`VIZ-${new Date().getFullYear()}-${String((await req.sb.from("quotes").select("id",{count:"exact",head:true})).count+1).padStart(3,"0")}`;
  const row={client_id:clientId,number,service:clean(x.service)||c.service,plan:clean(x.plan)||"Personalizado",items:Array.isArray(x.items)?x.items:[],subtotal:sub,discount:dis,total:Math.max(0,sub-dis),validity:clean(x.validity)||"7 dias",execution:clean(x.execution)||"A definir",payment_terms:clean(x.paymentTerms)||"A definir",included:clean(x.included)||null,excluded:clean(x.excluded)||null,notes:clean(x.notes)||null,status:"Rascunho"};
  const {data:q,error}=await req.sb.from("quotes").insert(row).select("*").single();
  if(error)return res.status(400).json({ok:false,message:error.message});
  await req.sb.from("clients").update({status:"Cotação em preparação",updated_at:new Date().toISOString()}).eq("id",clientId);
  await req.sb.from("activities").insert({client_id:clientId,type:"quote",text:"Cotação criada",detail:`${c.name} — ${number}`});
  res.json({ok:true,quote:mapQuote(q)});
});

app.patch("/api/quotes/:id",auth,async(req,res)=>{
  const id=Number(req.params.id),b=req.body,row={};
  const map={service:"service",plan:"plan",items:"items",subtotal:"subtotal",discount:"discount",total:"total",validity:"validity",execution:"execution",paymentTerms:"payment_terms",included:"included",excluded:"excluded",notes:"notes",status:"status"};
  Object.keys(map).forEach(k=>{if(b[k]!==undefined)row[map[k]]=b[k]});row.updated_at=new Date().toISOString();
  const {data,error}=await req.sb.from("quotes").update(row).eq("id",id).select("*").single();
  if(error)return res.status(400).json({ok:false,message:error.message});res.json({ok:true,quote:mapQuote(data)});
});

async function quoteStatus(req,res,status,clientStatus,text){
  const id=Number(req.params.id);const {data:q,error}=await req.sb.from("quotes").update({status,updated_at:new Date().toISOString()}).eq("id",id).select("*").single();
  if(error||!q)return res.status(404).json({ok:false});
  const {data:c}=await req.sb.from("clients").select("*").eq("id",q.client_id).single();
  await req.sb.from("clients").update({status:clientStatus,updated_at:new Date().toISOString()}).eq("id",q.client_id);
  await req.sb.from("activities").insert({client_id:q.client_id,type:text,text,detail:`${c?.name||"Cliente"} — ${q.number}`});
  res.json({ok:true});
}
app.post("/api/quotes/:id/send",auth,(req,res)=>quoteStatus(req,res,"Enviada","Cotação enviada","Cotação marcada como enviada"));
app.post("/api/quotes/:id/approve",auth,(req,res)=>quoteStatus(req,res,"Aprovada","Cotação aprovada","Cotação aprovada"));

app.post("/api/contracts",auth,async(req,res)=>{
  const qid=Number(req.body.quoteId);const {data:q,error:qe}=await req.sb.from("quotes").select("*").eq("id",qid).single();
  if(qe||!q)return res.status(400).json({ok:false,message:"Cotação não encontrada."});
  const {data:c}=await req.sb.from("clients").select("*").eq("id",q.client_id).single();
  const count=(await req.sb.from("contracts").select("id",{count:"exact",head:true})).count||0;
  const number=`CON-${new Date().getFullYear()}-${String(count+1).padStart(3,"0")}`;
  const row={client_id:c.id,quote_id:q.id,number,service:q.service,plan:q.plan,scope:q.items||[],value:q.total,duration:clean(req.body.duration)||q.execution,payment_terms:q.payment_terms||"A definir",revisions:clean(req.body.revisions)||"Até 2 revisões por entrega",included:q.included,excluded:q.excluded,responsibilities:clean(req.body.responsibilities)||null,notes:clean(req.body.notes)||null,status:"Rascunho"};
  const {data:con,error}=await req.sb.from("contracts").insert(row).select("*").single();if(error)return res.status(400).json({ok:false,message:error.message});
  await req.sb.from("clients").update({contracted:q.total,status:"Contrato em preparação",updated_at:new Date().toISOString()}).eq("id",c.id);
  await req.sb.from("activities").insert({client_id:c.id,type:"contract",text:"Contrato criado a partir da cotação",detail:`${c.name} — ${number}`});
  res.json({ok:true,contract:mapContract(con)});
});

app.patch("/api/contracts/:id",auth,async(req,res)=>{
  const b=req.body,row={};const map={service:"service",plan:"plan",value:"value",duration:"duration",scope:"scope",responsibilities:"responsibilities",notes:"notes"};Object.keys(map).forEach(k=>{if(b[k]!==undefined)row[map[k]]=b[k]});row.updated_at=new Date().toISOString();
  const {data,error}=await req.sb.from("contracts").update(row).eq("id",Number(req.params.id)).select("*").single();if(error)return res.status(400).json({ok:false,message:error.message});
  if(row.value!==undefined){await req.sb.from("clients").update({contracted:Number(row.value||0),updated_at:new Date().toISOString()}).eq("id",data.client_id);}
  res.json({ok:true,contract:mapContract(data)});
});
app.post("/api/contracts/:id/sign",auth,async(req,res)=>{
  const id=Number(req.params.id);const {data:c,error}=await req.sb.from("contracts").update({status:"Assinado",client_signed:clean(req.body.clientSigned)||null,vizora_signed:clean(req.body.vizoraSigned)||null,signed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",id).select("*").single();
  if(error||!c)return res.status(404).json({ok:false});await req.sb.from("clients").update({status:"Aguardando pagamento",updated_at:new Date().toISOString()}).eq("id",c.client_id);await req.sb.from("activities").insert({client_id:c.client_id,type:"contract-signed",text:"Contrato confirmado",detail:`${c.number}`});res.json({ok:true});
});

app.delete("/api/clients/:id",auth,async(req,res)=>{
  const id=Number(req.params.id);
  if(!Number.isInteger(id)||id<=0)return res.status(400).json({ok:false,message:"Cliente inválido."});
  const {data:c,error:ce}=await req.sb.from("clients").select("id,name").eq("id",id).single();
  if(ce||!c)return res.status(404).json({ok:false,message:"Cliente não encontrado."});

  // Remove dependências primeiro para respeitar as relações entre as tabelas.
  // Documentos podem referenciar várias entidades do cliente, por isso saem primeiro.
  const steps=[
    ["documents","client_id"],
    ["payments","client_id"],
    ["followups","client_id"],
    ["projects","client_id"],
    ["contracts","client_id"],
    ["quotes","client_id"],
    ["briefings","client_id"],
    ["activities","client_id"]
  ];
  for(const [table,column] of steps){
    const {error}=await req.sb.from(table).delete().eq(column,id);
    if(error)return res.status(400).json({ok:false,message:`Não foi possível limpar ${table}: ${error.message}`});
  }
  const {error}=await req.sb.from("clients").delete().eq("id",id);
  if(error)return res.status(400).json({ok:false,message:error.message});
  res.json({ok:true,message:`Cliente ${c.name} e dados associados eliminados.`});
});

app.post("/api/payments",auth,async(req,res)=>{
  const amount=Number(req.body.amount||0),clientId=Number(req.body.clientId);const {data:c}=await req.sb.from("clients").select("*").eq("id",clientId).single();
  if(!c||amount<=0)return res.status(400).json({ok:false,message:"Cliente e valor são obrigatórios."});
  const row={client_id:clientId,contract_id:Number(req.body.contractId)||null,amount,date:clean(req.body.date)||new Date().toISOString().slice(0,10),method:clean(req.body.method)||"Outro",reference:clean(req.body.reference)||null,observation:clean(req.body.observation)||null};
  const {data:p,error}=await req.sb.from("payments").insert(row).select("*").single();if(error)return res.status(400).json({ok:false,message:error.message});
  const {data:allPaid,error:pe}=await req.sb.from("payments").select("amount").eq("client_id",clientId);if(pe)return res.status(400).json({ok:false,message:pe.message});
  const {data:contracts}=await req.sb.from("contracts").select("value,created_at").eq("client_id",clientId).order("created_at",{ascending:false}).limit(1);
  const contracted=Number(contracts?.[0]?.value??c.contracted??0);
  const paid=(allPaid||[]).reduce((sum,r)=>sum+Number(r.amount||0),0);
  const status=contracted>0&&paid>=contracted?"Cliente ativo":(paid>0?"Pagamento parcial":"Aguardando pagamento");
  await req.sb.from("clients").update({contracted,paid,status,updated_at:new Date().toISOString()}).eq("id",clientId);await req.sb.from("activities").insert({client_id:clientId,type:"payment",text:"Pagamento registado",detail:`${c.name} — ${amount.toLocaleString("pt-MZ")} MZN`});
  res.json({ok:true,payment:mapPayment(p),balance:Math.max(0,contracted-paid)});
});

app.delete("/api/payments/:id",auth,async(req,res)=>{
  const id=Number(req.params.id);
  if(!Number.isInteger(id)||id<=0)return res.status(400).json({ok:false,message:"Pagamento inválido."});
  const {data:p,error:pe}=await req.sb.from("payments").select("id,client_id,amount").eq("id",id).single();
  if(pe||!p)return res.status(404).json({ok:false,message:"Pagamento não encontrado."});
  const {error:de}=await req.sb.from("payments").delete().eq("id",id);
  if(de)return res.status(400).json({ok:false,message:de.message});
  const {data:c,error:ce}=await req.sb.from("clients").select("id,contracted,status").eq("id",p.client_id).single();
  if(!ce&&c){
    const {data:remaining,error:re}=await req.sb.from("payments").select("amount").eq("client_id",p.client_id);
    if(re)return res.status(400).json({ok:false,message:re.message});
    const paid=(remaining||[]).reduce((sum,row)=>sum+Number(row.amount||0),0);
    const {data:contracts}=await req.sb.from("contracts").select("value,created_at").eq("client_id",p.client_id).order("created_at",{ascending:false}).limit(1);
    const contracted=Number(contracts?.[0]?.value??c.contracted??0);
    let status=c.status;
    if(contracted>0) status=paid>=contracted?"Cliente ativo":(paid>0?"Pagamento parcial":"Aguardando pagamento");
    await req.sb.from("clients").update({contracted,paid,status,updated_at:new Date().toISOString()}).eq("id",p.client_id);
  }
  res.json({ok:true,message:"Pagamento eliminado e financeiro recalculado."});
});

app.post("/api/projects",auth,async(req,res)=>{
  const clientId=Number(req.body.clientId);const {data:c}=await req.sb.from("clients").select("*").eq("id",clientId).single();if(!c)return res.status(400).json({ok:false});
  const row={client_id:clientId,contract_id:Number(req.body.contractId)||null,name:clean(req.body.name)||`${c.service} — ${c.name}`,service:c.service,start:clean(req.body.start)||null,deadline:clean(req.body.deadline)||null,responsible:clean(req.body.responsible)||"VIZORA",status:clean(req.body.status)||"Em andamento",notes:clean(req.body.notes)||null};
  const {data:p,error}=await req.sb.from("projects").insert(row).select("*").single();if(error)return res.status(400).json({ok:false,message:error.message});await req.sb.from("clients").update({status:"Cliente ativo",updated_at:new Date().toISOString()}).eq("id",clientId);await req.sb.from("activities").insert({client_id:clientId,type:"project",text:"Projeto criado",detail:`${c.name} — ${p.name}`});res.json({ok:true,project:mapProject(p)});
});

app.post("/api/followups",auth,async(req,res)=>{
  const clientId=Number(req.body.clientId);const {data:c}=await req.sb.from("clients").select("*").eq("id",clientId).single();if(!c)return res.status(400).json({ok:false});
  const row={client_id:clientId,date:clean(req.body.date)||new Date().toISOString().slice(0,10),type:clean(req.body.type)||"Pós-venda",satisfaction:clean(req.body.satisfaction)||null,need:clean(req.body.need)||null,next_action:clean(req.body.nextAction)||null,notes:clean(req.body.notes)||null};const {data:f,error}=await req.sb.from("followups").insert(row).select("*").single();if(error)return res.status(400).json({ok:false,message:error.message});await req.sb.from("clients").update({post_sale:"Registado",updated_at:new Date().toISOString()}).eq("id",clientId);await req.sb.from("activities").insert({client_id:clientId,type:"followup",text:"Pós-venda registado",detail:c.name});res.json({ok:true,followup:mapFollowup(f)});
});

app.post("/api/backup",auth,async(req,res)=>res.json({ok:true,message:"A base de dados está online no Supabase. O backup/exportação deve ser feito pelo painel do Supabase ou pela exportação do sistema."}));
app.get("/api/export",auth,async(req,res)=>{
  try{const [clients,briefings,quotes,contracts,payments,projects,followups,activities,documents]=await Promise.all([all(req.sb,"clients",mapClient),all(req.sb,"briefings",mapBriefing),all(req.sb,"quotes",mapQuote),all(req.sb,"contracts",mapContract),all(req.sb,"payments",mapPayment),all(req.sb,"projects",mapProject),all(req.sb,"followups",mapFollowup),all(req.sb,"activities",mapActivity),all(req.sb,"documents",mapDocument)]);res.setHeader("Content-Type","application/json");res.setHeader("Content-Disposition","attachment; filename=vizora-export.json");res.send(JSON.stringify({exportedAt:new Date().toISOString(),clients,briefings,quotes,contracts,payments,projects,followups,activities,documents},null,2));}catch(e){res.status(500).json({ok:false,message:e.message});}
});

app.listen(PORT,()=>console.log(`VIZORA Internal Online em http://localhost:${PORT}`));
