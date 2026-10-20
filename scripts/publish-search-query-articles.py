"""Render the October 20 query-led article set in EN/PT/ES."""
from pathlib import Path
import html,json,re,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'content/search-query-articles.json').read_text())
DATE='2026-10-20'
DOMAIN='https://upnextcare.com'
COPY={
'en':dict(html='en',back='All articles',sources='Sources and further reading',related='Keep learning',date='October 20, 2026',by='UpNext editorial',read='About 2 min read',readlink='Read article',footer='General education. For individual medical decisions, speak with your healthcare team.',category={'Tests and signs':'Tests and signs','Diabetes basics':'Diabetes basics'},nav=['Our approach','Programs','Diabetes Prevention','Learn'],new='New articles',intro='Three new articles about A1C, symptoms and type 2 diabetes, available in English, Portuguese and Spanish.',existing='More articles in English',lang='Read in another language',legacy='Understanding A1C (English)',skip='Skip to content'),
'pt':dict(html='pt-BR',back='Todos os artigos',sources='Fontes e leituras adicionais',related='Continue aprendendo',date='20 de outubro de 2026',by='Equipe editorial UpNext',read='Cerca de 2 min de leitura',readlink='Ler artigo',footer='Conteúdo educativo. Para decisões médicas individuais, converse com sua equipe de saúde.',category={'Tests and signs':'Exames e sinais','Diabetes basics':'Noções sobre diabetes'},nav=['Nossa abordagem','Programas','Prevenção do diabetes','Aprender'],new='Novos artigos',intro='Três novos artigos sobre A1C, sintomas e diabetes tipo 2, disponíveis em português, inglês e espanhol.',existing='Mais artigos em inglês',lang='Leia em outro idioma',legacy='Entenda a A1C (artigo em inglês)',skip='Ir para o conteúdo'),
'es':dict(html='es',back='Todos los artículos',sources='Fuentes y lecturas adicionales',related='Sigue aprendiendo',date='20 de octubre de 2026',by='Equipo editorial de UpNext',read='Aproximadamente 2 min de lectura',readlink='Leer artículo',footer='Contenido educativo. Para decisiones médicas individuales, habla con tu equipo de salud.',category={'Tests and signs':'Pruebas y señales','Diabetes basics':'Conceptos sobre diabetes'},nav=['Nuestra propuesta','Programas','Prevención de la diabetes','Aprender'],new='Artículos nuevos',intro='Tres artículos nuevos sobre A1C, síntomas y diabetes tipo 2, disponibles en español, inglés y portugués.',existing='Más artículos en inglés',lang='Leer en otro idioma',legacy='Entender la A1C (artículo en inglés)',skip='Ir al contenido')}
esc=lambda s:html.escape(s,quote=True)
def article_path(slug,lang):return '/learn/'+slug+'/'+('' if lang=='en' else lang+'/')
def library_path(lang):return '/learn/'+('' if lang=='en' else lang+'/')
def links(paths,lang):
 return '<nav class="article-languages" aria-label="'+COPY[lang]['lang']+'">'+''.join(f'<a href="{path}" hreflang="{COPY[l]["html"]}" lang="{COPY[l]["html"]}"'+(' aria-current="page"' if l==lang else '')+'>'+{'en':'English','pt':'Português','es':'Español'}[l]+'</a>' for l,path in paths.items())+'</nav>'
def head(title,desc,path,lang,paths,schema=None):
 alternate=''.join(f'<link rel="alternate" hreflang="{COPY[l]["html"]}" href="{DOMAIN+p}">' for l,p in paths.items())+f'<link rel="alternate" hreflang="x-default" href="{DOMAIN+paths["en"]}">'
 return f'''<!doctype html><html lang="{COPY[lang]['html']}" data-content-language="{lang}" data-language-paths="{esc(json.dumps(paths))}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)} | UpNext</title><meta name="description" content="{esc(desc)}"><link rel="canonical" href="{DOMAIN+path}">{alternate}<meta name="theme-color" content="#087261"><meta property="og:type" content="{'article' if schema else 'website'}"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc)}"><meta property="og:url" content="{DOMAIN+path}"><link rel="stylesheet" href="/learn/learn.css?v=20261010"><link rel="stylesheet" href="/learn/article-languages.css?v=20261020"><script async src="https://www.googletagmanager.com/gtag/js?id=G-MDTHEM8M0H"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}}gtag('js',new Date());gtag('config','G-MDTHEM8M0H');</script><script src="/posthog-init.js?v=20261010" defer></script>{'<script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False)+'</script>' if schema else ''}</head>'''
def header(lang):
 c=COPY[lang]
 return f'<body><a class="skip" href="#main">{c["skip"]}</a><header class="topbar"><div class="wrap"><a href="/?lang={lang}">UpNext</a><nav aria-label="{c["nav"][3]}"><a href="/?lang={lang}#approach">{c["nav"][0]}</a> <a href="/?lang={lang}#programs">{c["nav"][1]}</a> <a href="/dpp/?lang={lang}">{c["nav"][2]}</a> <a href="{library_path(lang)}" aria-current="page">{c["nav"][3]}</a></nav></div></header>'
def footer(lang):return f'<footer class="footer"><div class="wrap">UpNext · {COPY[lang]["footer"]}</div></footer><script src="/shared-public-nav.js?v=20261010-learn1"></script><script src="/learn/article-languages.js?v=20261020"></script></body></html>'
def card(item,lang,index):
 d=item[lang];c=COPY[lang];url=article_path(item['slug'],lang)
 return f'<article class="card" data-category="{esc(item["category"])}"><span class="number">{index:02} · {c["category"][item["category"]]}</span><h2><a href="{url}">{esc(d["title"])}</a></h2><p>{esc(d["description"])}</p><a class="read" href="{url}">{c["readlink"]} · {c["read"]}</a></article>'
