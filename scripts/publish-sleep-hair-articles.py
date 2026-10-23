"""Publish the October 23 sleep and hair collection without rewriting older articles."""
from pathlib import Path
import json,re,html,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
# Reuse the established multilingual layout helpers, not the one-time legacy migration.
layout=(ROOT/'scripts/publish-search-query-articles.py').read_text().split('for item in DATA:')[0]
exec(compile(layout,str(ROOT/'scripts/publish-search-query-articles.py'),'exec'))
DATA=json.loads((ROOT/'content/sleep-hair-articles.json').read_text())
DATE='2026-10-23'
for lang,labels in {'en':['Sleep','Hair health','October 23, 2026'],'pt':['Sono','Saúde do cabelo','23 de outubro de 2026'],'es':['Sueño','Salud del cabello','23 de octubre de 2026']}.items():
 COPY[lang]['category'].update({'Sleep':labels[0],'Hair health':labels[1]})
 COPY[lang]['date']=labels[2]
def themed(t):
 return t.replace('</head>','<link rel="stylesheet" href="/design-system/site-theme.css?v=1.0.0"></head>').replace('<body>','<body class="upnext-identity upnext-learning">')
for item in DATA:
 paths={l:article_path(item['slug'],l) for l in COPY}
 for lang,c in COPY.items():
  d=item[lang];path=paths[lang];words=len(re.sub('<[^>]+>',' ',' '.join(' '.join(s) for s in d['sections'])).split())
  schema={'@context':'https://schema.org','@type':'Article','headline':d['title'],'description':d['description'],'datePublished':DATE,'dateModified':DATE,'author':{'@type':'Organization','name':'UpNext editorial'},'publisher':{'@type':'Organization','name':'UpNext'},'mainEntityOfPage':DOMAIN+path,'inLanguage':c['html'],'citation':[s[0] for s in item['sources']],'wordCount':words}
  sections=''.join('<section><h2>'+esc(s[0])+'</h2>'+''.join('<p>'+p+'</p>' for p in s[1:])+'</section>' for s in d['sections'])
  sources='<aside class="sources"><h2>'+c['sources']+'</h2><ol>'+''.join(f'<li id="source-{i}"><a href="{esc(url)}" target="_blank" rel="noopener">{esc(label)}</a></li>' for i,(url,label) in enumerate(item['sources'],1))+'</ol></aside>'
  related='<nav class="related" aria-label="'+c['related']+'"><strong>'+c['related']+'</strong>'+''.join(f'<a href="{article_path(o["slug"],lang)}">{esc(o[lang]["title"])}</a>' for o in DATA if o!=item and o['category']==item['category'])+f'<a href="/healthy-routines/?lang={lang}">Healthy Routines</a><a href="{library_path(lang)}">{c["back"]}</a></nav>'
  content=head(d['title'],d['description'],path,lang,paths,schema)+header(lang)+f'<main id="main"><section class="hero"><div class="wrap article-head"><a class="back" href="{library_path(lang)}">{c["back"]}</a><div class="eyebrow">{c["category"][item["category"]]}</div><h1>{esc(d["title"])}</h1><p class="lead">{esc(d["description"])}</p><p class="meta">{c["by"]} · {c["read"]} · {c["date"]}</p>'+links(paths,lang)+'</div></section><article class="article">'+sections+sources+related+'</article></main>'+footer(lang)
  dest=ROOT/path.strip('/')/'index.html';dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(themed(content))
  print(path,words,'words')
# Keep all existing cards and controls; replace only this collection on repeat runs.
for lang in COPY:
 p=ROOT/library_path(lang).strip('/')/'index.html';t=p.read_text()
 t=re.sub(r'<!-- sleep-hair:start -->.*?<!-- sleep-hair:end -->','',t,flags=re.S)
 cards='<!-- sleep-hair:start -->'+''.join(card(d,lang,i+14 if lang=='en' else i+4) for i,d in enumerate(DATA))+'<!-- sleep-hair:end -->'
 t=t.replace('<div class="cards">','<div class="cards">'+cards,1)
 if lang=='en':
  for cat in ['Sleep','Hair health']:
   if f'data-filter="{cat}"' not in t:t=t.replace('</div><div class="cards">',f'<button type="button" aria-pressed="false" data-filter="{cat}">{cat}</button></div><div class="cards">',1)
  t=t.replace('13 articles','17 articles').replace('Simple articles about diabetes, glucose, blood tests and everyday habits. Explore practical health learning from UpNext.','Practical articles about sleep, hair health, diabetes, blood tests and everyday habits. Explore health learning from UpNext.').replace('Clear, short reads about diabetes, blood glucose and everyday habits.','Clear, short reads about sleep, hair health, diabetes and everyday habits.')
 else:
  old={'pt':'Três novos artigos sobre A1C, sintomas e diabetes tipo 2, disponíveis em português, inglês e espanhol.','es':'Tres artículos nuevos sobre A1C, síntomas y diabetes tipo 2, disponibles en español, inglés y portugués.'}[lang]
  new={'pt':'Artigos sobre sono, saúde do cabelo, exames e diabetes, disponíveis em português, inglês e espanhol.','es':'Artículos sobre sueño, salud del cabello, pruebas y diabetes, disponibles en español, inglés y portugués.'}[lang]
  t=t.replace(old,new)
 p.write_text(t)
# Add canonical URLs and reciprocal language annotations to both existing sitemaps.
ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
for name in ['sitemap.xml','sitemap-google.xml']:
 p=ROOT/name;t=p.read_text()
 for item in DATA:
  alts={l:article_path(item['slug'],l) for l in COPY}
  for path in alts.values():
   url=DOMAIN+path
   entry=f'<url><loc>{url}</loc><lastmod>{DATE}</lastmod>'+''.join(f'<xhtml:link rel="alternate" hreflang="{COPY[l]["html"]}" href="{DOMAIN+a}" />' for l,a in alts.items())+f'<xhtml:link rel="alternate" hreflang="x-default" href="{DOMAIN+alts["en"]}" /></url>'
   if f'<loc>{url}</loc>' not in t:t=t.replace('</urlset>',entry+'</urlset>')
 p.write_text(t);ET.fromstring(t)
