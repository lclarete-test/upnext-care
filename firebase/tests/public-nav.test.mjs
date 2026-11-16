import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {JSDOM} from 'jsdom';
const root=fileURLToPath(new URL('../../',import.meta.url));
test('shared conversion tools preserve the new homepage and single sign-in entry',async()=>{
 const dom=new JSDOM(readFileSync(root+'/index.html','utf8'),{url:'https://upnextcare.com/',runScripts:'outside-only'});
 await new Promise(resolve=>setImmediate(resolve));
 for(const script of ['shared-public-nav.js','public-ux.js','conversion-ux.js'])dom.window.eval(readFileSync(root+'/'+script,'utf8'));
 assert.match(dom.window.document.querySelector('h1').textContent,/Better care starts/);
 assert.equal(dom.window.document.querySelectorAll('header nav a').length,4);
 assert.equal(dom.window.document.querySelectorAll('.home-path').length,3);
 dom.window.close();
});