for item in DATA:
 paths={l:article_path(item['slug'],l) for l in COPY}
 for lang,c in COPY.items():
  d=item[lang];path=paths[lang];text=' '.join(' '.join(s) for s in d['sections']);words=len(re.sub('<[^>]+>',' ',text).split())
  schema={'@context':'https://schema.org','@type':'Article','headline':d['title'],'description':d['description'],'datePublished':DATE,'dateModified':DATE,'author':{'@type':'Organization','name':'UpNext'},'publisher':{'@type':'Organization','name':'UpNext'},'mainEntityOfPage':DOMAIN+path,'inLanguage':c['html'],'citation':[s[0] for s in item['sources']],'wordCount':words}
  sections=''.join('<section><h2>'+esc(section[0])+'</h2>'+''.join('<p>'+p+'</p>' for p in section[1:])+'</section>' for section in d['sections'])
  sources='<aside class="sources" aria-label="'+c['sources']+'"><h2>'+c['sources']+'</h2><ol>'+''.join(f'<li id="source-{i}"><a href="{esc(url)}" target="_blank" rel="noopener">{esc(label)}</a></li>' for i,(url,label) in enumerate(item['sources'],1))+'</ol></aside>'
  related='<nav class="related" aria-label="'+c['related']+'"><strong>'+c['related']+'</strong>'+''.join(f'<a href="{article_path(other["slug"],lang)}">{esc(other[lang]["title"])}</a>' for other in DATA if other!=item)+f'<a href="/learn/understanding-a1c/">{c["legacy"]}</a><a href="{library_path(lang)}">{c["back"]}</a></nav>'
  content=head(d['title'],d['description'],path,lang,paths,schema)+header(lang)+f'<main id="main"><section class="hero"><div class="wrap article-head"><a class="back" href="{library_path(lang)}">{c["back"]}</a><div class="eyebrow">{c["category"][item["category"]]}</div><h1>{esc(d["title"])}</h1><p class="lead">{esc(d["description"])}</p><p class="meta">{c["by"]} · {c["read"]} · {c["date"]}</p>'+links(paths,lang)+'</div></section><article class="article">'+sections+sources+related+'</article></main>'+footer(lang)
  dest=ROOT/path.strip('/')/'index.html';dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(content);print(path,words,'words')
paths={l:library_path(l) for l in COPY}
# Add new stories to the existing English collection without rewriting its ten articles.
path=ROOT/'learn/index.html';t=path.read_text();assert 'a1c-test-fasting' not in t
newcards=''.join(card(d,'en',i+11) for i,d in enumerate(DATA))
t=t.replace('<div class="cards">','<div class="cards">'+newcards,1)
t=t.replace('10 articles','13 articles')
t=t.replace('<html lang="en">','<html lang="en" data-content-language="en" data-language-paths="'+esc(json.dumps(paths))+'">')
t=t.replace('</head>','<link rel="stylesheet" href="/learn/article-languages.css?v=20261020">'+''.join(f'<link rel="alternate" hreflang="{COPY[l]["html"]}" href="{DOMAIN+p}">' for l,p in paths.items())+'</head>')
t=t.replace('</h1>','</h1>'+links(paths,'en'),1).replace('</body>','<script src="/learn/article-languages.js?v=20261020"></script></body>');path.write_text(t)
for lang in ['pt','es']:
 c=COPY[lang];path=library_path(lang)
 content=head(c['nav'][3],c['intro'],path,lang,paths)+header(lang)+f'<main id="main"><section class="hero"><div class="wrap"><div class="eyebrow">UpNext</div><h1>{c["new"]}</h1><p class="lead">{c["intro"]}</p>'+links(paths,lang)+'</div></section><section class="wrap library"><div class="cards">'+''.join(card(d,lang,i+1) for i,d in enumerate(DATA))+'</div><p><a href="/learn/">'+c['existing']+'</a></p></section></main>'+footer(lang)
 dest=ROOT/path.strip('/')/'index.html';dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(content)
# Connect the existing A1C overview to the more specific follow-ups.
p=ROOT/'learn/understanding-a1c/index.html';t=p.read_text();t=t.replace('<strong>Keep learning</strong>','<strong>Keep learning</strong>'+''.join(f'<a href="{article_path(d["slug"],"en")}">{esc(d["en"]["title"])}</a>' for d in DATA));t=t.replace('Browse all 10 articles','Browse all articles');p.write_text(t)
# Preserve every existing URL; append explicit alternate-language URLs.
for name in ['sitemap.xml','sitemap-google.xml']:
 p=ROOT/name;t=p.read_text();t=t.replace('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">')
 entries=[]
 for item in DATA:
  alternates={l:article_path(item['slug'],l) for l in COPY}
  for lang,path in alternates.items():
   entries.append(f'<url><loc>{DOMAIN+path}</loc><lastmod>{DATE}</lastmod>'+''.join(f'<xhtml:link rel="alternate" hreflang="{COPY[l]["html"]}" href="{DOMAIN+a}" />' for l,a in alternates.items())+'</url>')
 for lang in ['pt','es']:entries.append(f'<url><loc>{DOMAIN+library_path(lang)}</loc><lastmod>{DATE}</lastmod></url>')
 t=t.replace('</urlset>',''.join(entries)+'</urlset>');ET.fromstring(t);p.write_text(t)
