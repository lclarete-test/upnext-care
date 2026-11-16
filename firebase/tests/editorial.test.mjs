import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {JSDOM} from 'jsdom';
import {FEATURED_ARTICLES,featuredSlug,mountFeatured} from '../../learn/featured-content.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
test('the weekly feature changes at Monday midnight in New York',()=>{
 assert.equal(featuredSlug(new Date('2026-11-23T04:59:59Z')),FEATURED_ARTICLES[0]);
 assert.equal(featuredSlug(new Date('2026-11-23T05:00:00Z')),FEATURED_ARTICLES[1]);
 assert.equal(featuredSlug(new Date('2026-11-30T05:00:00Z')),FEATURED_ARTICLES[2]);
 assert.equal(featuredSlug(new Date('2026-12-21T05:00:00Z')),FEATURED_ARTICLES[0]);
});
for(const path of ['learn/index.html','learn/pt/index.html','learn/es/index.html'])test('feature, filters and sign-in work in '+path,async()=>{
 const dom=new JSDOM(readFileSync(root+'/'+path,'utf8'),{url:'https://upnextcare.com/'+path.replace('index.html',''),runScripts:'outside-only'});
 const doc=dom.window.document;await new Promise(r=>setImmediate(r));
 dom.window.eval(readFileSync(root+'/shared-public-nav.js','utf8'));
 dom.window.eval(readFileSync(root+'/learn/article-languages.js','utf8'));
 assert.equal(doc.querySelector('.unified-signin').getAttribute('href'),'/hub/?area=patient');
 assert.equal(doc.querySelector('main > .hero'),null);
 for(let week=0;week<FEATURED_ARTICLES.length;week++){
  mountFeatured(doc,new Date(Date.UTC(2026,10,16+week*7,12)));
  assert.ok(doc.querySelector('[data-feature-title]').href.includes(FEATURED_ARTICLES[week]));
  assert.equal(doc.querySelectorAll('.card[data-featured=true]').length,1);
  assert.equal(doc.querySelector('.card[data-featured=true]').hidden,true);
  assert.equal([...doc.querySelectorAll('.card')].filter(c=>!c.hidden).length,doc.querySelectorAll('.card').length-1);
 }
 const filterScript=[...doc.querySelectorAll('script:not([src])')].find(s=>s.textContent.includes('[data-filter]'));
 if(filterScript){dom.window.eval(filterScript.textContent);doc.querySelector('[data-filter="Sleep"]').click();assert.equal(doc.querySelector('.card[data-featured=true]').hidden,true);assert.ok([...doc.querySelectorAll('.card')].filter(c=>!c.hidden).every(c=>c.dataset.category==='Sleep'));doc.querySelector('[data-filter="All articles"]').click();assert.equal(doc.querySelector('.card[data-featured=true]').hidden,true);}
 dom.window.close();
});
